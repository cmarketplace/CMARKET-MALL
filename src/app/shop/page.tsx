import Link from 'next/link'

import ShopNav from '@/components/Shop/ShopNav'
import MdCuration from '@/components/Shop/Home/MdCuration'
import ReorderPanel from '@/components/Shop/Home/ReorderPanel'
import SeasonStrip from '@/components/Shop/Home/SeasonStrip'
import SubscriptionHero from '@/components/Shop/Home/SubscriptionHero'
import { kstToday } from '@/config/seasons'
import {
  fetchCuration,
  fetchStorefrontCategories,
  isStubCatalog,
  maskProducts,
  SemoFeedError,
  type Curation,
} from '@/lib/catalog'
import type { StorefrontOrder } from '@/lib/order-types'
import { listOrders, OrderError } from '@/lib/orders'
import { semoListSubscriptionPlans, semoPointBalance } from '@/lib/semo-subscriptions'
import { getShopMember } from '@/lib/shop-member'
import type { SubscriptionPlan } from '@/lib/subscription-types'

// «누가 보는가»(재주문 판)와 D-day 가 요청마다 다르다.
export const dynamic = 'force-dynamic'

/**
 * 몰 홈 — 정기구독 · 시즌 · MD 큐레이션 · 우리 기관 재주문.
 *
 * 상품 목록(분류·검색·정렬)은 `/shop/products` 로 옮겼다. 홈은 «무엇을 살지 아직 안 정한
 * 담당자» 를 위한 화면이고, 목록은 «찾는 게 있는 담당자» 의 화면이다.
 *
 * 피드 장애는 섹션 단위로 흡수한다 — 큐레이션이 죽어도 구독 히어로는 떠야 한다.
 */
export default async function ShopHomePage() {
  const today = kstToday()
  const month = today.slice(0, 7)

  const member = await getShopMember()

  let curation: Curation | null = null
  let feedFailed = false
  let categoryCount = 0
  try {
    const [loaded, categories] = await Promise.all([fetchCuration(), fetchStorefrontCategories()])
    const tier = member?.tier ?? null
    // 제한 고객에게는 «낙찰가 대비» 축 자체가 없다 — 목록을 접는 것으로는 부족하고 탭을 없앤다.
    curation =
      tier === 'FULL'
        ? loaded
        : {
            ...loaded,
            featuredSeason: loaded.featuredSeason
              ? { ...loaded.featuredSeason, products: maskProducts(loaded.featuredSeason.products, tier) }
              : null,
            mdPicks: maskProducts(loaded.mdPicks, tier),
            byBenchmark: [],
            popular: maskProducts(loaded.popular, tier),
          }
    categoryCount = (categories ?? []).reduce((sum, group) => sum + group.itemCount, 0)
  } catch (error) {
    if (!(error instanceof SemoFeedError)) throw error
    console.error('[shop/home]', error.message)
    feedFailed = true
  }

  let orders: StorefrontOrder[] = []
  if (member) {
    try {
      orders = (await listOrders(member.memberKey)).orders
    } catch (error) {
      if (!(error instanceof OrderError)) throw error
      console.error('[shop/home orders]', error.status, error.message)
    }
  }

  // 정기구독 상품(세모) + 포인트 잔액 힌트. 실패해도 히어로는 예상 산식으로 뜬다 — 섹션 단위 흡수.
  let plans: SubscriptionPlan[] = []
  let pointBalance: number | null = null
  try {
    ;[plans, pointBalance] = await Promise.all([
      semoListSubscriptionPlans(),
      member ? semoPointBalance(member.memberKey) : Promise.resolve(null),
    ])
  } catch (error) {
    if (!(error instanceof OrderError)) throw error
    console.error('[shop/home subscriptions]', error.status, error.message)
  }

  return (
    <main className="min-h-screen bg-white">
      <ShopNav />

      <div className="container-shop space-y-14 pt-6 pb-24">
        {isStubCatalog() && (
          <p className="bg-highlight-soft text-highlight-strong rounded-xl px-4 py-2.5 text-xs font-semibold">
            예시 데이터로 그려진 화면입니다 — 세모 피드 키가 연결되면 승인 품목·실제 단가로 바뀝니다.
          </p>
        )}

        {member?.tier === 'RESTRICTED' && (
          <p className="bg-blue-tint-2 text-primary rounded-xl px-4 py-2.5 text-xs font-semibold">
            공급사 계정으로 보고 계십니다 — 씨마켓몰 판매가로 구매할 수 있고, 주문은 씨마켓 안전결제로 진행됩니다.
          </p>
        )}

        <SubscriptionHero loggedIn={Boolean(member)} plans={plans} pointBalance={pointBalance} />

        {feedFailed ? (
          <p role="alert" className="rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-6 text-[#B3261E]">
            상품을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.
          </p>
        ) : (
          curation && (
            <>
              <SeasonStrip featured={curation.featuredSeason} others={curation.otherSeasons} today={today} />
              <MdCuration
                mdPicks={curation.mdPicks}
                byBenchmark={curation.byBenchmark}
                popular={curation.popular}
              />
            </>
          )
        )}

        <ReorderPanel viewerName={member?.displayName ?? null} orders={orders} month={month} />

        {categoryCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-light-soft px-6 py-5">
            <p className="text-text text-sm">
              찾는 품목이 정해져 있다면 <strong className="font-semibold">전체 {categoryCount.toLocaleString('ko-KR')}품목</strong>에서
              분류·검색으로 바로 가세요.
            </p>
            <Link
              href="/shop/products"
              className="bg-primary hover:bg-primary-dark rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              전체 상품 보기
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
