import Link from 'next/link'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading, { SourceNote, landingButtonClass } from './SectionHeading'

/**
 * 연계고용 부담금 감면 — 기업 담당자에게. 숫자는 고용노동부 고시 원문으로 확인한 것만 적는다
 * (2026-09-16 조사: 감면 한도·계약기간·신청 기한). 회사별 감면액은 계산하지 않는다.
 */
const FACTS = [
  { label: '대상', value: '장애인 의무고용률에 못 미쳐 고용부담금을 내는 상시 100명 이상 사업주' },
  { label: '조건', value: '장애인 표준사업장 등과 1년 이상 도급계약을 맺고 생산품을 납품받을 것' },
  { label: '감면 한도', value: '그 해 부담금의 90% 이내, 지급한 도급액의 50% 이하' },
  { label: '신청', value: '부담금 납부 연도 1월 10일까지 한국장애인고용공단 관할 지사' },
]

export default function SocialValueSection() {
  return (
    <RevealSection id="social" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
          <div>
            <SectionHeading
              align="left"
              eyebrow="장애인 표준사업장 연계구매"
              title={
                <>
                  어차피 살 물건으로
                  <br />
                  <span className="keyword-gradient-glow">고용부담금</span>을 줄이세요
                </>
              }
              description="복사용지·청소·명절 선물처럼 매년 사는 물품과 서비스를 장애인 표준사업장 생산품으로 바꾸면 연계고용 부담금 감면을 신청할 수 있습니다. 견적과 계약서류를 함께 챙겨 드립니다."
            />
            <RevealCard className="mt-8">
              <Link href="/shop/request?type=social" className={landingButtonClass}>
                표준사업장 견적 받기
              </Link>
            </RevealCard>
          </div>

          <RevealCard>
            <dl className="divide-border divide-y rounded-lg bg-[var(--hub-card)] px-6 py-2 sm:px-8">
              {FACTS.map(fact => (
                <div key={fact.label} className="grid gap-1 py-4 sm:grid-cols-[88px_1fr] sm:gap-4">
                  <dt className="text-violet text-sm font-semibold">{fact.label}</dt>
                  <dd className="text-text text-[15px] leading-7 break-keep">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <SourceNote align="left">근거: 장애인고용촉진법 제33조, 고용노동부 고시 「연계고용에 따른 부담금 감면기준」 · 2026년 9월 기준</SourceNote>
          </RevealCard>
        </div>
      </div>
    </RevealSection>
  )
}
