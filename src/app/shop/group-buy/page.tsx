import ShopNav from '@/components/Shop/ShopNav'
import GroupBuyHub from '@/components/Shop/Hub/GroupBuyHub'
import { HubHeader } from '@/components/Shop/Requests/RequestKit'
import { campaignStage, currentCampaign, groupBuyRefKey } from '@/config/group-buys'
import { daysUntil, ddayLabel, kstToday } from '@/config/seasons'
import { isRequestStub, listMallRequests, tallyMallRequests } from '@/lib/mall-requests'
import { OrderError } from '@/lib/orders'
import type { MallRequest, MallRequestTally } from '@/lib/request-types'
import { getShopMember } from '@/lib/shop-member'

export const dynamic = 'force-dynamic'

/**
 * 이번 달 공동구매 — 수요조사 참여 화면.
 *
 * 막대의 숫자(참여 기관 수·모인 수량)는 세모 집계다. 못 읽으면 숫자를 접는다 — 0 을 그리면
 * «아무도 안 했다» 로 읽힌다. 내가 이미 참여한 품목은 내 요청에서 찾아 «참여함» 으로 세운다.
 */
export default async function ShopGroupBuyPage() {
  const today = kstToday()
  const campaign = currentCampaign(today)
  const member = await getShopMember()

  let tallies: MallRequestTally[] = []
  let mine: MallRequest[] = []
  if (campaign) {
    const refKeys = campaign.items.map(item => groupBuyRefKey(campaign.key, item.key))
    tallies = await tallyMallRequests('GROUP_BUY_PLEDGE', refKeys)
    if (member) {
      try {
        mine = (await listMallRequests(member.memberKey)).filter(
          request =>
            request.type === 'GROUP_BUY_PLEDGE' &&
            request.status !== 'CANCELED' &&
            request.refKey !== null &&
            refKeys.includes(request.refKey),
        )
      } catch (error) {
        if (!(error instanceof OrderError)) throw error
        console.error('[shop/group-buy mine]', error.status, error.message)
      }
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <ShopNav />
      <div className="container-shop space-y-8 pt-8 pb-24">
        {campaign ? (
          <>
            <HubHeader
              eyebrow="공동구매 수요조사"
              title={campaign.title}
              description={
                <>
                  필요한 수량만 먼저 알려 주세요. 모인 수량으로 공급사 입찰을 열어 가장 낮게 부른 값으로 납품합니다.
                  지금은 <strong className="text-text font-semibold">구매 약속이 아니라 의향</strong>이고, 최종가가 공개된 뒤 확정한
                  곳만 주문이 섭니다.
                </>
              }
              aside={
                campaignStage(campaign, today) === 'survey' ? (
                  <span className="bg-navy rounded-2xl px-5 py-3 text-white">
                    <span className="text-on-dark-muted block text-xs">수요조사 마감</span>
                    <span className="text-2xl font-semibold tabular-nums">
                      {ddayLabel(daysUntil(campaign.surveyClosesAt, today))}
                    </span>
                  </span>
                ) : null
              }
            />
            <GroupBuyHub
              campaign={campaign}
              stage={campaignStage(campaign, today)}
              tallies={tallies}
              mine={mine.map(request => ({ refKey: request.refKey as string, quantity: request.quantity, requestNo: request.requestNo }))}
              stub={isRequestStub()}
            />
          </>
        ) : (
          <p className="bg-light-soft text-muted rounded-2xl px-6 py-10 text-center text-sm">
            지금 열려 있는 공동구매가 없습니다. 다음 달 품목이 정해지면 이곳에 올라옵니다.
          </p>
        )}
      </div>
    </main>
  )
}
