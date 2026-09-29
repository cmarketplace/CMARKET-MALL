'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarClock, FileSpreadsheet, Wallet } from 'lucide-react'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading from './SectionHeading'

const won = (n: number) => n.toLocaleString('ko-KR')

/**
 * 기관 담당자 도구 — 연말 예산 마감 · 예산 맞춤 채우기 · 인수인계.
 *
 * 연말 D-day 는 `seasons.ts` 의 «연말 예산 마감» 행사에서 온다(서버가 계산해 넘긴다). 그 행사가
 * 없으면 카드를 접는다.
 */
export default function OrgToolsSection({
  yearEnd,
}: {
  yearEnd: { dday: string; deadline: string | null } | null
}) {
  const [budget, setBudget] = useState('')

  return (
    <RevealSection id="org-tools" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <SectionHeading
          eyebrow="기관 담당자 도구"
          title={
            <>
              예산은 남기지 않고,
              <br />
              기록은 <span className="keyword-gradient-glow">넘겨주기</span> 쉽게
            </>
          }
        />

        <RevealCard className="mt-12 grid gap-4 lg:grid-cols-3">
          <article className="bg-navy flex flex-col rounded-lg p-6 text-white">
            <CalendarClock size={24} aria-hidden="true" className="text-mint" />
            <h3 className="mt-4 text-lg font-semibold">연말 예산 마감</h3>
            {yearEnd ? (
              <>
                <p className="mt-2 text-[44px] leading-none font-semibold tabular-nums">{yearEnd.dday}</p>
                {yearEnd.deadline && (
                  <p className="text-on-dark-muted mt-3 text-sm leading-6">올해 예산으로 받는 마지막 배송 마감은 {yearEnd.deadline}입니다.</p>
                )}
              </>
            ) : (
              <p className="text-on-dark-muted mt-2 text-sm leading-6">회계연도 마감 일정이 정해지면 이곳에 표시됩니다.</p>
            )}
            <Link href="/shop/products?q=복사용지" className="text-mint group mt-auto flex items-center gap-1 pt-6 text-sm font-semibold">
              내년 1분기 소모품 미리 보기
              <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </article>

          <article className="flex flex-col rounded-lg bg-[var(--hub-card)] p-6">
            <Wallet size={24} aria-hidden="true" className="text-violet" />
            <h3 className="text-text mt-4 text-lg font-semibold">예산 맞춤 채우기</h3>
            <p className="text-muted mt-2 text-sm leading-6">남은 예산을 적으면 평소 주문하던 품목을 평소 비율대로 나눠 예산을 넘지 않게 담습니다.</p>
            <form action="/shop/budget" className="mt-auto pt-5">
              <label className="relative block">
                <span className="sr-only">남은 예산</span>
                <input
                  value={budget ? won(Number(budget)) : ''}
                  onChange={event => setBudget(event.target.value.replace(/\D/g, '').slice(0, 12))}
                  inputMode="numeric"
                  placeholder="남은 예산"
                  className="text-text border-border focus-visible:ring-violet w-full rounded-control border bg-white px-4 py-3 pr-9 text-right text-base font-semibold tabular-nums outline-none focus-visible:ring-2"
                />
                <span className="text-muted pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm">원</span>
              </label>
              <input type="hidden" name="amount" value={budget} />
              <button type="submit" className="bg-violet hover:bg-violet-strong mt-2 h-11 w-full cursor-pointer rounded-control text-sm font-semibold text-white transition-colors">
                이 예산으로 채우기
              </button>
            </form>
          </article>

          <article className="flex flex-col rounded-lg bg-[var(--hub-card)] p-6">
            <FileSpreadsheet size={24} aria-hidden="true" className="text-violet" />
            <h3 className="text-text mt-4 text-lg font-semibold">담당자가 바뀌어도</h3>
            <p className="text-muted mt-2 text-sm leading-6">
              무엇을 어디서 얼마에 샀는지 주문 내역을 엑셀로 내려받아 인수인계 문서에 붙이세요. 견적 요청과 도착한 견적서 번호도 내 요청에 남습니다.
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <Link href="/shop/orders" className="text-violet-strong bg-violet-soft hover:bg-accent rounded-control px-4 py-2.5 text-sm font-semibold transition-colors">
                주문 내역 내려받기
              </Link>
              <Link href="/shop/requests" className="text-muted-strong hover:bg-bg rounded-control px-4 py-2.5 text-sm font-semibold transition-colors">
                내 요청
              </Link>
            </div>
          </article>
        </RevealCard>
      </div>
    </RevealSection>
  )
}
