import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import type { CatalogOffer, Product } from '@/components/Shop/product.data'
import { quoteLinkPrice } from '@/config/link-errand'
import { isStubCatalog } from '@/lib/catalog'
import { fetchLinkPreview } from '@/lib/link-preview'
import { productImage } from '@/lib/product-image'
import { extractUrl, shopOf } from '@/lib/link-shops'
import type {
  LinkItemBasis,
  LinkItemInput,
  LinkItemPreview,
  LinkItemPrice,
  LinkItemProduct,
  LinkItemRefresh,
  LinkItemRegistered,
} from '@/lib/link-items-types'
import { resolveSemoApi, storefrontUrl } from '@/lib/semo-api'

/**
 * «링크로 바로 사기» 세모 창구 — **서버 전용.** 세모 URL 담기 엔진(세모 #1530)을 부른다:
 *
 *   POST /external/storefronts/{slug}/link-items/preview  읽기·세모 물품 대조·판매 단가(저장 없음)
 *   POST /external/storefronts/{slug}/link-items          담기(세모 물품 등록 + 몰 진열 + 판매 금액)
 *   POST /external/storefronts/{slug}/link-items/refresh  주문 직전 다시 읽기
 *   POST /external/storefronts/{slug}/link-items/basis    가격 근거(장바구니 수량별 단가)
 *
 * 세모 키가 없는 환경(로컬 스텁 카탈로그)은 몰 자체 미리보기(`link-preview.ts`)와 같은 가격 규칙으로 흉내 내고
 * `var/link-items-stub.json` 에 남긴다 — 화면을 끝까지 눌러 보는 용도이고 세모에는 아무것도 가지 않는다.
 */

export class LinkItemsError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'LinkItemsError'
  }
}

const TIMEOUT_MS = 40_000

interface SemoErrorBody {
  success?: boolean
  data?: unknown
  message?: string | string[]
  error?: { code?: string; message?: string }
}

async function semoPost<T>(pathname: string, body: unknown, timeoutMs = TIMEOUT_MS): Promise<T> {
  const config = resolveSemoApi()
  const response = await fetch(storefrontUrl(config, pathname), {
    method: 'POST',
    headers: { 'X-API-Key': config.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => null)) as (SemoErrorBody & { data?: T }) | null
  const raw = payload?.error?.message ?? payload?.message
  const message = Array.isArray(raw) ? raw.join(' ') : raw
  if (response.status === 404 && (!message || /^Cannot (GET|POST) /.test(message))) {
    console.error('[link-items] 세모에 URL 담기 경로가 없습니다(404):', pathname)
    throw new LinkItemsError(503, 'LINK_ITEMS_NOT_READY', '링크로 바로 사기를 준비하고 있습니다. 잠시 후 다시 시도해 주세요.')
  }
  if (!response.ok || payload?.success === false || payload?.data === undefined) {
    throw new LinkItemsError(
      response.status >= 400 ? response.status : 502,
      payload?.error?.code ?? 'LINK_ITEMS_FAILED',
      message || `세모 응답 오류 (${response.status})`,
    )
  }
  return payload.data
}

/* ── 공개 함수 ─────────────────────────────────────────────────────── */

export async function previewLinkItem(input: LinkItemInput): Promise<LinkItemPreview> {
  if (isStubCatalog()) return stubPreview(input)
  return semoPost<LinkItemPreview>('/link-items/preview', input)
}

export async function registerLinkItem(input: LinkItemInput, ownerKey: string): Promise<LinkItemRegistered> {
  if (isStubCatalog()) return stubRegister(input)
  return semoPost<LinkItemRegistered>('/link-items', { ...input, ownerKey })
}

export async function refreshLinkItems(itemIds: string[]): Promise<LinkItemRefresh[]> {
  const ids = uniqueIds(itemIds, 30)
  if (ids.length === 0) return []
  if (isStubCatalog()) return stubRefresh(ids)
  const data = await semoPost<{ items: LinkItemRefresh[] }>('/link-items/refresh', { itemIds: ids })
  return data.items
}

export async function fetchLinkBasis(itemIds: string[]): Promise<LinkItemBasis[]> {
  const ids = uniqueIds(itemIds, 60)
  if (ids.length === 0) return []
  if (isStubCatalog()) return stubBasis(ids)
  const data = await semoPost<{ items: LinkItemBasis[] }>('/link-items/basis', { itemIds: ids }, 10_000)
  return data.items
}

function uniqueIds(ids: string[], max: number): string[] {
  return [...new Set(ids.filter(id => /^[0-9a-zA-Z:-]{6,64}$/.test(id)))].slice(0, max)
}

/** 근거 → 오퍼에 붙일 모양 */
export function toOfferBasis(basis: LinkItemBasis): NonNullable<CatalogOffer['link']> {
  return {
    offeringId: basis.offeringId,
    url: basis.url,
    shopName: basis.shopName,
    linkPrice: basis.linkPrice,
    shipping: basis.shipping,
    errandFee: basis.errandFee,
    priceMethod: basis.priceMethod,
    readAt: basis.readAt,
    includeVat: basis.includeVat,
  }
}

/**
 * 상품들의 링크 오퍼에 가격 근거를 붙인다(장바구니 `ids=` 모드). 근거가 없거나 세모가 안 되면 받은 그대로 —
 * 그때 장바구니는 수량 1 기준 단가로 보이고, 주문 확정 금액은 세모가 수량별로 다시 정한다(더 싸지기만 한다).
 */
export async function attachLinkBasis(products: Product[]): Promise<Product[]> {
  if (products.length === 0) return products
  let basis: LinkItemBasis[] = []
  try {
    basis = await fetchLinkBasis(products.map(product => product.id))
  } catch (error) {
    console.error('[link-items basis]', error instanceof Error ? error.message : error)
    return products
  }
  if (basis.length === 0) return products
  const byOffering = new Map(basis.map(row => [row.offeringId, row]))
  const representative = new Map(basis.filter(row => row.isRepresentative).map(row => [row.itemId, row]))

  return products.map(product => {
    const offers = product.offers ?? []
    if (offers.length > 0) {
      const next = offers.map(offer => {
        const row = byOffering.get(offer.offerId)
        return row ? { ...offer, link: toOfferBasis(row) } : offer
      })
      return { ...product, offers: next }
    }
    const row = representative.get(product.id)
    return row ? { ...product, offers: [linkOffer(row.offeringId, product.basePrice, row)] } : product
  })
}

function linkOffer(offeringId: string, price: number, basis: LinkItemBasis): CatalogOffer {
  return {
    offerId: offeringId,
    price,
    priceRank: 1,
    supplierId: null,
    supplierName: null,
    leadDays: null,
    minQuantity: null,
    tiers: [],
    trend: [],
    trustScore: null,
    recentAwards: null,
    directPurchase: false,
    shippingFee: null,
    freeShippingOver: null,
    link: toOfferBasis(basis),
  }
}

/** 담기 결과 → 장바구니에 넣을 상품(피드 상품과 같은 모양) */
export function productFromRegistered(registered: LinkItemRegistered): Product {
  const { item, product, basis } = registered
  const price = item.price ?? basis?.unitPriceAtOne ?? 0
  const offers = registered.offeringId && basis ? [linkOffer(registered.offeringId, price, basis)] : undefined
  return {
    id: item.itemId,
    name: item.name,
    codeLabel: '',
    code: '',
    basePrice: price,
    // 세모 저장소 사본이 있으면 그 사진, 없으면 몰의 대표 그림(쇼핑몰 원본 사진은 이미지 허용 목록 밖이라 쓰지 않는다)
    img: productImage({ imageUrl: item.imageUrl, name: item.name }),
    tag: '대신 사 드림',
    categoryGroup: '',
    desc: '',
    manufacturer: product.manufacturer ?? '',
    brand: product.brand ?? '',
    unit: item.unit,
    spec1: item.spec ?? '',
    spec2: '',
    spec3: '',
    specLabel: item.spec ?? '',
    features: [],
    offerCount: 1,
    categoryId: '',
    maxPrice: null,
    ...(offers ? { offers } : {}),
  }
}

/* ── 로컬 스텁 ─────────────────────────────────────────────────────── */

interface StubState {
  version: 1
  /** itemId → 담은 결과 */
  items: Record<string, LinkItemRegistered>
}

const STORE_PATH = path.join(process.cwd(), 'var', 'link-items-stub.json')
const globalStore = globalThis as unknown as { __linkItemsStub?: StubState }

function loadState(): StubState {
  if (globalStore.__linkItemsStub) return globalStore.__linkItemsStub
  let state: StubState = { version: 1, items: {} }
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as StubState
    if (parsed?.version === 1) state = parsed
  } catch {
    // 첫 실행 — 빈 원장
  }
  globalStore.__linkItemsStub = state
  return state
}

function saveState(state: StubState): void {
  globalStore.__linkItemsStub = state
  try {
    mkdirSync(path.dirname(STORE_PATH), { recursive: true })
    writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf8')
  } catch {
    // 파일을 못 쓰는 환경 — 메모리로만
  }
}

/** 스텁 카탈로그에서 담은 링크 상품(장바구니 `ids=` 가 찾을 수 있게) */
export function stubLinkProducts(ids: string[]): Product[] {
  if (!isStubCatalog()) return []
  const state = loadState()
  return ids.map(id => state.items[id]).filter((row): row is LinkItemRegistered => Boolean(row)).map(productFromRegistered)
}

function stubPriceView(linkPrice: number | null, shipping: number | null, quantity: number, method: string | null, readAt: string): LinkItemPrice | null {
  if (linkPrice == null) return null
  const quote = quoteLinkPrice({ linkPrice, shipping: shipping ?? 0, quantity, includeVat: false })
  if (!quote) return null
  return {
    quantity,
    unitPrice: quote.unitPrice,
    unitInclusive: quote.unitInclusive,
    lineTotal: quote.lineTotal,
    includeVat: false,
    linkPrice,
    shipping: shipping ?? 0,
    goods: quote.goods,
    markup: 0,
    errandFee: quote.errandFee,
    totalInclusive: quote.totalInclusive,
    cardFeeRate: null,
    priceMethod: method,
    readAt,
  }
}

/** 스텁 전용 — 붙여넣은 페이지에서 쇼핑몰·이름·첫 판매가만 거칠게(정본 규칙은 세모 `link-paste.rules.ts`) */
function stubReadPasted(input: LinkItemInput): LinkItemProduct {
  const page = input.page ?? { html: null, text: null }
  const plain = page.text ?? (page.html ?? '').replace(/<[^>]+>/g, '\n')
  const lines = plain.split('\n').map(line => line.trim()).filter(Boolean)
  const cues: [string, RegExp][] = [
    ['쿠팡', /쿠팡|coupang/i],
    ['G마켓', /G마켓|gmarket/i],
    ['옥션', /옥션|auction/i],
    ['SSG닷컴', /SSG\.COM|ssg\.com/i],
    ['네이버쇼핑', /스마트스토어|smartstore/i],
  ]
  const shopName = cues.find(([, re]) => re.test(plain))?.[0]
  if (!shopName) throw new LinkItemsError(422, 'LINK_ITEM_PASTE_SHOP_UNKNOWN', '어느 쇼핑몰 페이지인지 알 수 없습니다.')
  const priceLine = lines.findIndex(line => /\d{1,3}(,\d{3})+\s*원/.test(line) && !/쿠폰|카드|와우|적립|최대/.test(line))
  const name =
    input.customer?.name ??
    lines
      .slice(Math.max(0, priceLine - 10), Math.max(0, priceLine))
      .filter(line => line.length >= 8 && !/로그인|상품평|리뷰|판매자|>|%/.test(line))
      .sort((a, b) => b.length - a.length)[0] ??
    null
  const prices = (lines[priceLine] ?? '').match(/\d{1,3}(?:,\d{3})+(?=\s*원)/g) ?? []
  const next = (lines[priceLine + 1] ?? '').match(/^\d{1,3}(?:,\d{3})+(?=\s*원)/)?.[0]
  const values = [...prices, ...(next ? [next] : [])].map(v => Number(v.replace(/,/g, '')))
  const price = values.length ? Math.min(...values) : null
  return {
    url: `pasted:${shopName}`,
    canonicalUrl: `pasted:${shopName}:${createHash('sha256').update(name ?? '').digest('hex').slice(0, 8)}`,
    shopKey: shopName,
    shopName,
    name,
    brand: null,
    manufacturer: null,
    model: null,
    specText: null,
    imageUrl: null,
    price,
    listPrice: null,
    shipping: /무료\s?배송|배송비\s*무료/.test(plain) ? 0 : null,
    priceMethod: price != null ? 'pasted' : null,
    nameMethod: name ? 'pasted' : null,
    status: name && price != null ? 'partial' : 'failed',
    httpStatus: null,
    missing: [!name && 'name', price == null && 'price', 'image'].filter((x): x is string => Boolean(x)),
    readAt: new Date().toISOString(),
  }
}

async function stubRead(input: LinkItemInput): Promise<LinkItemProduct> {
  if (input.page) return stubReadPasted(input)
  const url = extractUrl(input.text)
  const shop = url ? shopOf(url) : null
  if (!url || !shop) {
    throw new LinkItemsError(400, 'LINK_ITEM_SHOP_NOT_ALLOWED', '쿠팡·네이버쇼핑·11번가·G마켓·옥션·SSG닷컴·롯데ON·다나와·오피스디포·나비엠알오 상품 주소만 담을 수 있습니다.')
  }
  const preview = await fetchLinkPreview(url).catch(() => null)
  const hint = input.text.replace(url, ' ').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim()
  const name = input.customer?.name?.trim() || preview?.title?.replace(/^\[[^\]]+\]\s*/, '').trim() || (hint.length >= 2 ? hint : null)
  const price = preview?.price ?? input.customer?.price ?? null
  const priceMethod = preview?.price ? 'jsonld' : input.customer?.price ? 'customer' : null
  const missing = [!name && 'name', price == null && 'price', !preview?.image && 'image'].filter((x): x is string => Boolean(x))
  return {
    url,
    canonicalUrl: url,
    shopKey: shop.name,
    shopName: shop.name,
    name,
    brand: null,
    manufacturer: null,
    model: null,
    specText: null,
    imageUrl: preview?.image ?? null,
    price,
    listPrice: null,
    shipping: input.customer?.shipping ?? null,
    priceMethod,
    nameMethod: name ? (input.customer?.name ? 'customer' : 'meta') : null,
    status: name && price != null && preview?.image ? 'ok' : preview ? 'partial' : 'blocked',
    httpStatus: preview ? 200 : 403,
    missing,
    readAt: new Date().toISOString(),
  }
}

async function stubPreview(input: LinkItemInput): Promise<LinkItemPreview> {
  const product = await stubRead(input)
  const blockers = [!product.name && 'name', product.price == null && 'price'].filter((x): x is string => Boolean(x))
  return {
    product,
    match: product.name ? { decision: 'create', itemId: null, score: null, candidates: [] } : null,
    mallListings: [],
    cheaperInMall: null,
    price: stubPriceView(product.price, product.shipping, input.quantity, product.priceMethod, product.readAt),
    blockers,
    searchApi: false,
  }
}

async function stubRegister(input: LinkItemInput): Promise<LinkItemRegistered> {
  const product = await stubRead(input)
  if (!product.name) throw new LinkItemsError(422, 'LINK_ITEM_NAME_REQUIRED', '이 쇼핑몰은 서버에서 상품 페이지를 열 수 없습니다. 제품명만 적어 주세요.')
  if (product.price == null) throw new LinkItemsError(422, 'LINK_ITEM_PRICE_REQUIRED', '판매가를 읽지 못했습니다. 쇼핑몰에서 본 가격을 적어 주세요.')
  const key = createHash('sha256').update(product.canonicalUrl).digest('hex')
  const itemId = `link-${key.slice(0, 24)}`
  const offeringId = `link-offer-${key.slice(0, 16)}`
  const one = stubPriceView(product.price, product.shipping, 1, product.priceMethod, product.readAt)
  const basis: LinkItemBasis = {
    itemId,
    offeringId,
    isRepresentative: true,
    url: product.url,
    shopName: product.shopName,
    linkPrice: product.price,
    shipping: product.shipping ?? 0,
    errandFee: 2_000,
    cardFeeRate: null,
    priceMethod: product.priceMethod,
    readAt: product.readAt,
    includeVat: false,
    unitPriceAtOne: one?.unitPrice ?? null,
  }
  const registered: LinkItemRegistered = {
    product,
    itemId,
    decision: 'created',
    offeringId,
    item: { itemId, name: product.name, spec: product.specText, unit: 'EA', imageUrl: product.imageUrl, price: one?.unitPrice ?? null },
    price: stubPriceView(product.price, product.shipping, input.quantity, product.priceMethod, product.readAt),
    basis,
    mallListings: [],
    cheaperInMall: null,
    imageCopyUrl: null,
  }
  const state = loadState()
  saveState({ ...state, items: { ...state.items, [itemId]: registered } })
  return registered
}

function stubBasis(ids: string[]): LinkItemBasis[] {
  const state = loadState()
  return ids.map(id => state.items[id]?.basis).filter((row): row is LinkItemBasis => Boolean(row))
}

function stubRefresh(ids: string[]): LinkItemRefresh[] {
  return stubBasis(ids).map(row => {
    const before = { linkPrice: row.linkPrice, shipping: row.shipping, readAt: row.readAt }
    // 스텁에서도 «바뀜» 화면을 볼 수 있게 `SHOP_LINK_STUB_PRICE_BUMP=원` 이면 판매가를 그만큼 올려 돌려준다.
    const bump = Number(process.env.SHOP_LINK_STUB_PRICE_BUMP ?? 0) || 0
    if (bump <= 0) return { itemId: row.itemId, offeringId: row.offeringId, status: 'fresh', before, after: before, changed: false }
    const after = { linkPrice: row.linkPrice + bump, shipping: row.shipping, readAt: new Date().toISOString() }
    const state = loadState()
    const saved = state.items[row.itemId]
    if (saved?.basis) {
      const one = quoteLinkPrice({ linkPrice: after.linkPrice, shipping: after.shipping, quantity: 1, includeVat: false })
      const basis = { ...saved.basis, linkPrice: after.linkPrice, readAt: after.readAt, unitPriceAtOne: one?.unitPrice ?? null }
      saveState({ ...state, items: { ...state.items, [row.itemId]: { ...saved, basis, item: { ...saved.item, price: one?.unitPrice ?? null } } } })
    }
    return { itemId: row.itemId, offeringId: row.offeringId, status: 'updated', before, after, changed: true }
  })
}
