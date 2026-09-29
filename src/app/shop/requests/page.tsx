import Link from 'next/link'

import ShopNav from '@/components/Shop/ShopNav'
import RequestList from '@/components/Shop/Requests/RequestList'
import { isRequestStub, listMallRequests } from '@/lib/mall-requests'
import { OrderError } from '@/lib/orders'
import type { MallRequest } from '@/lib/request-types'
import { getShopMember } from '@/lib/shop-member'

// 방금 보낸 요청이 바로 보여야 한다.
export const dynamic = 'force-dynamic'

/**
 * 내 요청 — 서비스 견적·공동구매 참여·연간 계약 신청·구해드림의 진행 상황과 도착한 견적서 번호.
 * 정본은 세모다. «요청 없음» 과 «못 불러옴» 을 같은 모양으로 그리지 않는다.
 */
export default async function ShopRequestsPage() {
  const member = await getShopMember()

  let requests: MallRequest[] = []
  let loadError: string | null = null
  if (member) {
    try {
      requests = await listMallRequests(member.memberKey)
    } catch (error) {
      if (!(error instanceof OrderError)) throw error
      loadError = error.message
      console.error('[shop/requests page]', error.status, error.message)
    }
  }

  return (
    <main className="bg-white">
      <ShopNav showBack />
      <div className="container-shop py-10 lg:py-14">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-text text-2xl font-semibold">내 요청</h1>
          <p className="text-muted mt-1 text-sm leading-6">
            견적 요청·공동구매 참여·연간 계약 신청의 진행 상황입니다. 견적서가 도착하면 견적 번호가 붙습니다.
          </p>
          {isRequestStub() && (
            <p className="bg-highlight-soft text-highlight-strong mt-4 rounded-xl px-4 py-2.5 text-xs font-semibold">
              세모 연동이 없는 환경입니다 — 여기 보이는 요청은 로컬에만 남고 담당자에게 전달되지 않습니다.
            </p>
          )}

          {!member ? (
            <p className="bg-light-soft text-muted mt-6 rounded-lg px-5 py-6 text-sm">로그인하면 내 요청을 볼 수 있습니다.</p>
          ) : loadError ? (
            <p role="alert" className="mt-6 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-5 text-[#B3261E]">
              {loadError}
            </p>
          ) : requests.length === 0 ? (
            <div className="bg-light-soft mt-6 rounded-lg px-5 py-10 text-center">
              <p className="text-muted text-sm">아직 보낸 요청이 없습니다.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href="/shop/services" className="bg-primary hover:bg-primary-dark rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors">
                  사무실 관리 견적
                </Link>
                <Link href="/shop/request?type=sourcing" className="text-primary bg-blue-tint-2 rounded-full px-5 py-2.5 text-sm font-semibold">
                  구해드림
                </Link>
              </div>
            </div>
          ) : (
            <RequestList requests={requests} />
          )}
        </div>
      </div>
    </main>
  )
}
