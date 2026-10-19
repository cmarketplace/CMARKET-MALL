import { NextResponse } from 'next/server'

import type { Product } from '@/components/Shop/product.data'
import { reactionsEnabled } from '@/config/reactions'
import { ReactionApiError, semoRanking, semoSignals } from '@/lib/semo-reactions'
import { getShopMember, type ShopMember } from '@/lib/shop-member'

/**
 * «반응» 서버 쪽 공용 — 스위치·신원 확인과 목록에 배지 붙이기.
 *
 * 스위치가 꺼져 있으면 이 파일의 함수는 **아무것도 바꾸지 않는다**(목록은 받은 그대로, 라우트는 404).
 * route.ts 안에 두지 않는 이유: Next 는 라우트 파일의 export 를 HTTP 메서드로 검증한다.
 */

/** 라우트 첫 줄 — 꺼져 있으면 404, 비로그인이면 401. */
export async function requireReactionMember(): Promise<
  { member: ShopMember; response?: undefined } | { member?: undefined; response: NextResponse }
> {
  if (!reactionsEnabled()) {
    return { response: NextResponse.json({ message: '없는 기능입니다.' }, { status: 404 }) }
  }
  const member = await getShopMember()
  if (!member) {
    return { response: NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 }) }
  }
  return { member }
}

/** 세모 쪽 4xx·503 은 문구를 그대로(담당자가 고칠 수 있는 것), 나머지는 일반 문구로 접는다. */
export function reactionErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof ReactionApiError) {
    if ((error.status >= 400 && error.status < 500) || error.status === 503) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error('[shop/reactions]', error.status, error.message)
    return NextResponse.json({ message: fallback }, { status: 502 })
  }
  console.error('[shop/reactions]', error)
  return NextResponse.json({ message: fallback }, { status: 500 })
}

/**
 * 목록·상세 상품에 사회적 증거 배지를 붙인다. 스위치가 꺼져 있거나 세모가 실패하면 받은 그대로 —
 * 배지는 곁들이는 칸이라 목록을 막지 않는다.
 */
export async function attachSocialProof(products: Product[], member: ShopMember | null): Promise<Product[]> {
  if (!reactionsEnabled() || products.length === 0) return products
  try {
    const signals = await semoSignals(member?.memberKey ?? null, products.map(product => product.id))
    return products.map(product => {
      const proof = signals.get(product.id)?.socialProof ?? null
      return proof ? { ...product, socialProof: proof } : product
    })
  } catch (error) {
    console.error('[shop/reactions signals]', error instanceof Error ? error.message : error)
    return products
  }
}

/**
 * «기관 재구매순» — 사회적 증거가 있는 상품 id 를 순서대로. 스위치가 꺼져 있거나 실패하면 빈 목록
 * (그때 목록은 추천순 그대로다).
 */
export async function reorderRanking(): Promise<string[]> {
  if (!reactionsEnabled()) return []
  try {
    return (await semoRanking(24)).map(entry => entry.itemId)
  } catch (error) {
    console.error('[shop/reactions ranking]', error instanceof Error ? error.message : error)
    return []
  }
}
