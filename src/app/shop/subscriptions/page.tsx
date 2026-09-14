import Link from 'next/link'

import ShopNav from '@/components/Shop/ShopNav'
import SubscriptionList from '@/components/Shop/Subscriptions/SubscriptionList'
import { OrderError } from '@/lib/orders'
import { isSemoConfigured } from '@/lib/semo-api'
import { semoListSubscriptions } from '@/lib/semo-subscriptions'
import { getShopMember } from '@/lib/shop-member'
import type { Subscription } from '@/lib/subscription-types'

// 방금 신청·변경한 구독이 바로 보여야 한다.
export const dynamic = 'force-dynamic'

/**
 * 내 구독 — 정기구독의 상태·다음 결제일·주기별 결제 기록과 일시정지/재개/해지.
 *
 * 구독의 정본은 세모다. 여기서는 세션의 신원 키로 세모에 묻고 그대로 그린다.
 */
export default async function ShopSubscriptionsPage() {
  const member = await getShopMember()

  let subscriptions: Subscription[] = []
  let loadError: string | null = null

  if (member) {
    try {
      subscriptions = await semoListSubscriptions(member.memberKey)
    } catch (error) {
      // 빈 목록으로 삼키지 않는다 — «구독 없음» 과 «못 불러옴» 이 같아 보이면 안 된다.
      if (!(error instanceof OrderError)) throw error
      loadError = error.message
      console.error('[shop/subscriptions page]', error.status, error.message)
    }
  }

  return (
    <main className="bg-white">
      <ShopNav showBack />

      <div className="container-shop py-10 lg:py-14">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-text text-2xl font-semibold">내 구독</h1>
          <p className="text-muted mt-1 text-sm leading-6">
            결제일 아침 9시에 씨마켓 포인트로 자동 결제되고 그 회차의 주문이 섭니다. 주문의 진행은{' '}
            <Link href="/shop/orders" className="text-primary font-semibold hover:underline">
              주문 내역
            </Link>
            에서 봅니다.
          </p>

          {!isSemoConfigured() ? (
            <p className="bg-light-soft text-muted mt-6 rounded-lg px-5 py-6 text-sm">
              세모 연동이 설정되지 않은 환경입니다 — 구독은 연동된 몰에서만 볼 수 있습니다.
            </p>
          ) : loadError ? (
            <p role="alert" className="mt-6 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-5 text-[#B3261E]">
              {loadError}
            </p>
          ) : subscriptions.length === 0 ? (
            <div className="bg-light-soft mt-6 rounded-lg px-5 py-10 text-center">
              <p className="text-muted text-sm">아직 신청한 구독이 없습니다.</p>
              <Link
                href="/shop#subscribe"
                className="bg-primary hover:bg-primary-dark mt-4 inline-block rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors"
              >
                정기구독 보러 가기
              </Link>
            </div>
          ) : (
            <SubscriptionList subscriptions={subscriptions} />
          )}
        </div>
      </div>
    </main>
  )
}
