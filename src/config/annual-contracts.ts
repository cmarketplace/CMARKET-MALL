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
 * `unitPrice` 는 **낙찰이 끝난 품목만** 적는다. 비어 있으면 화면은 입찰 상한(인터넷 정상가)을 그린다.
 * 랜딩(비로그인 공개 화면)에는 낙찰 단가를 그리지 않는다 — 공급 단가는 몰 안에서만 보인다.
 *
 * 입찰 상한 = 인터넷 정상가(`src/lib/price-benchmark.ts`). 인터넷 **최저가**가 아닌 이유: 최저가에는
 * 재고 떨이·한정 특가가 섞여 1년 동안 댈 수 있는 공급사가 없다(2026-09-16 결정).
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
  '입찰 상한은 인터넷 정상가(재고 떨이·한정 특가 제외 중간값) — 그보다 싸게 부른 곳과만 계약',
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
      // key 는 인터넷 정상가 스냅샷(`src/data/price-benchmark.json`)의 key 와 같다 — 입찰 상한이 이 key 로 붙는다.
      { key: 'a4-double-a-75', name: '더블에이 하이플러스 A4 복사용지', spec: '75g · 2,500매(500매×5권) 박스', unit: '박스', minMonthly: 5, keyword: '하이플러스 복사용지', unitPrice: null },
      { key: 'toilet-paper-namuya-30', name: '잘풀리는집 나무야나무야 두루마리 화장지', spec: '22m × 30롤', unit: '팩', minMonthly: 5, keyword: '나무야나무야 30롤', unitPrice: null },
      { key: 'toilet-paper-monalisa-30', name: '모나리자 녹스 나무이야기 화장지', spec: '3겹 27m × 30롤', unit: '팩', minMonthly: 5, keyword: '모나리자 나무이야기', unitPrice: null },
      { key: 'toilet-paper-codi-30', name: '코디 에코스마트 화장지', spec: '3겹 22m × 30롤', unit: '팩', minMonthly: 5, keyword: '코디 에코스마트', unitPrice: null },
      { key: 'handtowel-namuya-5000', name: '잘풀리는집 나무야나무야 핸드타월', spec: '2겹 100매 × 50밴드(5,000매)', unit: '박스', minMonthly: 2, keyword: '나무야 핸드타월', unitPrice: null },
      { key: 'maxim-mocha-200', name: '맥심 모카골드 마일드 커피믹스', spec: '12g × 180T+20T', unit: '박스', minMonthly: 2, keyword: '모카골드 커피믹스', unitPrice: null },
      { key: 'maxim-mocha-400', name: '맥심 모카골드 마일드 커피믹스', spec: '12g × 400T', unit: '박스', minMonthly: 1, keyword: '모카골드 커피믹스', unitPrice: null },
      { key: 'maxim-zerosugar-100', name: '맥심 모카골드 제로슈거 커피믹스', spec: '11.5g × 100T', unit: '박스', minMonthly: 2, keyword: '모카골드 제로슈거', unitPrice: null },
      { key: 'samdasoo-500-20', name: '제주 삼다수 무라벨', spec: '500ml × 20병', unit: '묶음', minMonthly: 10, keyword: '삼다수', unitPrice: null },
      { key: 'samdasoo-2l-6', name: '제주 삼다수 무라벨', spec: '2L × 6병', unit: '묶음', minMonthly: 10, keyword: '삼다수 2ℓ', unitPrice: null },
      { key: 'humedic-sanitizer-500', name: '휴메딕 크린겔 손소독제', spec: '500ml 펌프형', unit: '개', minMonthly: 10, keyword: '크린겔 손소독제', unitPrice: null },
    ],
  },
]

export function currentAnnualRound(today: string): AnnualContractRound | null {
  const open = ANNUAL_CONTRACT_ROUNDS.filter(round => round.applyClosesAt >= today).sort((a, b) =>
    a.applyClosesAt.localeCompare(b.applyClosesAt),
  )
  return open[0] ?? null
}
