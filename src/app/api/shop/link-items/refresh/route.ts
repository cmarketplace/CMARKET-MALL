import { NextResponse } from 'next/server'

import { linkBuyEnabled } from '@/config/link-buy'
import { LinkItemsError, refreshLinkItems } from '@/lib/semo-link-items'
import { getShopMember } from '@/lib/shop-member'

export const maxDuration = 60

/**
 * 링크로 바로 사기 — 주문 직전 가격 다시 읽기. 세모가 10분 넘게 지난 링크만 쇼핑몰을 다시 열고, 바뀌었으면 판매 단가를
 * 고친 뒤 전후 값을 준다. 결제 화면은 바뀐 줄이 있으면 주문을 멈추고 알린다.
 */
export async function POST(request: Request) {
  if (!linkBuyEnabled()) return NextResponse.json({ message: 'Not Found' }, { status: 404 })
  const member = await getShopMember()
  if (!member) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { itemIds?: unknown } | null
  const itemIds = Array.isArray(body?.itemIds) ? body.itemIds.filter((id): id is string => typeof id === 'string') : []
  if (itemIds.length === 0) return NextResponse.json({ items: [] })

  try {
    return NextResponse.json({ items: await refreshLinkItems(itemIds) })
  } catch (error) {
    if (error instanceof LinkItemsError) return NextResponse.json({ message: error.message, code: error.code }, { status: error.status })
    console.error('[shop/api link-items refresh]', error instanceof Error ? error.message : error)
    return NextResponse.json({ message: '가격을 다시 확인하지 못했습니다.' }, { status: 502 })
  }
}
