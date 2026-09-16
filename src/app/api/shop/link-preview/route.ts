import { NextResponse } from 'next/server'

import type { Product } from '@/components/Shop/product.data'
import { fetchStorefrontPage, maskForViewer, SemoFeedError } from '@/lib/catalog'
import { fetchLinkPreview } from '@/lib/link-preview'
import { shopOf } from '@/lib/link-shops'
import { matchScore, nameTokens } from '@/lib/purchase-paste'
import { getShopMember } from '@/lib/shop-member'

/**
 * 링크 미리보기 + «몰에 이미 비슷한 상품이 있나».
 *
 * 로그인한 담당자만(몰 게이트 안). 허용 목록 밖 주소는 열지 않고 `preview: null` 로 답한다.
 * 몰 후보는 링크 제목의 낱말로 카탈로그를 찾아, 몰 상품명 낱말의 절반 이상이 링크 제목에 있는 것만 준다 — 엉뚱한 상품을
 * «같은 상품» 처럼 보이게 하지 않는다.
 */
export async function GET(request: Request) {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }

  const raw = new URL(request.url).searchParams.get('url') ?? ''
  if (!shopOf(raw)) {
    return NextResponse.json({ preview: null, matches: [] })
  }

  let preview = null
  try {
    preview = await fetchLinkPreview(raw)
  } catch (error) {
    console.error('[shop/api link-preview]', error instanceof Error ? error.message : error)
  }

  let matches: Product[] = []
  if (preview?.title) {
    const query = nameTokens(preview.title)
      .filter(token => !/^\d+$/.test(token))
      .slice(0, 4)
      .join(' ')
    if (query) {
      try {
        const page = await fetchStorefrontPage({ q: query, limit: 8 })
        matches = page.items
          .filter(item => matchScore(item.name, preview.title as string) >= 0.5)
          .slice(0, 3)
          .map(item => maskForViewer(item, member.tier))
      } catch (error) {
        if (!(error instanceof SemoFeedError)) throw error
        console.error('[shop/api link-preview feed]', error.message)
      }
    }
  }

  return NextResponse.json({ preview, matches })
}
