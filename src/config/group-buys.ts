import { kstToday } from '@/config/seasons'

/**
 * 이번 달 공동구매 — «수요를 먼저 모으고, 모인 수량으로 입찰해 최저가로 납품» 한다.
 *
 * 기관은 수요조사에 참여하는 것만으로는 구매를 약속하지 못한다(예산·결재가 뒤에 있다).
 * 그래서 두 단계로 나눈다.
 *   1. 수요조사 — «이만큼 필요하다» 는 의향만 받는다(몰 요청 원장, type `GROUP_BUY_PLEDGE`).
 *   2. 입찰 → 최종가 공개 → 참여 확정 — 공급사끼리 모인 수량으로 가격을 부르게 하고,
 *      최종가가 나온 뒤 정해진 기간 안에 확정한 곳만 주문이 선다.
 *
 * 품목·일정은 사람이 적는다(시즌 캘린더와 같은 규칙). 매달 이 파일만 고친다.
 * 할인율을 미리 적지 않는다 — 가격은 입찰이 정한다. `milestones` 는 «모이면 무엇을 할 수
 * 있는가» 의 절차이지 약속된 할인이 아니다.
 */

export interface GroupBuyMilestone {
  /** 모인 총수량 */
  quantity: number
  /** 그 수량이 모이면 열리는 것 */
  label: string
}

export interface GroupBuyItem {
  key: string
  name: string
  /** 규격 — 입찰은 규격이 같아야 성립한다 */
  spec: string
  /** 주문 단위 */
  unit: string
  /** 참여 최소 수량 */
  minQuantity: number
  /** 몰 검색어 — 지금 몰 판매가를 보러 가는 문 */
  keyword: string
  milestones: GroupBuyMilestone[]
}

export interface GroupBuyCampaign {
  key: string
  /** 화면 제목. 예) «10월 공동구매» */
  title: string
  /** 품목을 고른 근거. 화면에 그대로 나간다 */
  basis: string
  /** 수요조사 마감(포함) YYYY-MM-DD */
  surveyClosesAt: string
  /** 공급사 입찰 기간 */
  biddingPeriod: string
  /** 최종가 공개 후 참여 확정 기간 */
  confirmPeriod: string
  /** 납품 시작 */
  deliveryFrom: string
  items: GroupBuyItem[]
}

export const GROUP_BUY_CAMPAIGNS: readonly GroupBuyCampaign[] = [
  {
    key: 'gb-2026-10',
    title: '10월 공동구매',
    basis: '씨마켓몰 MD 선정 · 겨울 전 한꺼번에 사 두는 소모품',
    surveyClosesAt: '2026-09-30',
    biddingPeriod: '10월 1일(목) ~ 10월 5일(월)',
    confirmPeriod: '10월 6일(화) ~ 10월 7일(수)',
    deliveryFrom: '10월 13일(화)부터',
    items: [
      {
        key: 'hand-warmer',
        name: '핫팩(포켓형)',
        spec: '150g 이상 · 개별 포장 · KC 인증',
        unit: '개',
        minQuantity: 100,
        keyword: '핫팩',
        milestones: [
          { quantity: 5_000, label: '공급사 입찰 시작' },
          { quantity: 20_000, label: '제조사 직납 입찰' },
          { quantity: 50_000, label: '기관 로고 인쇄 협의' },
        ],
      },
      {
        key: 'toilet-paper',
        name: '두루마리 화장지',
        spec: '3겹 · 30m 이상 · 30롤',
        unit: '팩',
        minQuantity: 10,
        keyword: '화장지',
        milestones: [
          { quantity: 500, label: '공급사 입찰 시작' },
          { quantity: 2_000, label: '제조사 직납 입찰' },
          { quantity: 5_000, label: '지역별 분할 배송' },
        ],
      },
      {
        key: 'hand-sanitizer',
        name: '손소독제 리필',
        spec: '에탄올 62% 이상 · 1L 리필',
        unit: '개',
        minQuantity: 20,
        keyword: '손소독제',
        milestones: [
          { quantity: 1_000, label: '공급사 입찰 시작' },
          { quantity: 4_000, label: '제조사 직납 입찰' },
          { quantity: 10_000, label: '디스펜서 설치 협의' },
        ],
      },
    ],
  },
]

export type GroupBuyStage = 'survey' | 'bidding' | 'closed'

/** 지금 열려 있는(또는 가장 최근) 캠페인. 수요조사 마감이 안 지난 것 중 가장 가까운 것. */
export function currentCampaign(today = kstToday()): GroupBuyCampaign | null {
  const open = GROUP_BUY_CAMPAIGNS.filter(campaign => campaign.surveyClosesAt >= today).sort((a, b) =>
    a.surveyClosesAt.localeCompare(b.surveyClosesAt),
  )
  return open[0] ?? GROUP_BUY_CAMPAIGNS[GROUP_BUY_CAMPAIGNS.length - 1] ?? null
}

export function campaignStage(campaign: GroupBuyCampaign, today = kstToday()): GroupBuyStage {
  return campaign.surveyClosesAt >= today ? 'survey' : 'bidding'
}

export function findCampaignItem(
  campaignKey: string,
  itemKey: string,
): { campaign: GroupBuyCampaign; item: GroupBuyItem } | null {
  const campaign = GROUP_BUY_CAMPAIGNS.find(entry => entry.key === campaignKey)
  const item = campaign?.items.find(entry => entry.key === itemKey)
  return campaign && item ? { campaign, item } : null
}

/** 요청 원장의 refKey — 캠페인과 품목을 한 문자열로. 집계(tally)도 이 키로 한다. */
export function groupBuyRefKey(campaignKey: string, itemKey: string): string {
  return `${campaignKey}:${itemKey}`
}
