import ShopNav from '@/components/Shop/ShopNav'
import BudgetFiller, { type BudgetSeed } from '@/components/Shop/Hub/BudgetFiller'
import { HubHeader } from '@/components/Shop/Requests/RequestKit'
import { fetchCuration, fetchProductsByIds, maskProducts, SemoFeedError } from '@/lib/catalog'
import { listOrders, OrderError } from '@/lib/orders'
import { getShopMember } from '@/lib/shop-member'

export const dynamic = 'force-dynamic'

const MAX_ITEMS = 12

/**
 * 예산 맞춤 채우기 — 남은 예산을 적으면 **내가 평소 사던 품목**을 평소 비율대로 채운다.
 *
 * 비중은 내 주문 기록(취소 제외)의 품목별 수량이다. 기록이 없으면 MD 픽을 같은 비중으로 쓴다 —
 * 그 경우 화면이 «주문 기록이 없어 MD 추천으로 채웠습니다» 를 적는다.
 */
export default async function ShopBudgetPage({ searchParams }: { searchParams: Promise<{ amount?: string }> }) {
  const { amount } = await searchParams
  const member = await getShopMember()

  let seeds: BudgetSeed[] = []
  let source: 'history' | 'md' | 'none' = 'none'
  let loadError: string | null = null

  try {
    if (member) {
      const weights = new Map<string, number>()
      try {
        for (const order of (await listOrders(member.memberKey)).orders) {
          if (order.status === 'CANCELED') continue
          for (const item of order.items) weights.set(item.itemId, (weights.get(item.itemId) ?? 0) + item.quantity)
        }
      } catch (error) {
        if (!(error instanceof OrderError)) throw error
        console.error('[shop/budget orders]', error.status, error.message)
      }

      const top = [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_ITEMS)
      if (top.length > 0) {
        const products = maskProducts(await fetchProductsByIds(top.map(([id]) => id)), member.tier)
        seeds = products.map(product => ({ product, weight: weights.get(product.id) ?? 1 }))
        source = seeds.length > 0 ? 'history' : 'none'
      }
    }

    if (seeds.length === 0) {
      const curation = await fetchCuration()
      seeds = maskProducts(curation.mdPicks, member?.tier ?? null)
        .slice(0, MAX_ITEMS)
        .map(product => ({ product, weight: 1 }))
      source = seeds.length > 0 ? 'md' : 'none'
    }
  } catch (error) {
    if (!(error instanceof SemoFeedError)) throw error
    loadError = error.message
    console.error('[shop/budget feed]', error.message)
  }

  return (
    <main className="min-h-screen bg-white">
      <ShopNav />
      <div className="container-shop space-y-8 pt-8 pb-24">
        <HubHeader
          eyebrow="예산 맞춤 채우기"
          title="남은 예산, 평소 사던 비율대로 채워 드립니다"
          description="예산을 적으면 평소 주문하던 품목을 평소 비율대로 나눠 담아 예산을 넘지 않는 수량을 계산합니다. 수량은 담기 전에 고칠 수 있습니다."
        />
        {loadError ? (
          <p role="alert" className="rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-5 text-[#B3261E]">
            상품을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.
          </p>
        ) : (
          <BudgetFiller seeds={seeds} source={source} initialAmount={/^\d{1,12}$/.test(amount ?? '') ? (amount as string) : ''} />
        )}
      </div>
    </main>
  )
}
