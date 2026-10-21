import { NextResponse } from 'next/server'

import { linkBuyEnabled } from '@/config/link-buy'
import { maskForViewer } from '@/lib/catalog'
import { parseLinkItemInput } from '@/lib/link-items-validate'
import { LinkItemsError, productFromRegistered, registerLinkItem } from '@/lib/semo-link-items'
import { getShopMember } from '@/lib/shop-member'

export const maxDuration = 60

/**
 * 링크로 바로 사기 — 담기. 세모가 물품 등록(있으면 잇기·없으면 새로·애매하면 검토 필요) + 몰 진열(«대신 사 드림» 판매자)
 * + 판매 금액을 정하고, 여기서는 장바구니에 넣을 상품 모양으로 돌려준다. 가격은 세모가 읽은 값이다(손님 값은 보완용).
 */
export async function POST(request: Request) {
  if (!linkBuyEnabled()) return NextResponse.json({ message: 'Not Found' }, { status: 404 })
  const member = await getShopMember()
  if (!member) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })

  const parsed = parseLinkItemInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: 400 })

  try {
    const registered = await registerLinkItem(parsed.value, member.memberKey)
    if (!registered.offeringId) {
      return NextResponse.json(
        { message: '이 몰에 «대신 사 드림» 판매자가 정해지지 않아 아직 살 수 없습니다.', code: 'LINK_ITEM_SELLER_NOT_SET' },
        { status: 409 },
      )
    }
    const product = maskForViewer(productFromRegistered(registered), member.tier)
    return NextResponse.json({ registered, product, offerId: registered.offeringId })
  } catch (error) {
    if (error instanceof LinkItemsError) return NextResponse.json({ message: error.message, code: error.code }, { status: error.status })
    console.error('[shop/api link-items]', error instanceof Error ? error.message : error)
    return NextResponse.json({ message: '담지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 502 })
  }
}
