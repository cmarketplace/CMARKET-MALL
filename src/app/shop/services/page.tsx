import ShopNav from '@/components/Shop/ShopNav'
import ServicesHub from '@/components/Shop/Hub/ServicesHub'
import { HubHeader } from '@/components/Shop/Requests/RequestKit'
import { findService } from '@/config/office-services'
import { kstToday } from '@/config/seasons'
import { isRequestStub } from '@/lib/mall-requests'
import { OrderError } from '@/lib/orders'
import { semoListSubscriptionPlans } from '@/lib/semo-subscriptions'

export const dynamic = 'force-dynamic'

/**
 * 사무실 관리 — 청소·렌탈·탕비실·점검을 골라 **한 장의 견적 요청**으로 보낸다.
 *
 * 세모에 구독 상품이 있는 서비스(사무실 청소·간식)는 견적 없이 바로 구독하는 문도 함께 연다.
 * 어느 상품이 살아 있는지는 세모 목록으로 판정한다 — 설정의 planKey 만 믿으면 세모에서 내린
 * 상품에 «바로 구독» 이 서 있게 된다.
 */
export default async function ShopServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; group?: string }>
}) {
  const { service } = await searchParams
  const preselected = findService(service)?.key ?? null

  let livePlanKeys: string[] = []
  try {
    livePlanKeys = (await semoListSubscriptionPlans()).filter(plan => plan.available).map(plan => plan.key)
  } catch (error) {
    if (!(error instanceof OrderError)) throw error
    console.error('[shop/services plans]', error.status, error.message)
  }

  return (
    <main className="min-h-screen bg-white">
      <ShopNav />
      <div className="container-shop space-y-8 pt-8 pb-24">
        <HubHeader
          eyebrow="사무실 관리 구독"
          title="청소부터 정수기까지, 계약 한 번에"
          description={
            <>
              필요한 서비스를 골라 인원·면적·대수만 적어 보내 주세요. 씨마켓이 지정한 업체의 견적서를 붙여 회신하고,
              확정하면 정기구독으로 이어집니다. 서비스가 여러 개여도 <strong className="text-text font-semibold">계약 상대는 씨마켓 하나, 계산서는 매달 한 장</strong>입니다.
            </>
          }
        />
        <ServicesHub
          today={kstToday()}
          preselected={preselected}
          livePlanKeys={livePlanKeys}
          stub={isRequestStub()}
        />
      </div>
    </main>
  )
}
