'use client'

import Link from 'next/link'

import { HubHeader } from '../Requests/RequestKit'
import { REQUEST_KINDS, type RequestKind } from './request-kinds'
import KitForm from './forms/KitForm'
import LinkForm from './forms/LinkForm'
import MandatoryForm from './forms/MandatoryForm'
import SocialValueForm from './forms/SocialValueForm'
import SourcingForm from './forms/SourcingForm'
import SwitchForm from './forms/SwitchForm'


const KIND_COPY: Record<RequestKind, { tab: string; eyebrow: string; title: string; description: string }> = {
  link: {
    tab: '링크로 사기',
    eyebrow: '인터넷에서 본 그 제품',
    title: '링크만 붙여 넣으면 같은 제품으로 견적을 드립니다',
    description:
      '쿠팡·네이버·11번가 등에서 본 상품 링크를 붙여 넣어 주세요. 같은 제품을 씨마켓 공급사에서 찾아, 링크에 보이는 가격과 나란히 적은 견적서로 회신합니다. 견적을 보고 비싸면 사지 않으셔도 됩니다.',
  },
  sourcing: {
    tab: '구해드림',
    eyebrow: '못 찾은 물건 · 급한 물건',
    title: '찾는 물건을 적어 주시면 구해 드립니다',
    description:
      '몰에 없는 물건, 규격이 까다로운 물건, 당장 내일 필요한 물건까지 품명과 수량만 적어 보내 주세요. 씨마켓 공급사 네트워크에서 찾아 견적으로 회신합니다.',
  },
  switch: {
    tab: '갈아타기',
    eyebrow: '지금 쓰는 계약 비교',
    title: '지금 내는 월 요금, 비교 견적 받아 보세요',
    description:
      '정수기·복합기·청소처럼 매달 나가는 계약의 조건을 적어 주시면 같은 조건으로 씨마켓 지정 업체 견적을 뽑아 나란히 비교해 드립니다. 약정·위약금도 함께 따져 봅니다.',
  },
  kit: {
    tab: '꾸러미',
    eyebrow: '일이 생길 때 한 번에',
    title: '개소·입사·행사 준비물을 견적 한 장으로',
    description:
      '품목을 하나씩 찾지 않아도 됩니다. 인원·날짜만 적고 빼거나 더할 품목을 고르면 한 장의 견적으로 회신합니다.',
  },
  mandatory: {
    tab: '의무구매',
    eyebrow: '공공기관 우선구매 실적',
    title: '남은 의무구매 실적, 인증 상품으로 채워 드립니다',
    description:
      '채워야 할 분야와 금액을 알려 주시면 해당 인증을 가진 공급사 상품으로 견적을 모아 드립니다. 인증서 사본도 함께 보내 드립니다.',
  },
  social: {
    tab: '연계구매',
    eyebrow: '장애인표준사업장 생산품',
    title: '같은 물건을 사면서 고용부담금도 줄이세요',
    description:
      '장애인표준사업장이 만든 물품·서비스로 필요한 품목의 견적을 받아 드립니다. 연계고용 감면 신청에 필요한 서류도 함께 챙깁니다.',
  },
}

interface RequestHubProps {
  kind: RequestKind
  today: string
  initialService: string | null
  initialKit: string | null
  initialUrgent: boolean
  initialItem: string
  initialCategories: string[]
  initialAmount: string
  initialUrl: string
  initialQuantity: string
  stub: boolean
}

/**
 * 요청 화면의 틀 — 위에는 종류 탭(링크), 아래에는 그 종류의 폼.
 *
 * 탭이 버튼이 아니라 링크인 이유: 랜딩의 각 섹션이 이 화면의 특정 탭으로 바로 들어오고, 뒤로가기가
 * 탭 사이를 오가야 한다. 폼 상태는 탭을 옮기면 버려진다 — 종류가 다르면 칸이 다르다.
 */
export default function RequestHub(props: RequestHubProps) {
  const copy = KIND_COPY[props.kind]

  return (
    <div className="space-y-8">
      <nav aria-label="요청 종류" className="flex flex-wrap gap-2">
        {REQUEST_KINDS.map(kind => (
          <Link
            key={kind}
            href={`/shop/request?type=${kind}`}
            aria-current={props.kind === kind ? 'page' : undefined}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              props.kind === kind ? 'bg-text font-semibold text-white' : 'bg-bg text-muted-strong hover:bg-bg-secondary'
            }`}
          >
            {KIND_COPY[kind].tab}
          </Link>
        ))}
      </nav>

      <HubHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      {props.kind === 'link' && (
        <LinkForm key="link" today={props.today} initialUrl={props.initialUrl} initialQuantity={props.initialQuantity} stub={props.stub} />
      )}
      {props.kind === 'sourcing' && (
        <SourcingForm key="sourcing" today={props.today} initialUrgent={props.initialUrgent} initialItem={props.initialItem} stub={props.stub} />
      )}
      {props.kind === 'switch' && <SwitchForm key="switch" initialService={props.initialService} stub={props.stub} />}
      {props.kind === 'kit' && <KitForm key={props.initialKit ?? 'kit'} today={props.today} initialKit={props.initialKit} stub={props.stub} />}
      {props.kind === 'mandatory' && (
        <MandatoryForm key="mandatory" today={props.today} initialCategories={props.initialCategories} initialAmount={props.initialAmount} stub={props.stub} />
      )}
      {props.kind === 'social' && <SocialValueForm key="social" stub={props.stub} />}
    </div>
  )
}
