'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FlaskConical, Factory, GraduationCap, Landmark, Mailbox, Stethoscope } from 'lucide-react'

import { ORG_FAVORITES } from '@/config/org-favorites'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading, { SourceNote } from './SectionHeading'

const ORG_ICON: Record<string, typeof Landmark> = {
  'post-office': Mailbox,
  school: GraduationCap,
  research: FlaskConical,
  'local-gov': Landmark,
  'public-corp': Factory,
  health: Stethoscope,
}

/**
 * 기관 유형별 자주 찾는 품목 — 탭 여섯 개.
 * 출처 표기를 반드시 붙인다: 지금은 «MD 정리» 이고, 주문 집계로 바뀌면 기준일과 함께 바꿔 적는다.
 */
export default function OrgFavoritesSection() {
  const [key, setKey] = useState(ORG_FAVORITES.types[0].key)
  const type = ORG_FAVORITES.types.find(entry => entry.key === key) ?? ORG_FAVORITES.types[0]

  return (
    <RevealSection id="org-favorites" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <SectionHeading
          eyebrow="기관 유형별"
          title={
            <>
              우리 같은 기관은
              <br />
              <span className="keyword-gradient-glow">무엇을</span> 자주 찾을까
            </>
          }
          description="우체국과 연구기관이 사는 물건은 다릅니다. 기관 유형을 고르면 그 유형 담당자들이 자주 찾는 품목으로 바로 갑니다."
        />

        <RevealCard className="mt-12">
          <div role="tablist" aria-label="기관 유형" className="flex flex-wrap justify-center gap-2">
            {ORG_FAVORITES.types.map(entry => {
              const Icon = ORG_ICON[entry.key] ?? Landmark
              const active = entry.key === key
              return (
                <button
                  key={entry.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setKey(entry.key)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-sm transition-colors ${
                    active ? 'bg-navy font-semibold text-white' : 'text-muted-strong bg-[var(--hub-chip)] hover:bg-blue-tint-2'
                  }`}
                >
                  <Icon size={16} aria-hidden="true" className={active ? 'text-mint' : 'text-violet'} />
                  {entry.label}
                </button>
              )
            })}
          </div>

          <div className="mx-auto mt-8 max-w-5xl rounded-lg bg-[var(--hub-card)] p-6 sm:p-8">
            <p className="text-muted-strong text-center text-[15px]">{type.note}</p>
            <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {type.items.map(item => (
                <li key={item.name}>
                  <Link
                    href={`/shop/products?q=${encodeURIComponent(item.keyword)}`}
                    className="hover:bg-blue-tint-2 text-text flex bg-[var(--hub-inset)] items-center justify-between gap-3 rounded-control px-4 py-3.5 text-[15px] font-semibold transition-colors"
                  >
                    {item.name}
                    <span className="text-violet text-xs font-semibold">보기</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
          <SourceNote>
            {ORG_FAVORITES.basis === 'measured' && ORG_FAVORITES.measuredAt
              ? `${ORG_FAVORITES.measuredAt.replace(/-/g, '.')} 기준 · 씨마켓몰 주문 집계`
              : '씨마켓몰 MD 정리 · 순서는 인기 순위가 아닙니다'}
          </SourceNote>
        </RevealCard>
      </div>
    </RevealSection>
  )
}
