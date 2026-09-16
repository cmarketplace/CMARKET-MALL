import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { LEGAL_BASIS_NOTE, LEGAL_INSPECTIONS } from '@/config/legal-inspections'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading, { SourceNote } from './SectionHeading'

/**
 * 법정 점검 달력 — 주기·대상·근거 조문을 한 장씩.
 *
 * 대상 규모를 반드시 함께 적는다. «모든 사무실이 해야 한다» 로 읽히면 거짓이 된다. 과태료 금액처럼
 * 확인하지 않은 말은 쓰지 않는다.
 */
export default function LegalCalendarSection() {
  return (
    <RevealSection id="legal" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <SectionHeading
          eyebrow="법정 점검 달력"
          title={
            <>
              법으로 정해진 점검,
              <br />
              <span className="keyword-gradient-glow">주기</span>부터 챙기세요
            </>
          }
          description="건물 규모와 용도에 따라 정해진 주기로 해야 하는 점검이 있습니다. 우리 건물이 대상인지 확인하고, 필요한 점검은 바로 견적을 받으세요."
        />

        <RevealCard className="mt-12">
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {LEGAL_INSPECTIONS.map(inspection => {
              const href = inspection.serviceKey
                ? `/shop/services?service=${inspection.serviceKey}`
                : `/shop/request?type=sourcing&item=${encodeURIComponent(inspection.sourcingItem)}`
              return (
                <li key={inspection.key} className="flex flex-col rounded-lg bg-[var(--hub-card)] p-6">
                  <span className="text-text text-lg font-semibold">{inspection.name}</span>
                  <span className="text-violet-strong bg-violet-soft mt-3 inline-block self-start rounded-control px-3 py-1.5 text-sm font-semibold break-keep">
                    {inspection.cycle}
                  </span>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div>
                      <dt className="text-muted text-xs">대상</dt>
                      <dd className="text-muted-strong leading-6 break-keep">{inspection.appliesTo}</dd>
                    </div>
                    <div>
                      <dt className="text-muted text-xs">함께 챙길 것</dt>
                      <dd className="text-muted-strong leading-6 break-keep">{inspection.note}</dd>
                    </div>
                  </dl>
                  <span className="text-muted mt-4 block text-[11px]">{inspection.law}</span>
                  <Link href={href} className="text-violet group mt-auto flex items-center gap-1 pt-4 text-sm font-semibold">
                    점검 견적 받기
                    <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              )
            })}
          </ul>
          <SourceNote>{LEGAL_BASIS_NOTE}</SourceNote>
        </RevealCard>
      </div>
    </RevealSection>
  )
}
