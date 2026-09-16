import { shopOf } from '@/lib/link-shops'

/**
 * 상품 링크 미리보기 — 제목·대표 이미지·표시 가격을 페이지 메타에서 읽는다. **서버 전용.**
 *
 * 지키는 것
 *  - 허용 목록(`link-shops.ts`)의 쇼핑몰만 연다. 리다이렉트도 한 번씩 직접 따라가며 매번 목록을 다시 본다
 *    (허용된 도메인의 열린 리다이렉트로 내부 주소를 두드리지 못하게).
 *  - 5초·1.5MB 에서 끊는다.
 *  - 못 읽어도 실패가 아니다. 쿠팡·네이버처럼 봇을 막는 곳이 많아 `null` 이 흔하고, 화면은 링크만으로 접수한다.
 *
 * 가격은 «페이지에 적힌 값» 일 뿐이다(쿠폰·카드할인·배송비 미반영). 화면은 «링크에 보이는 가격» 이라고만 적는다.
 */

export interface LinkPreview {
  shop: string
  title: string | null
  image: string | null
  price: number | null
}

const TIMEOUT_MS = 5_000
const MAX_BYTES = 1_500_000
const MAX_REDIRECTS = 3

async function readLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done || !value) break
    chunks.push(value)
    size += value.byteLength
  }
  await reader.cancel().catch(() => {})
  return new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks.map(chunk => Buffer.from(chunk))))
}

function meta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)=["']${key.replace(/[.:]/g, m => `\\${m}`)}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${key.replace(/[.:]/g, m => `\\${m}`)}["']`,
      'i',
    )
    const found = html.match(pattern)
    const value = found?.[1] ?? found?.[2]
    if (value) return decodeEntities(value.trim())
  }
  return null
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/** «[11번가] 상품명», «상품명 | 오피스디포» 처럼 쇼핑몰 이름이 붙은 제목에서 쇼핑몰 표기를 뗀다. */
function cleanTitle(title: string): string {
  return title
    .replace(/^\s*\[(11번가|다나와|G마켓|옥션|SSG\.COM|롯데ON|쿠팡)\]\s*/i, '')
    .replace(/\s*[|:]\s*(오피스디포|11번가|다나와|G마켓|옥션|SSG\.COM|롯데ON|쿠팡!?|네이버 쇼핑)\s*$/i, '')
    .trim()
}

function toPrice(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^\d.]/g, ''))
  return Number.isFinite(number) && number >= 10 && number < 100_000_000 ? Math.round(number) : null
}

/** JSON-LD 의 Product.offers.price / lowPrice */
function jsonLdPrice(html: string): number | null {
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? []
  for (const block of blocks) {
    try {
      const data = JSON.parse(block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, ''))
      const nodes = Array.isArray(data) ? data : [data, ...(Array.isArray(data?.['@graph']) ? data['@graph'] : [])]
      for (const node of nodes) {
        const offers = Array.isArray(node?.offers) ? node.offers[0] : node?.offers
        const price = toPrice(offers?.price ?? offers?.lowPrice)
        if (price) return price
      }
    } catch {
      // 깨진 JSON-LD 는 흔하다 — 다음 블록.
    }
  }
  return null
}

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  const shop = shopOf(rawUrl)
  if (!shop) return null

  let url = rawUrl
  let response: Response | null = null
  const deadline = AbortSignal.timeout(TIMEOUT_MS)
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!shopOf(url)) return null
    response = await fetch(url, {
      redirect: 'manual',
      signal: deadline,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CMarketMallLinkPreview/1.0)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      cache: 'no-store',
    })
    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url).toString()
      continue
    }
    break
  }
  if (!response || !response.ok || !(response.headers.get('content-type') ?? '').includes('html')) {
    return { shop: shop.name, title: null, image: null, price: null }
  }

  const html = await readLimited(response)
  const title = meta(html, ['og:title', 'twitter:title']) ?? html.match(/<title[^>]*>([^<]{2,200})<\/title>/i)?.[1]?.trim() ?? null
  const image = meta(html, ['og:image', 'twitter:image'])
  const price =
    toPrice(meta(html, ['product:price:amount', 'og:price:amount', 'price'])) ?? jsonLdPrice(html)

  return {
    shop: shop.name,
    title: title ? cleanTitle(decodeEntities(title)).slice(0, 160) : null,
    image: image && /^https:\/\//i.test(image) ? image.slice(0, 1000) : null,
    price,
  }
}
