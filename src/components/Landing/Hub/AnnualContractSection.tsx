import Link from 'next/link'
import { Check } from 'lucide-react'

import { ANNUAL_CONTRACT_TERMS, type AnnualContractRound } from '@/config/annual-contracts'
import { daysUntil, ddayLabel } from '@/config/seasons'
import { formatKDate } from '@/lib/kdate'
import { isBenchmarkReady, type PriceBenchmarkSnapshot } from '@/lib/price-benchmark'

import { RevealCard, RevealSection } from '../SectionReveal'
import BenchmarkTable from './BenchmarkTable'
import SectionHeading, { landingButtonClass } from './SectionHeading'

/**
 * 연간 단가계약 — «세상 어디보다 저렴한 단가계약».
 *
 * 제목의 근거는 몰의 지금 판매가가 아니라 **계약 방식**이다: 품목마다 인터넷 정상가(재고 떨이·한정 특가를
 * 뺀 중간값)를 입찰 상한으로 두고, 그보다 싸게 부른 곳과만 1년 계약한다(약관 첫 줄). 그래서 제목 바로
 * 아래에 그 기준을 **작지 않게** 적고, 옆에 품목별 상한·기준일·출처 표를 세운다. 근거 스냅샷이 없으면
 * 사실만 적는 예전 제목으로 돌아간다.
 *
 * 최상급 문구는 대표 결정(2026-09-16)이다 — 기준이 정상가라 떨이 판매처보다 싸다는 뜻은 아니므로,
 * 한정 문구를 빼거나 줄이지 않는다.
 */
export default function AnnualContractSection({
  round,
  today,
  benchmark,
}: {
  round: AnnualContractRound
  today: string
  benchmark: PriceBenchmarkSnapshot
}) {
  const proven = isBenchmarkReady(benchmark)
  return (
    <RevealSection id="annual" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
          <div>
            <SectionHeading
              align="left"
              eyebrow="연간 단가계약"
              title={
                proven ? (
                  <>
                    세상 어디보다
                    <br />
                    <span className="keyword-gradient-glow">저렴한</span> 단가계약
                  </>
                ) : (
                  <>
                    복사용지는
                    <br />
                    <span className="keyword-gradient-glow">1년 단가</span> 한 번으로
                  </>
                )
              }
              description={
                proven
                  ? '매달 사는 소모품은 신청을 모아 품목별로 한 번 입찰하고, 낙찰 단가를 12개월 동안 고정합니다.'
                  : '매달 똑같이 사는 소모품은 신청을 모아 품목별로 한 번 입찰합니다. 가장 낮게 부른 단가를 12개월 동안 고정하고, 매달 수량만 정하면 됩니다.'
              }
            />
            <RevealCard className="mt-8">
              {proven && (
                // 최상급 제목의 한정 문구 — 제목과 같은 눈높이에 둔다(각주로 숨기지 않는다).
                <p className="text-violet-strong bg-violet-soft mb-6 rounded-control px-4 py-3 text-[15px] leading-7 font-semibold break-keep">
                  재고 떨이·한정 특가를 뺀 인터넷 정상가보다 싸게 부른 곳과만 1년 계약합니다.
                </p>
              )}
              <ul className="space-y-2.5">
                {ANNUAL_CONTRACT_TERMS.map(term => (
                  <li key={term} className="text-text flex items-start gap-2.5 text-[15px]">
                    <Check size={18} aria-hidden="true" className="text-violet mt-0.5 shrink-0" />
                    {term}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/shop/annual" className={landingButtonClass}>
                  {round.title} 신청하기
                </Link>
                <span className="text-muted text-sm">
                  신청 마감 {formatKDate(round.applyClosesAt)} ·{' '}
                  <strong className="text-text font-semibold tabular-nums">{ddayLabel(daysUntil(round.applyClosesAt, today))}</strong>
                </span>
              </div>
            </RevealCard>
          </div>

          <RevealCard>
            {proven ? (
              <BenchmarkTable items={round.items} benchmark={benchmark} />
            ) : (
              <div className="rounded-lg bg-white p-6 shadow-[0_18px_48px_rgba(38,28,80,0.08)] sm:p-8">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-text text-lg font-semibold">입찰 품목</span>
                  <span className="text-muted text-xs">계약 기간 {round.term}</span>
                </div>
                <ul className="divide-border mt-4 divide-y">
                  {round.items.map(item => (
                    <li key={item.key} className="flex items-center justify-between gap-4 py-3.5">
                      <span className="min-w-0">
                        <span className="text-text block text-[15px] font-semibold">{item.name}</span>
                        <span className="text-muted block truncate text-xs">{item.spec}</span>
                      </span>
                      <span className="text-muted-strong bg-light-soft shrink-0 rounded-control px-2.5 py-1 text-xs">
                        월 {item.minMonthly}
                        {item.unit}부터
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted mt-4 text-xs">낙찰 단가는 입찰이 끝나면 로그인한 담당자에게 공개됩니다.</p>
              </div>
            )}
          </RevealCard>
        </div>
      </div>
    </RevealSection>
  )
}
