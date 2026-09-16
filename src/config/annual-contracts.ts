/**
 * 연간 단가계약 — 매달 똑같이 사는 소모품을 **1년 단가 한 번**으로 끝낸다.
 *
 * 기관·기업마다 따로 사면 복사용지 한 박스 값이 곳곳에서 다르다. 씨마켓몰은 신청을 모아
 * 품목별로 한 번 입찰하고, 낙찰된 단가를 계약 기간 내내 고정한다. 신청한 곳은 매달 수량만
 * 정하면 된다.
 *
 * 흐름: 신청(몰 요청 원장, type `ANNUAL_CONTRACT`) → 신청 마감 → 품목별 입찰 → 낙찰 단가로
 * 단가계약서 발행 → 매달 정기 배송(구독과 같은 축).
 *
 * `unitPrice` 는 **낙찰이 끝난 품목만** 적는다. 비어 있으면 화면은 «입찰 후 공개» 로 그린다.
 * 랜딩(비로그인 공개 화면)에는 이 값이 있어도 그리지 않는다 — 공급 단가는 몰 안에서만 보인다.
 */

export interface AnnualContractItem {
  key: string
  name: string
  spec: string
  unit: string
  /** 한 달 최소 수량 — 입찰 단위가 성립하는 선 */
  minMonthly: number
  keyword: string
  /** 낙찰 단가(부가세 별도, 원). 입찰 전이면 null. */
  unitPrice: number | null
}

export interface AnnualContractRound {
  key: string
  title: string
  /** 신청 마감(포함) */
  applyClosesAt: string
  /** 계약 기간 */
  term: string
  items: AnnualContractItem[]
}

/** 신청 화면·랜딩에 그대로 나가는 계약 조건. 운영 약관이 확정되면 이 줄만 고친다. */
export const ANNUAL_CONTRACT_TERMS: readonly string[] = [
  '입찰 상한은 신청 마감일의 인터넷 최저가 — 그보다 싸게 부른 곳이 없으면 계약하지 않음',
  '계약 기간 12개월 동안 낙찰 단가 고정',
  '매달 수량은 배송 5일 전까지 조정',
  '배송지가 여러 곳이어도 계산서는 매달 한 장',
  '해지는 1개월 전에 알리면 위약금 없음',
]

export const ANNUAL_CONTRACT_ROUNDS: readonly AnnualContractRound[] = [
  {
    key: 'ac-2027',
    title: '2027년 연간 단가계약',
    applyClosesAt: '2026-11-30',
    term: '2027년 1월 ~ 12월',
    items: [
      {
        key: 'a4-paper',
        name: 'A4 복사용지',
        spec: '80g · 2,500매(500매×5권) 박스',
        unit: '박스',
        minMonthly: 5,
        keyword: 'A4 복사용지',
        unitPrice: null,
      },
      {
        key: 'a3-paper',
        name: 'A3 복사용지',
        spec: '80g · 1,250매(250매×5권) 박스',
        unit: '박스',
        minMonthly: 2,
        keyword: 'A3 복사용지',
        unitPrice: null,
      },
      {
        key: 'hand-towel',
        name: '핸드타월',
        spec: '2겹 · 5,000매 박스',
        unit: '박스',
        minMonthly: 2,
        keyword: '핸드타월',
        unitPrice: null,
      },
      {
        key: 'paper-cup',
        name: '종이컵',
        spec: '184ml(6.5온스) · 1,000개 박스',
        unit: '박스',
        minMonthly: 2,
        keyword: '종이컵',
        unitPrice: null,
      },
      {
        key: 'water-500',
        name: '생수',
        spec: '500ml · 20병',
        unit: '묶음',
        minMonthly: 10,
        keyword: '생수 500ml',
        unitPrice: null,
      },
      {
        key: 'coffee-mix',
        name: '커피믹스',
        spec: '12g · 180개입',
        unit: '박스',
        minMonthly: 2,
        keyword: '커피믹스',
        unitPrice: null,
      },
    ],
  },
]

export function currentAnnualRound(today: string): AnnualContractRound | null {
  const open = ANNUAL_CONTRACT_ROUNDS.filter(round => round.applyClosesAt >= today).sort((a, b) =>
    a.applyClosesAt.localeCompare(b.applyClosesAt),
  )
  return open[0] ?? null
}
