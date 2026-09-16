import Link from 'next/link'

import GroupBuyProgress from '@/components/Shop/Hub/GroupBuyProgress'
import { campaignStage, groupBuyRefKey, type GroupBuyCampaign } from '@/config/group-buys'
import { daysUntil, ddayLabel } from '@/config/seasons'
import { formatKDate } from '@/lib/kdate'
import type { MallRequestTally } from '@/lib/request-types'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading, { SourceNote, landingButtonClass } from './SectionHeading'

/**
 * 이번 달 공동구매 — 세 품목·수요조사 D-day·모인 수량.
 *
 * 수량 집계는 세모에서 온다(`tallies`). 스트리밍 중이거나 못 읽었으면 `null` 이고 막대는 단계만
 * 그린다 — 0 을 그리지 않는다. 가격·할인율은 없다: 가격은 입찰이 정한다.
 */
export default function GroupBuySection({
  campaign,
  today,
  tallies,
}: {
  campaign: GroupBuyCampaign
  today: string
  tallies: MallRequestTally[] | null
}) {
  const open = campaignStage(campaign, today) === 'survey'
  const steps = [
    { label: '수요조사', detail: `${formatKDate(campaign.surveyClosesAt)}까지` },
    { label: '공급사 입찰', detail: campaign.biddingPeriod },
    { label: '최종가 공개·확정', detail: campaign.confirmPeriod },
    { label: '납품', detail: campaign.deliveryFrom },
  ]

  return (
    <RevealSection id="group-buy" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <SectionHeading
          eyebrow={campaign.title}
          title={
            <>
              필요한 수량을 모아
              <br />
              <span className="keyword-gradient-glow">함께 입찰</span>합니다
            </>
          }
          description="매달 세 품목을 골라 필요한 수량부터 모읍니다. 모인 수량으로 공급사 입찰을 열고 가장 낮게 부른 값으로 납품합니다. 수요조사 참여는 구매 약속이 아닙니다."
        />

        <RevealCard className="mt-12">
          <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="bg-navy flex flex-col rounded-lg p-6 text-white">
              <span className="text-on-dark-muted text-sm font-semibold">{open ? '수요조사 마감' : '수요조사 마감됨'}</span>
              <span className="mt-2 text-[44px] leading-none font-semibold tabular-nums">
                {open ? ddayLabel(daysUntil(campaign.surveyClosesAt, today)) : '입찰 중'}
              </span>
              <ol className="mt-6 space-y-3">
                {steps.map((step, index) => (
                  <li key={step.label} className="flex gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        (open ? index === 0 : index === 1) ? 'bg-mint text-navy' : 'border border-white/30 text-white/80'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{step.label}</span>
                      <span className="text-on-dark-muted block text-xs">{step.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <ul className="grid gap-4 md:grid-cols-3">
              {campaign.items.map(item => (
                <li key={item.key} className="flex flex-col rounded-lg bg-[var(--hub-card)] p-6">
                  <span className="text-text text-xl font-semibold">{item.name}</span>
                  <span className="text-muted mt-1 text-sm break-keep">{item.spec}</span>
                  <span className="text-muted mt-1 text-xs">
                    {item.minQuantity.toLocaleString('ko-KR')}
                    {item.unit}부터 참여
                  </span>
                  <div className="mt-auto pt-8">
                    <GroupBuyProgress
                      item={item}
                      tally={tallies?.find(entry => entry.refKey === groupBuyRefKey(campaign.key, item.key)) ?? null}
                      compact
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-col items-center gap-2">
            <Link href="/shop/group-buy" className={landingButtonClass}>
              {open ? '필요 수량 알려 주기' : '진행 상황 보기'}
            </Link>
          </div>
          <SourceNote>{campaign.basis}</SourceNote>
        </RevealCard>
      </div>
    </RevealSection>
  )
}
