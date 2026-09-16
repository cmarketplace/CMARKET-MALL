'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarClock, FileText, Handshake, Scale, Users } from 'lucide-react'

import { serviceIcon } from '@/components/Shop/Hub/serviceIcons'
import { OFFICE_SERVICES, SERVICE_GROUPS, servicePhoto, type ServiceGroupKey } from '@/config/office-services'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading, { landingButtonClass, landingGhostButtonClass } from './SectionHeading'

const PROMISES = [
  { icon: Handshake, title: '업체 선정은 씨마켓이', body: '서비스마다 업체를 찾고 비교하던 일을 대신합니다.' },
  { icon: Users, title: '계약 상대는 하나', body: '청소·정수기·방역을 함께 맡겨도 계약은 씨마켓과 한 번.' },
  { icon: FileText, title: '계산서는 매달 한 장', body: '서비스가 몇 개든 한 달치를 한 장으로 받습니다.' },
]

/**
 * 사무실 관리 구독 — 청소·렌탈·탕비실·점검 스무 가지를 분류 탭으로.
 *
 * 카드는 몰의 서비스 견적 화면(`/shop/services?service=`)으로 곧장 들어가고, 그 서비스가 요청서에
 * 담긴 채로 열린다. 가격은 없다 — 견적서가 정하고, 랜딩은 공개 화면이다.
 */
export default function OfficeServicesSection({ month }: { month: number }) {
  const [group, setGroup] = useState<ServiceGroupKey>('cleaning')
  const services = OFFICE_SERVICES.filter(service => service.group === group)

  return (
    <RevealSection id="services" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <SectionHeading
          eyebrow="사무실 관리 구독"
          title={
            <>
              청소·정수기·방역까지
              <br />
              <span className="keyword-gradient-glow">계약 한 번</span>으로
            </>
          }
          description="필요한 서비스를 골라 인원·면적·대수만 적으면 견적서가 옵니다. 확정하면 정기구독으로 이어지고, 이후 관리는 씨마켓몰이 챙깁니다."
        />

        <RevealCard className="mt-12">
          <div role="tablist" aria-label="서비스 분류" className="flex flex-wrap justify-center gap-2">
            {SERVICE_GROUPS.map(tab => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={group === tab.key}
                onClick={() => setGroup(tab.key)}
                className={`cursor-pointer rounded-full px-4 py-2.5 text-sm transition-colors ${
                  group === tab.key ? 'bg-navy font-semibold text-white' : 'bg-[var(--hub-chip)] text-muted-strong hover:bg-blue-tint-2'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(service => {
              const Icon = serviceIcon(service.key)
              const photo = servicePhoto(service.key)
              const badges = (
                <>
                  {service.preorderMonths?.includes(month) && (
                    <span className="bg-highlight-soft text-highlight-strong inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      <CalendarClock size={11} aria-hidden="true" /> 지금 선예약
                    </span>
                  )}
                  {service.legalKey && (
                    <span className="text-muted-strong inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold">
                      <Scale size={11} aria-hidden="true" /> 법정 점검
                    </span>
                  )}
                </>
              )
              return (
                <li key={service.key}>
                  <Link
                    href={`/shop/services?service=${service.key}`}
                    className="group hover:bg-blue-tint-2 flex h-full flex-col overflow-hidden rounded-lg bg-[var(--hub-card)] transition-colors"
                  >
                    {/* 실사진 — 서비스가 «무엇을 해 주는지» 를 아이콘보다 빨리 보여 준다. 사진이 없는 서비스는
                      * 같은 크기의 면에 아이콘을 크게 둬서 한 줄에 섞여도 카드 모양이 흔들리지 않게 한다. */}
                    <span className="relative block aspect-[3/2] overflow-hidden">
                      {photo ? (
                        <Image
                          src={photo}
                          alt={`${service.name} 사진`}
                          fill
                          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span className="bg-blue-tint-2 text-violet absolute inset-0 flex items-center justify-center">
                          <Icon size={56} strokeWidth={1.4} aria-hidden="true" />
                        </span>
                      )}
                      <span className="absolute top-3 right-3 flex flex-wrap justify-end gap-1.5">{badges}</span>
                    </span>
                    <span className="flex flex-1 flex-col px-6 pt-5 pb-6">
                      <span className="text-text block text-lg font-semibold">{service.name}</span>
                      <span className="text-muted mt-1.5 block text-sm leading-6 break-keep">{service.summary}</span>
                      <span className="text-violet mt-auto flex items-center gap-1 pt-5 text-sm font-semibold">
                        견적 받기
                        <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <ul className="bg-navy mt-6 grid gap-6 rounded-lg px-6 py-7 text-white sm:grid-cols-3 sm:px-8">
            {PROMISES.map(promise => (
              <li key={promise.title} className="flex gap-3">
                <promise.icon size={22} aria-hidden="true" className="text-mint mt-0.5 shrink-0" />
                <span>
                  <span className="block text-base font-semibold">{promise.title}</span>
                  <span className="text-on-dark-muted mt-1 block text-sm leading-6">{promise.body}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/shop/services" className={landingButtonClass}>
              견적 요청서 만들기
            </Link>
            <Link href="/shop/request?type=switch" className={landingGhostButtonClass}>
              지금 계약과 비교하기
            </Link>
          </div>
        </RevealCard>
      </div>
    </RevealSection>
  )
}
