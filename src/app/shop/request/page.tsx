import ShopNav from '@/components/Shop/ShopNav'
import RequestHub from '@/components/Shop/Hub/RequestHub'
import { REQUEST_KINDS, type RequestKind } from '@/components/Shop/Hub/request-kinds'
import { findKit } from '@/config/kits'
import { findMandatoryCategory } from '@/config/mandatory-purchase'
import { findService } from '@/config/office-services'
import { kstToday } from '@/config/seasons'
import { extractUrl } from '@/lib/link-shops'
import { isRequestStub } from '@/lib/mall-requests'

export const dynamic = 'force-dynamic'

/**
 * 장바구니로 끝나지 않는 요청들의 한 화면 — 구해드림·갈아타기·꾸러미·의무구매·연계구매.
 *
 * `?type=` 이 무엇을 묻는지 정하고, `service`·`kit`·`urgent` 로 첫 화면을 미리 맞춘다(랜딩의
 * 각 섹션이 자기 칸이 열린 채로 들어오게). 알 수 없는 type 은 구해드림으로 접는다.
 */
export default async function ShopRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; service?: string; kit?: string; urgent?: string; item?: string; cats?: string; amount?: string; url?: string; qty?: string }>
}) {
  const params = await searchParams
  const kind: RequestKind = (REQUEST_KINDS as readonly string[]).includes(params.type ?? '')
    ? (params.type as RequestKind)
    : 'sourcing'

  return (
    <main className="min-h-screen bg-white">
      <ShopNav />
      <div className="container-shop pt-8 pb-24">
        <RequestHub
          kind={kind}
          today={kstToday()}
          initialService={findService(params.service)?.key ?? null}
          initialKit={findKit(params.kit)?.key ?? null}
          initialUrgent={params.urgent === '1'}
          initialItem={(params.item ?? '').slice(0, 80)}
          initialCategories={(params.cats ?? '').split(',').filter(key => findMandatoryCategory(key))}
          initialAmount={/^\d{1,13}$/.test(params.amount ?? '') ? (params.amount as string) : ''}
          initialUrl={extractUrl(params.url ?? '') ?? ''}
          initialQuantity={/^\d{1,7}$/.test(params.qty ?? '') ? (params.qty as string) : ''}
          stub={isRequestStub()}
        />
      </div>
    </main>
  )
}
