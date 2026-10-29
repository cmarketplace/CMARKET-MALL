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

/* ── 링크로 바로 사기(몰 진열 오퍼) — 세모 `common/domain/link-errand-pricing.ts` 와 같은 규칙 ───────────── */

/**
 * 몰에 진열된 «대신 사 드림» 오퍼의 수량별 단가.
 *
 * 세모가 주문·견적을 확정할 때 쓰는 함수와 **같은 식**이다(세모가 정본, 이건 화면용 사본). 두 곳의 숫자가 다르면 장바구니
 * 금액과 주문 금액이 갈라지므로, 같은 시험 표(`link-errand.test.mjs` ↔ 세모 `link-errand-pricing.spec.ts`)를 쓴다.
 *
 *   단가(부가세 포함) = ⌈(인터넷 판매가 × 수량 + 배송비 + 심부름값) ÷ 수량⌉
 *   몰이 공급가액 축(세모네모)이면 단가 = ⌈같은 합계 × 10 ÷ (11 × 수량)⌉
 * 카드수수료는 별도(요율 확정 전에는 숫자 없이 «별도»).
 */
export interface LinkPriceInput {
  /** 인터넷 판매가(개당, 부가세 포함) */
  linkPrice: number
  /** 인터넷 배송비(부가세 포함). 무료면 0 */
  shipping: number
  quantity: number
  /** 몰 가격 축 — 세모네모는 공급가액(false) */
  includeVat: boolean
}

export interface LinkPriceQuote {
  quantity: number
  goods: number
  errandFee: number
  totalInclusive: number
  unitInclusive: number
  /** 몰 축 단가 — 장바구니·주문 */
  unitPrice: number
  lineTotal: number
}

const isWon = (n: number) => Number.isInteger(n) && n >= 0 && n <= 1_000_000_000_000

export function quoteLinkPrice(input: LinkPriceInput): LinkPriceQuote | null {
  const { linkPrice, shipping, quantity, includeVat } = input
  if (!isWon(linkPrice) || linkPrice < 1 || !isWon(shipping)) return null
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) return null
  const goods = linkPrice * quantity + shipping
  const totalInclusive = goods + ERRAND_FEE_PER_REQUEST
  const unitInclusive = Math.ceil(totalInclusive / quantity)
  const unitPrice = includeVat ? unitInclusive : Math.ceil((totalInclusive * 10) / (11 * quantity))
  return {
    quantity,
    goods,
    errandFee: ERRAND_FEE_PER_REQUEST,
    totalInclusive,
    unitInclusive,
    unitPrice,
    lineTotal: unitPrice * quantity,
  }
}
