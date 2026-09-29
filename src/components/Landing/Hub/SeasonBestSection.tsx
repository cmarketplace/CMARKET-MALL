'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CalendarClock, CloudSnow, Flower2, Leaf, Search, Sun } from 'lucide-react'

import { OFFICE_SERVICES } from '@/config/office-services'
import { SEASON_BESTS, type SeasonKey } from '@/config/season-bests'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading from './SectionHeading'

const SEASON_ICON: Record<SeasonKey, typeof Sun> = { spring: Flower2, summer: Sun, autumn: Leaf, winter: CloudSnow }

/**
 * 시즌 베스트 — 네 계절 탭, 지금 계절이 먼저 열린다.
 * 품목은 몰 검색으로, 그 계절에 몰리는 서비스는 선예약으로 잇는다.
 */
export default function SeasonBestSection({ current }: { current: SeasonKey }) {
  const [key, setKey] = useState<SeasonKey>(current)
  const season = SEASON_BESTS.find(entry => entry.key === key) ?? SEASON_BESTS[0]
  const services = season.serviceKeys
    .map(serviceKey => OFFICE_SERVICES.find(service => service.key === serviceKey))
    .filter(service => service !== undefined)

  return (
    <RevealSection id="season" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <SectionHeading
          eyebrow="시즌 베스트"
          title={
            <>
              계절이 바뀌기 전에
              <br />
              <span className="keyword-gradient-glow">먼저</span> 챙길 것
            </>
          }
          description="계절마다 담당자들이 찾는 물건과, 그 계절에 예약이 몰리는 서비스를 모았습니다."
        />

        <RevealCard className="mt-12">
          <div role="tablist" aria-label="계절" className="mx-auto grid max-w-xl grid-cols-4 gap-2">
            {SEASON_BESTS.map(entry => {
              const Icon = SEASON_ICON[entry.key]
              const active = entry.key === key
              return (
                <button
                  key={entry.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setKey(entry.key)}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg px-2 py-3 text-sm transition-colors ${
                    active ? 'bg-navy font-semibold text-white' : 'bg-[var(--hub-chip)] text-muted-strong hover:bg-blue-tint-2'
                  }`}
                >
                  <Icon size={20} aria-hidden="true" className={active ? 'text-mint' : 'text-violet'} />
                  <span className="break-keep">{entry.label}</span>
                  {entry.key === current && <span className={`text-[10px] ${active ? 'text-on-dark-muted' : 'text-muted'}`}>지금</span>}
                </button>
              )
            })}
          </div>

          <p className="text-text mt-8 text-center text-lg font-semibold">{season.headline}</p>

          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {season.items.map(item => (
              <li key={item.name}>
                <Link
                  href={`/shop/products?q=${encodeURIComponent(item.keyword)}`}
                  className="hover:bg-blue-tint-2 group flex h-full bg-[var(--hub-card)] flex-col justify-between gap-6 rounded-lg p-5 transition-colors"
                >
                  <span className="text-text text-base font-semibold break-keep">{item.name}</span>
                  <span className="text-violet flex items-center gap-1 text-xs font-semibold">
                    <Search size={13} aria-hidden="true" /> 몰에서 보기
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {services.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-[var(--hub-card)] px-5 py-4">
              <span className="text-text mr-2 flex items-center gap-1.5 text-sm font-semibold">
                <CalendarClock size={16} aria-hidden="true" className="text-violet" /> 이 계절 서비스 선예약
              </span>
              {services.map(service => (
                <Link
                  key={service.key}
                  href={`/shop/services?service=${service.key}`}
                  className="text-violet-strong hover:bg-accent bg-violet-soft rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors"
                >
                  {service.name}
                </Link>
              ))}
            </div>
          )}
        </RevealCard>
      </div>
    </RevealSection>
  )
}
