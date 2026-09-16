'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight } from 'lucide-react'

import { OFFICE_SERVICES } from '@/config/office-services'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading from './SectionHeading'

const SWITCHABLE = OFFICE_SERVICES.filter(service => service.group === 'rental' || service.group === 'cleaning')

/**
 * 갈아타기 — 지금 매달 내는 계약을 적으면 같은 조건의 비교 견적.
 * 절감액을 미리 그리지 않는다: 비교 단가는 견적 전에는 없다.
 */
export default function SwitchSection() {
  const router = useRouter()
  const [service, setService] = useState(SWITCHABLE[0]?.key ?? '')

  return (
    <RevealSection id="switch" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
          <SectionHeading
            align="left"
            eyebrow="갈아타기"
            title={
              <>
                지금 내는 월 요금,
                <br />
                <span className="keyword-gradient-glow">같은 조건</span>으로 비교해 보세요
              </>
            }
            description="정수기·복합기·청소처럼 매달 나가는 계약의 조건을 적으면 씨마켓몰이 같은 조건으로 견적을 받아 나란히 보여 드립니다. 약정 만기와 위약금까지 따져 갈아탈 시점을 잡습니다."
          />

          <RevealCard>
            <form
              onSubmit={event => {
                event.preventDefault()
                router.push(`/shop/request?type=switch&service=${service}`)
              }}
              className="rounded-lg bg-white p-6 shadow-[0_18px_48px_rgba(38,28,80,0.08)] sm:p-8"
            >
              <ArrowLeftRight size={26} aria-hidden="true" className="text-violet" />
              <p className="text-text mt-4 text-lg font-semibold">어떤 계약을 비교할까요?</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SWITCHABLE.map(option => (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={service === option.key}
                    onClick={() => setService(option.key)}
                    className={`cursor-pointer rounded-full px-3.5 py-2 text-sm transition-colors ${
                      service === option.key ? 'bg-violet font-semibold text-white' : 'bg-blue-tint text-muted-strong hover:bg-blue-tint-2'
                    }`}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
              <button type="submit" className="bg-violet hover:bg-violet-strong mt-6 h-12 w-full cursor-pointer rounded-control text-sm font-semibold text-white transition-colors">
                지금 조건 적고 비교 견적 받기
              </button>
              <p className="text-muted mt-3 text-xs">비교 견적을 받아도 지금 계약은 그대로입니다.</p>
            </form>
          </RevealCard>
        </div>
      </div>
    </RevealSection>
  )
}
