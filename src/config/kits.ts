/**
 * 꾸러미 — 개소·이전, 신규 입사, 워크숍·교육, 체육대회·행사, 명절 단체 선물.
 *
 * 일이 생길 때마다 품목을 하나씩 찾는 대신 «이 일에 필요한 것» 을 한 장의 견적으로 받는다.
 * 담당자는 인원·날짜·예산만 적고 빼거나 더할 품목을 고른다(몰 요청 원장, type `KIT`).
 * 품목을 직접 담고 싶은 사람을 위해 각 줄은 몰 검색어를 갖는다.
 *
 * `recipientList` 가 켜진 꾸러미는 받는 사람 명단(이름·연락처·주소)을 붙여 넣을 수 있다 —
 * 명절 선물처럼 한 사람씩 따로 보내는 일이다.
 */

export interface KitLine {
  name: string
  keyword: string
  /** 기본으로 체크해 둘 품목인가 */
  essential: boolean
}

export interface Kit {
  key: string
  label: string
  headline: string
  description: string
  lines: KitLine[]
  /** 받는 사람 명단을 받는가(개별 배송) */
  recipientList: boolean
  /** 날짜 칸의 이름 */
  dateLabel: string
}

export const KITS: readonly Kit[] = [
  {
    key: 'office-open',
    label: '개소·이전',
    headline: '새 사무실, 첫날부터 일할 수 있게',
    description: '가구·복합기·정수기·기본 비품과 입주 청소를 한 견적으로 받습니다.',
    lines: [
      { name: '사무용 책상·의자', keyword: '사무용 의자', essential: true },
      { name: '캐비닛·수납장', keyword: '캐비닛', essential: true },
      { name: '사무용품 기본 세트', keyword: '사무용품', essential: true },
      { name: '복합기 렌탈', keyword: '복합기', essential: false },
      { name: '정수기 렌탈', keyword: '정수기', essential: false },
      { name: '입주 청소', keyword: '청소', essential: false },
    ],
    recipientList: false,
    dateLabel: '입주일',
  },
  {
    key: 'onboarding',
    label: '신규 입사',
    headline: '입사 첫날 책상 위에 올려 둘 것',
    description: '명함·사원증·필기구·텀블러를 인원만큼 한 번에 준비합니다.',
    lines: [
      { name: '명함', keyword: '명함', essential: true },
      { name: '사원증 케이스·목걸이', keyword: '사원증 케이스', essential: true },
      { name: '노트·필기구 세트', keyword: '노트', essential: true },
      { name: '텀블러', keyword: '텀블러', essential: false },
      { name: '모니터 받침·데스크 소품', keyword: '모니터 받침대', essential: false },
    ],
    recipientList: false,
    dateLabel: '입사일',
  },
  {
    key: 'workshop',
    label: '워크숍·교육',
    headline: '교육·세미나 준비물을 한 장으로',
    description: '현수막·명찰·다과·필기구·기념품까지 인원과 날짜에 맞춰 보냅니다.',
    lines: [
      { name: '현수막', keyword: '현수막', essential: true },
      { name: '명찰', keyword: '명찰', essential: true },
      { name: '다과·음료', keyword: '다과', essential: true },
      { name: '필기구·노트', keyword: '볼펜', essential: false },
      { name: '로고 인쇄 기념품', keyword: '기념품', essential: false },
      { name: '생수', keyword: '생수', essential: false },
    ],
    recipientList: false,
    dateLabel: '행사일',
  },
  {
    key: 'sports-day',
    label: '체육대회·행사',
    headline: '야외 행사에 빠지면 곤란한 것들',
    description: '단체복·그늘막·음료·구급함을 행사 규모에 맞춰 준비합니다.',
    lines: [
      { name: '단체 티셔츠', keyword: '단체 티셔츠', essential: true },
      { name: '그늘막·천막', keyword: '그늘막', essential: true },
      { name: '생수·음료', keyword: '생수', essential: true },
      { name: '구급함', keyword: '구급함', essential: false },
      { name: '현수막', keyword: '현수막', essential: false },
      { name: '상품·기념품', keyword: '기념품', essential: false },
    ],
    recipientList: false,
    dateLabel: '행사일',
  },
  {
    key: 'holiday-gift',
    label: '명절 단체 선물',
    headline: '명단만 주시면 한 분씩 따로 보냅니다',
    description: '직원·거래처 선물을 고르고 받는 사람 명단을 붙여 넣으면 개별 배송까지 맡습니다.',
    lines: [
      { name: '선물세트', keyword: '선물세트', essential: true },
      { name: '메시지 카드', keyword: '카드', essential: false },
      { name: '선물 포장', keyword: '포장', essential: false },
    ],
    recipientList: true,
    dateLabel: '도착 희망일',
  },
]

export function findKit(key: string | null | undefined): Kit | null {
  if (!key) return null
  return KITS.find(kit => kit.key === key) ?? null
}
