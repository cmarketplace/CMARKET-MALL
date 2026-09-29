/**
 * 링크 심부름(대신 사 드림) 가격 규칙 — 대표 결정(2026-09-17).
 *
 *  - 심부름값: **건당 2,000원, 부가세 포함.** 수량과 무관하게 요청 한 건에 한 번.
 *  - 카드 결제: 카드수수료가 **별도로** 더해진다. 계좌이체·기관 후불·포인트는 더하지 않는다.
 *  - 견적서: 심부름값·카드수수료를 따로 줄로 적지 않고 **물품금액에 녹여 제품 단가로** 적는다.
 *    제품 단가 = (링크 판매가 × 수량 + 배송비 + 심부름값 + 카드수수료) ÷ 수량, **1원 올림**.
 *    올림 때문에 합계가 최대 (수량 − 1)원 늘 수 있다 — 단가 × 수량 = 합계가 견적서에서 맞아야 한다.
 *
 * `CARD_FEE_RATE` 는 씨마켓 결제대행 요율이 확정되면 넣는다(예: 0.025). 비어 있으면 화면은 숫자 없이
 * «카드수수료 별도(결제 시 확정)» 로 적는다 — 요율을 지어 넣지 않는다.
 */

export const ERRAND_FEE_PER_REQUEST = 2_000

export const CARD_FEE_RATE: number | null = null

export type ErrandPayment = 'transfer' | 'card'

export const ERRAND_PAYMENT_LABEL: Record<ErrandPayment, string> = {
  transfer: '계좌이체·기관 후불·포인트',
  card: '카드',
}

export interface ErrandEstimateInput {
  /** 링크 판매가(개당, 부가세 포함) */
  linkUnitPrice: number
  quantity: number
  /** 링크 배송비(부가세 포함). 무료면 0 */
  shipping: number
  payment: ErrandPayment
}

export interface ErrandEstimate {
  /** 링크 판매가 × 수량 + 배송비 */
  goods: number
  errandFee: number
  /** 카드수수료. 카드가 아니면 0, 요율 미정이면 null */
  cardFee: number | null
  /** 제품 단가(부가세 포함) — 심부름값·카드수수료가 녹아 있다 */
  unitPrice: number
  /** 제품 단가 × 수량(부가세 포함) */
  total: number
  /** 공급가액·부가세 — 과세 물품 기준 */
  supply: number
  vat: number
}

export function estimateErrand(input: ErrandEstimateInput): ErrandEstimate | null {
  const { linkUnitPrice, quantity, shipping, payment } = input
  if (!(linkUnitPrice > 0) || !Number.isInteger(quantity) || quantity < 1 || shipping < 0) return null

  const goods = linkUnitPrice * quantity + shipping
  const beforeCard = goods + ERRAND_FEE_PER_REQUEST
  const cardFee = payment === 'card' ? (CARD_FEE_RATE === null ? null : Math.ceil(beforeCard * CARD_FEE_RATE)) : 0
  const unitPrice = Math.ceil((beforeCard + (cardFee ?? 0)) / quantity)
  const total = unitPrice * quantity
  const supply = Math.round(total / 1.1)

  return { goods, errandFee: ERRAND_FEE_PER_REQUEST, cardFee, unitPrice, total, supply, vat: total - supply }
}
