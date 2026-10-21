import { NextResponse } from 'next/server'

import { linkBuyEnabled } from '@/config/link-buy'
import { parseLinkItemInput } from '@/lib/link-items-validate'
import { LinkItemsError, previewLinkItem } from '@/lib/semo-link-items'
import { getShopMember } from '@/lib/shop-member'

export const maxDuration = 60

/**
 * 링크로 바로 사기 — 미리 보기(읽기·세모 물품 대조·판매 단가·몰에 있는 더 싼 같은 물품). 저장하지 않는다.
 * 스위치(`SHOP_LINK_BUY`)가 꺼져 있으면 404.
 */
export async function POST(request: Request) {
  if (!linkBuyEnabled()) return NextResponse.json({ message: 'Not Found' }, { status: 404 })
  const member = await getShopMember()
  if (!member) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })

  const parsed = parseLinkItemInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: 400 })

  try {
    const preview = await previewLinkItem(parsed.value)
    // 몰에 이미 있는 물품은 이름·대표 판매가만 실린다(공급사 실명 없음) — 공급사 고객에게도 그대로 보여도 된다.
    return NextResponse.json({ preview })
  } catch (error) {
    if (error instanceof LinkItemsError) return NextResponse.json({ message: error.message, code: error.code }, { status: error.status })
    console.error('[shop/api link-items preview]', error instanceof Error ? error.message : error)
    return NextResponse.json({ message: '링크를 읽지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 502 })
  }
}
