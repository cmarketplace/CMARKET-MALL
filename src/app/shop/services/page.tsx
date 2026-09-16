import ShopNav from '@/components/Shop/ShopNav'
import ServicesHub from '@/components/Shop/Hub/ServicesHub'
import { HubHeader } from '@/components/Shop/Requests/RequestKit'
import { findService } from '@/config/office-services'
import { SUBSCRIPTION_PLANS } from '@/config/subscriptions'
import { kstToday } from '@/config/seasons'
import { isRequestStub } from '@/lib/mall-requests'

export const dynamic = 'force-dynamic'

/**
 * 사무실 관리 — 청소·렌탈·탕비실·점검을 골라 **한 장의 견적 요청**으로 보낸다.
 *
 * 몰 홈 정기구독 히어로에 있는 상품(사무실 청소·간식)은 견적 없이 바로 구독하는 문도 함께 연다
 * (`config/subscriptions.ts` 의 key 로 판정).
 */
export default async function ShopServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; group?: string }>
}) {
  const { service } = await searchParams
  const preselected = findService(service)?.key ?? null

  // 몰 홈의 정기구독 히어로가 다루는 상품 — «바로 구독» 문은 이 key 가 있는 서비스에만 연다.
  const livePlanKeys = SUBSCRIPTION_PLANS.map(plan => plan.key)

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
