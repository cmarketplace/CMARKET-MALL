'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Plus } from 'lucide-react'

import { KITS } from '@/config/kits'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading, { landingButtonClass } from './SectionHeading'

/** 꾸러미 — 개소·입사·워크숍·행사·명절 선물. 탭을 고르면 그 꾸러미의 품목과 견적 문. */
export default function KitsSection() {
  const [key, setKey] = useState(KITS[0].key)
  const kit = KITS.find(entry => entry.key === key) ?? KITS[0]

  return (
    <RevealSection id="kits" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <SectionHeading
          eyebrow="꾸러미"
          title={
            <>
              일이 생기면
              <br />
              <span className="keyword-gradient-glow">견적 한 장</span>으로 준비
            </>
          }
          description="새 사무실, 신규 입사, 워크숍, 체육대회, 명절 선물. 품목을 하나씩 찾지 않고 인원과 날짜만 적어 한 번에 받으세요."
        />

        <RevealCard className="mt-12">
          <div role="tablist" aria-label="꾸러미" className="flex flex-wrap justify-center gap-2">
            {KITS.map(entry => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={entry.key === key}
                onClick={() => setKey(entry.key)}
                className={`cursor-pointer rounded-full px-4 py-2.5 text-sm transition-colors ${
                  entry.key === key ? 'bg-navy font-semibold text-white' : 'bg-[var(--hub-chip)] text-muted-strong hover:bg-blue-tint-2'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="mx-auto mt-8 grid bg-[var(--hub-card)] max-w-5xl gap-8 rounded-lg p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="text-text text-2xl leading-[1.35] font-semibold break-keep">{kit.headline}</p>
              <p className="text-muted mt-3 text-[15px] leading-7 break-keep">{kit.description}</p>
              <Link href={`/shop/request?type=kit&kit=${kit.key}`} className={`${landingButtonClass} mt-6`}>
                {kit.label} 견적 받기
              </Link>
            </div>
            <ul className="space-y-2">
              {kit.lines.map(line => (
                <li key={line.name} className="flex items-center gap-3 rounded-control bg-[var(--hub-inset)] px-4 py-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      line.essential ? 'bg-violet text-white' : 'bg-violet-soft text-violet'
                    }`}
                  >
                    {line.essential ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                  </span>
                  <span className="text-text flex-1 text-[15px] font-medium">{line.name}</span>
                  <span className="text-muted text-xs">{line.essential ? '기본' : '선택'}</span>
                </li>
              ))}
              {kit.recipientList && (
                <li className="text-violet-strong bg-violet-soft rounded-control px-4 py-3 text-sm font-semibold">
                  받는 사람 명단을 엑셀에서 붙여 넣으면 한 분씩 따로 보냅니다
                </li>
              )}
            </ul>
          </div>
        </RevealCard>
      </div>
    </RevealSection>
  )
}
