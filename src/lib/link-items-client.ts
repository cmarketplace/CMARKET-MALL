import type { LinkItemRefresh } from '@/lib/link-items-types'

/**
 * 결제 직전 «링크로 바로 사기» 상품의 인터넷 판매가를 다시 읽는다(브라우저 → 몰 서버 → 세모).
 * 실패해도 주문을 막지 않는다 — 세모가 주문 확정 때 마지막으로 읽은 가격으로 단가를 다시 정하고, 씨마켓이 구매 전에 확인한다.
 */
export async function refreshLinkPrices(itemIds: string[]): Promise<LinkItemRefresh[] | null> {
  if (itemIds.length === 0) return []
  try {
    const response = await fetch('/api/shop/link-items/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds }),
      cache: 'no-store',
    })
    if (!response.ok) return null
    const payload = (await response.json().catch(() => null)) as { items?: LinkItemRefresh[] } | null
    return payload?.items ?? null
  } catch {
    return null
  }
}
