import Link from 'next/link'
import { Check } from 'lucide-react'

import { ANNUAL_CONTRACT_TERMS, type AnnualContractRound } from '@/config/annual-contracts'
import { daysUntil, ddayLabel } from '@/config/seasons'
import { formatKDate } from '@/lib/kdate'
import { isPriceProven, type PriceCompareRow } from '@/lib/price-compare'

import { RevealCard, RevealSection } from '../SectionReveal'
import PriceProof from './PriceProof'
import SectionHeading, { landingButtonClass } from './SectionHeading'

/**
 * 연간 단가계약 — «세상 어디보다 저렴한 단가계약».
 *
 * 최상급은 **근거가 있을 때만** 선다(디자인 시스템 §2·§8). 근거 = `price-compare.json` 스냅샷에서
 * 같은 상품·부가세 포함으로 인터넷 최저가보다 몰이 싼 품목이 `PROOF_MIN_ITEMS`(price-compare.ts) 개 이상일 때.
 * 그때는 제목 바로 옆에 비교 표(출처 링크·기준일)를 함께 세운다. 근거가 없으면 사실만 적는
 * 예전 제목(«복사용지는 1년 단가 한 번으로»)으로 돌아간다.
 *
 * 계약 쪽 약속은 약관 한 줄이 받친다: 입찰 상한 = 신청 마감일의 인터넷 최저가. 그보다 낮게 부른
 * 곳이 없으면 그 품목은 계약하지 않는다 — 그래서 «계약 단가가 인터넷 최저가보다 싸다» 는 늘 참이다.
 */
export default function AnnualContractSection({
  round,
  today,
  proof,
}: {
  round: AnnualContractRound
  today: string
  proof: { rows: PriceCompareRow[]; measuredAt: string } | null
}) {
  const proven = proof !== null && isPriceProven(proof.rows)
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
                  ? '인터넷 최저가와 같은 상품으로 비교했습니다. 매달 사는 소모품은 신청을 모아 입찰하고, 인터넷 최저가보다 낮은 단가만 12개월 동안 고정합니다.'
                  : '매달 똑같이 사는 소모품은 신청을 모아 품목별로 한 번 입찰합니다. 가장 낮게 부른 단가를 12개월 동안 고정하고, 매달 수량만 정하면 됩니다.'
              }
            />
            <RevealCard className="mt-8">
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
            {proven && proof ? (
              <>
                <PriceProof rows={proof.rows} measuredAt={proof.measuredAt} />
                <p className="text-muted mt-4 text-xs leading-5">
                  입찰 품목: {round.items.map(item => item.name).join(' · ')} · 계약 기간 {round.term}
                </p>
              </>
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
