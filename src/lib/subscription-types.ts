/**
 * 정기구독의 모양과 어휘 — **클라이언트에서도 쓸 수 있는 부분**만 모았다(`order-types.ts` 와 같은 분리).
 *
 * 구독의 정본은 세모다(`/external/storefronts/{slug}/subscriptions`). 구독은 «카탈로그 오퍼의 조합을
 * 주기마다 주문» 하는 것이고, 매 주기의 주문은 보통 몰 주문(씨마켓 안전결제 · 포인트)으로 선다 —
 * 대표 결정 D4(2026-09-14): **정기구독은 포인트로 자동 결제.**
 *
 * 단가는 세모가 정한다. 화면의 «월 예상» 은 세모가 준 지금 단가로 그린 미리보기이고, 실제 청구는
 * 주기마다 서는 주문이 정한다.
 */

export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELED' | 'PAYMENT_FAILED'
export type SubscriptionCycleStatus = 'PENDING' | 'ORDERED' | 'FAILED' | 'SKIPPED'

export interface SubscriptionFrequency {
  label: string
  /** 한 달에 몇 번 — 월 예상액(주기 금액 × 배수) 표시용. */
  multiplier: number
  /** 결제 간격(일). null 이면 달력 한 달(신청일의 일자가 닻). */
  intervalDays: number | null
}

export interface SubscriptionPlanOffer {
  offeringId: string
  itemId: string
  name: string
  /** 지금 단가(원). null 이면 그 오퍼가 지금 팔리지 않아 신청할 수 없다. */
  unitPrice: number | null
  priceTaxType: 'EXCLUSIVE' | 'INCLUSIVE'
  taxCategory: 'TAXABLE' | 'EXEMPT' | 'ZERO_RATED'
}

/** 세모에 등록된 구독 상품 = 인원당 품목 오퍼(수량 = 인원) + 선택적 기본료 오퍼(수량 1). */
export interface SubscriptionPlan {
  key: string
  name: string
  description: string | null
  includes: string[]
  frequencies: SubscriptionFrequency[]
  defaultFrequency: number
  minPeople: number
  maxPeople: number
  perPerson: SubscriptionPlanOffer
  baseFee: SubscriptionPlanOffer | null
  available: boolean
}

export interface SubscriptionEstimate {
  cycleSupply: number | null
  cycleVat: number | null
  /** 한 주기에 포인트로 빠지는 금액(공급가액 + 부가세). */
  cyclePayable: number | null
  monthlySupply: number | null
}

export interface SubscriptionCycle {
  cycleNo: number
  billingAt: string
  status: SubscriptionCycleStatus
  orderNo: string | null
  failureReason: string | null
  attempts: number
  orderedAt: string | null
}

export interface SubscriptionShipTo {
  name: string
  zip: string
  address: string
  tel: string | null
}

export interface Subscription {
  id: string
  status: SubscriptionStatus
  plan: { key: string; name: string }
  people: number
  frequency: SubscriptionFrequency & { index: number }
  shipTo: SubscriptionShipTo
  /** 다음 결제(주문) 예정 시각. 해지면 null. */
  nextBillingAt: string | null
  lastOrderNo: string | null
  lastBilledAt: string | null
  pausedAt: string | null
  pauseReason: string | null
  canceledAt: string | null
  cancelReason: string | null
  estimate: SubscriptionEstimate
  createdAt: string
  /** 상세에서만 온다(최신순). */
  cycles?: SubscriptionCycle[]
}

/** 신청 응답 — 첫 주기는 신청과 같은 요청에서 결제되므로 성패가 여기 실린다. */
export interface SubscribeResult {
  subscription: Subscription
  firstCycle: {
    status: 'ORDERED' | 'FAILED'
    orderNo: string | null
    failureReason: string | null
    /** 402 = 포인트 부족. */
    failureStatus: number | null
  }
}

export type SubscriptionAction = 'pause' | 'resume' | 'cancel'

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ACTIVE: '결제 중',
  PAYMENT_FAILED: '결제 실패 · 재시도 예정',
  PAUSED: '일시정지',
  CANCELED: '해지됨',
}

export const SUBSCRIPTION_STATUS_HINT: Record<SubscriptionStatus, string> = {
  ACTIVE: '결제일 아침 9시에 씨마켓 포인트로 자동 결제되고, 그 주기의 주문이 섭니다.',
  PAYMENT_FAILED:
    '포인트가 부족해 결제하지 못했습니다. 충전해 두시면 내일 아침 9시에 다시 시도합니다(3회 실패 시 일시정지).',
  PAUSED: '정지 중에는 결제하지 않습니다. 재개하면 지나간 결제일은 건너뛰고 다음 아침에 한 번 결제합니다.',
  CANCELED: '해지된 구독입니다. 이미 선 주문은 주문 내역에서 그대로 볼 수 있습니다.',
}

export const CYCLE_STATUS_LABEL: Record<SubscriptionCycleStatus, string> = {
  PENDING: '결제 예정',
  ORDERED: '주문 완료',
  FAILED: '결제 실패',
  SKIPPED: '건너뜀',
}

/**
 * 지금 단가로 본 미리보기(공급가액). 세모의 estimate 와 같은 산식이지만 화면에서 인원·주기를
 * 바꿀 때마다 왕복하지 않으려고 여기서도 계산한다. 팔 수 없는 오퍼가 있으면 null.
 */
export function previewSubscription(
  plan: Pick<SubscriptionPlan, 'perPerson' | 'baseFee' | 'frequencies'>,
  people: number,
  frequencyIndex: number,
): { cycleSupply: number; monthlySupply: number } | null {
  const frequency = plan.frequencies[frequencyIndex] ?? plan.frequencies[0]
  if (!frequency || plan.perPerson.unitPrice == null) return null
  if (plan.baseFee && plan.baseFee.unitPrice == null) return null
  const cycleSupply = plan.perPerson.unitPrice * people + (plan.baseFee?.unitPrice ?? 0)
  return { cycleSupply, monthlySupply: cycleSupply * frequency.multiplier }
}

export function clampPlanPeople(plan: Pick<SubscriptionPlan, 'minPeople' | 'maxPeople'>, value: number): number {
  if (!Number.isFinite(value)) return plan.minPeople
  return Math.min(plan.maxPeople, Math.max(plan.minPeople, Math.round(value)))
}
