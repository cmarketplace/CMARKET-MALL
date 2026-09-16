import { Suspense, type ReactNode } from 'react'

import CategoryStrip from '@/components/Landing/CategoryStrip'
import ClosingCTA from '@/components/Landing/ClosingCTA'
import Contrast from '@/components/Landing/Contrast'
import Evidence from '@/components/Landing/Evidence'
import AnnualContractSection from '@/components/Landing/Hub/AnnualContractSection'
import AudienceSwitch, { type Audience } from '@/components/Landing/Hub/AudienceSwitch'
import GroupBuySection from '@/components/Landing/Hub/GroupBuySection'
import KitsSection from '@/components/Landing/Hub/KitsSection'
import LegalCalendarSection from '@/components/Landing/Hub/LegalCalendarSection'
import MandatorySection from '@/components/Landing/Hub/MandatorySection'
import OfficeServicesSection from '@/components/Landing/Hub/OfficeServicesSection'
import OrgFavoritesSection from '@/components/Landing/Hub/OrgFavoritesSection'
import OrgToolsSection from '@/components/Landing/Hub/OrgToolsSection'
import SavingsSection from '@/components/Landing/Hub/SavingsSection'
import SeasonBestSection from '@/components/Landing/Hub/SeasonBestSection'
import SocialValueSection from '@/components/Landing/Hub/SocialValueSection'
import SourcingSection from '@/components/Landing/Hub/SourcingSection'
import SwitchSection from '@/components/Landing/Hub/SwitchSection'
import LandingFooter from '@/components/Landing/LandingFooter'
import LandingHeader from '@/components/Landing/LandingHeader'
import ProcurementStats from '@/components/Landing/ProcurementStats'
import Stats from '@/components/Landing/Stats'
import VideoHero from '@/components/Landing/VideoHero'
import { currentAnnualRound } from '@/config/annual-contracts'
import { currentCampaign, groupBuyRefKey, type GroupBuyCampaign } from '@/config/group-buys'
import { seasonOf } from '@/config/season-bests'
import { daysUntil, ddayLabel, kstToday, SEASONS } from '@/config/seasons'
import { getLandingStats } from '@/lib/landing-stats'
import { tallyMallRequests } from '@/lib/mall-requests'

// «누구에게 보여 주나»(?for=)와 D-day 가 요청마다 다르다.
export const dynamic = 'force-dynamic'

/** 랜딩이 공동구매 집계를 기다리는 한도. 넘기면 막대는 숫자 없이 선다. */
const TALLY_TIMEOUT_MS = 2_500

type SectionKey =
  | 'groupBuy'
  | 'mandatory'
  | 'orgFavorites'
  | 'annual'
  | 'services'
  | 'legal'
  | 'season'
  | 'orgTools'
  | 'sourcing'
  | 'switch'
  | 'kits'
  | 'social'

/**
 * 누구에게 무엇을 먼저 — 공공기관과 기업은 관심사가 다르다(결정 D2·D5: 기관은 후불·고른 대로,
 * 기업은 선불·최저가 자동). 기관 전용(의무구매·예산 도구·기관 유형)과 기업 전용(갈아타기·연계구매)은
 * 반대쪽 순서에서 빠진다.
 */
const ORDER: Record<Audience, SectionKey[]> = {
  org: ['groupBuy', 'mandatory', 'orgFavorites', 'annual', 'services', 'legal', 'season', 'orgTools', 'sourcing', 'kits'],
  biz: ['annual', 'services', 'legal', 'groupBuy', 'season', 'switch', 'sourcing', 'kits', 'social'],
}

/**
 * 랜딩.
 *
 * 숫자는 저장소에 박아 둔 스냅샷에서 온다(`npm run landing:stats` 로 갱신). 랜딩은 빌드할
 * 때 피드를 부르지 않는다 — KCL 몰이 18,000건을 세다가 빌드가 죽었다.
 *
 * 지금 `c-point` 스토어프론트는 승인 품목이 0건이라 `getLandingStats()` 가 `null` 을 주고
 * 지표 섹션이 통째로 빠진다. 그 자리에 임시 숫자를 넣지 않은 것은 실수가 아니라 규칙이다 —
 * 씨마켓 디자인 시스템이 「근거 없는 최상급 표현」과 「실제 수치 없는 페이지」를 함께 금지한다.
 *
 * 조달 허브(구독·공동구매·단가계약·시즌·기관별·의무구매·구해드림·꾸러미…)는 설정 파일(`src/config/`)
 * 에서 그려지고 몰 안의 화면(`/shop/services` 등)으로 들어간다. 공개 화면이라 **단가는 그리지 않는다.**
 * 네트워크를 타는 것은 공동구매 집계 하나뿐이고, 그것도 Suspense 뒤에서 짧은 한도로 기다린다.
 */
export default async function LandingPage({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  const stats = getLandingStats()
  const audience: Audience = (await searchParams).for === 'biz' ? 'biz' : 'org'
  const today = kstToday()

  const campaign = currentCampaign(today)
  const round = currentAnnualRound(today)
  const yearEndEvent = SEASONS.find(season => season.key.startsWith('yearend') && daysUntil(season.date, today) >= 0)

  const sections: Record<SectionKey, ReactNode> = {
    groupBuy: campaign ? (
      <Suspense key="groupBuy" fallback={<GroupBuySection campaign={campaign} today={today} tallies={null} />}>
        <GroupBuyWithTally campaign={campaign} today={today} />
      </Suspense>
    ) : null,
    mandatory: <MandatorySection key="mandatory" />,
    orgFavorites: <OrgFavoritesSection key="orgFavorites" />,
    annual: round ? <AnnualContractSection key="annual" round={round} today={today} /> : null,
    services: <OfficeServicesSection key="services" month={Number(today.slice(5, 7))} />,
    legal: <LegalCalendarSection key="legal" />,
    season: <SeasonBestSection key="season" current={seasonOf(today).key} />,
    orgTools: (
      <OrgToolsSection
        key="orgTools"
        yearEnd={
          yearEndEvent ? { dday: ddayLabel(daysUntil(yearEndEvent.date, today)), deadline: yearEndEvent.deadline } : null
        }
      />
    ),
    sourcing: <SourcingSection key="sourcing" />,
    switch: <SwitchSection key="switch" />,
    kits: <KitsSection key="kits" />,
    social: <SocialValueSection key="social" />,
  }

  return (
    <div className="landing-theme flex flex-1 flex-col">
      <LandingHeader />

      <main className="flex-1">
        <VideoHero />

        {/* 히어로와 2번 섹션 사이의 낮은 띠 — 몰의 갈래를 한 줄로 훑는다 */}
        <CategoryStrip />

        <AudienceSwitch audience={audience} />

        {/* 배경은 자리가 정한다(globals.css `.hub-sections`) — 순서가 바뀌어도 같은 색이 붙지 않게 */}
        <div className="hub-sections">{ORDER[audience].map(key => sections[key])}</div>

        <Stats stats={stats} />

        <Evidence />

        <ProcurementStats />

        <Contrast />

        <SavingsSection />

        <ClosingCTA />
      </main>

      <LandingFooter />
    </div>
  )
}

async function GroupBuyWithTally({ campaign, today }: { campaign: GroupBuyCampaign; today: string }) {
  const tallies = await tallyMallRequests(
    'GROUP_BUY_PLEDGE',
    campaign.items.map(item => groupBuyRefKey(campaign.key, item.key)),
    { timeoutMs: TALLY_TIMEOUT_MS },
  )
  return <GroupBuySection campaign={campaign} today={today} tallies={tallies.length > 0 ? tallies : null} />
}
