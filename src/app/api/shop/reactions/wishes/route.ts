import { NextResponse } from 'next/server'

import { fetchProductsByIds, maskForViewer } from '@/lib/catalog'
import type { WishlistEntry } from '@/lib/reaction-types'
import { attachSocialProof, reactionErrorResponse, requireReactionMember } from '@/lib/reactions-server'
import { semoAddWish, semoListWishes } from '@/lib/semo-reactions'

const ITEM_ID_RE = /^[A-Za-z0-9_-]{2,80}$/

/**
 * 내 찜 — 반응 스위치(`SHOP_REACTIONS`)가 켜졌을 때만 열린다(꺼져 있으면 404).
 *
 * `GET ?view=ids` 는 하트를 칠할 id 만(가볍게), `GET` 은 «내 찜» 화면용으로 상품까지 붙여 준다.
 * 사람은 언제나 세션의 memberKey 다 — 본문·질의의 사람 값은 받지 않는다.
 */
export async function GET(request: Request) {
  const gate = await requireReactionMember()
  if (gate.response) return gate.response
  const { member } = gate

  try {
    const wishes = await semoListWishes(member.memberKey)
    if (new URL(request.url).searchParams.get('view') === 'ids') {
      return NextResponse.json({ ids: wishes.map(wish => wish.itemId) })
    }

    const products = await attachSocialProof(
      (await fetchProductsByIds(wishes.map(wish => wish.itemId))).map(product =>
        maskForViewer(product, member.tier),
      ),
      member,
    )
    const byId = new Map(products.map(product => [product.id, product]))
    // 지금 몰에 없는(판매 중지) 상품은 피드가 404 라 빠진다 — 찜은 남아 있고 다시 들어오면 알림이 간다.
    const items: WishlistEntry[] = wishes.flatMap(wish => {
      const product = byId.get(wish.itemId)
      return product ? [{ product, wishedAt: wish.createdAt, priceAtWish: wish.priceAtWish }] : []
    })
    return NextResponse.json({
      items,
      ids: wishes.map(wish => wish.itemId),
      unavailableCount: wishes.length - items.length,
    })
  } catch (error) {
    return reactionErrorResponse(error, '찜 목록을 불러오지 못했습니다.')
  }
}

export async function POST(request: Request) {
  const gate = await requireReactionMember()
  if (gate.response) return gate.response

  const body = (await request.json().catch(() => null)) as { itemId?: unknown } | null
  const itemId = typeof body?.itemId === 'string' ? body.itemId.trim() : ''
  if (!ITEM_ID_RE.test(itemId)) {
    return NextResponse.json({ message: '상품을 확인할 수 없습니다.' }, { status: 400 })
  }

  try {
    await semoAddWish(gate.member.memberKey, itemId, null)
    return NextResponse.json({ itemId, wished: true })
  } catch (error) {
    return reactionErrorResponse(error, '찜을 저장하지 못했습니다.')
  }
}
