/**
 * 브라우저에서 주문·취소·견적 발급을 낸다 — `/api/shop/*` 로만 간다.
 *
 * 원장을 직접 부르지 않는 이유는 신원이다. 「누가」는 서버 세션이 정하고, 세모 연동
 * 후에는 파트너 키도 서버에만 있다.
 */

import type { AssignedLine } from '@/lib/cart-combination'
import type { CombinationMode } from '@/lib/cart-combination'
import type {
  OrderPaymentInput,
  OrderRoute,
  OrderShipTo,
  PaymentMethod,
  PaymentOptions,
  StorefrontOrder,
} from '@/lib/order-types'
import type { StorefrontQuote } from '@/lib/quote-types'

export interface PlacedOrder {
  orderNo: string
  status: string
}

/**
 * 재시도 키 — 같은 클릭에서 난 실패를 다시 보낼 때 **같은 키**를 써야 주문이 한 건만
 * 생긴다. `crypto.randomUUID` 는 보안 컨텍스트(https·localhost)에서만 있다.
 */
export function newOrderKey(): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)

  return `cart-${Date.now().toString(36)}-${random}`
}

export interface OrderLineInput {
  itemId: string
  name: string
  spec: string | null
  unit: string | null
  quantity: number
  unitPrice: number
  offerId: string | null
  supplierName: string | null
}

/** 조합이 정한 줄 → 주문 줄. 스텁 단계에서는 단가 스냅샷도 함께 간다(서버 라우트 주석 참고). */
export function toOrderLine(line: AssignedLine): OrderLineInput {
  return {
    itemId: line.product.id,
    name: line.product.name,
    spec: [line.product.spec1, line.product.spec2].filter(Boolean).join(' ') || null,
    unit: line.product.unit || null,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    // 목록에서 담겨 오퍼가 없던 줄은 `base:` 가짜 오퍼다 — 서버에 그 id 를 보내지 않는다.
    offerId: line.offer.offerId.startsWith('base:') ? null : line.offer.offerId,
    supplierName: line.offer.supplierName,
  }
}

/** 로그인이 필요한 실패 — 장바구니가 로그인 문으로 안내할 수 있게 따로 가른다. */
export class LoginRequiredError extends Error {
  constructor() {
    super('주문하려면 씨마켓 계정으로 로그인해 주세요.')
    this.name = 'LoginRequiredError'
  }
}

/**
 * 서버가 답한 주문 실패. 4xx 는 확정된 거절(카드 거절·잔액 부족·규칙 위반 — 주문이 서지 않았거나
 * 접혔다)이고, 5xx 는 결과를 모르거나 결제가 진행 중이라는 뜻이다 — 결제 화면은 5xx 면 같은 주문 키를
 * 들고 있어야 한다.
 */
export class OrderSubmitError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** 서버가 붙인 사유 코드(예: 견적서를 쓸 수 없음). */
    public readonly code: string | null = null,
  ) {
    super(message)
    this.name = 'OrderSubmitError'
  }

  /** 주문이 서지 않았거나 접힌 것이 확실하다 — 다음 시도는 새 주문 키로. */
  get isDefinitive(): boolean {
    return this.status >= 400 && this.status < 500
  }
}

async function readPayload<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null
}

export async function placeOrder(input: {
  shipTo: OrderShipTo
  items: OrderLineInput[]
  clientOrderKey: string
  route: OrderRoute
  paymentMethod: PaymentMethod | null
  quoteNo: string | null
  /** 카드 결제면 결제창에서 고른 씨마켓 저장카드(+잠금 카드면 비밀번호). */
  payment: OrderPaymentInput | null
  shipping: number
}): Promise<PlacedOrder> {
  const response = await fetch('/api/shop/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (response.status === 401) throw new LoginRequiredError()

  const payload = await readPayload<{ order?: PlacedOrder; message?: string; code?: string }>(response)

  if (!response.ok || !payload?.order) {
    // 서버가 준 문구를 그대로 보여 준다 — 배송지 형식 오류·카드 거절·잔액 부족·연동 미설정처럼
    // 담당자가 읽고 움직일 수 있는 말이 여기 담긴다(세모 402/400/503 문구 그대로).
    throw new OrderSubmitError(
      payload?.message ?? '주문을 등록하지 못했습니다.',
      response.status,
      payload?.code ?? null,
    )
  }

  return payload.order
}

/** 결제창 재료 — 내 씨마켓 저장카드와 포인트 잔액. 실패 문구(연동 미설정 등)는 그대로 던진다. */
export async function fetchPaymentOptions(): Promise<PaymentOptions> {
  const response = await fetch('/api/shop/payment-options', { cache: 'no-store' })

  if (response.status === 401) throw new LoginRequiredError()

  const payload = await readPayload<PaymentOptions & { message?: string }>(response)
  if (!response.ok || !payload || !Array.isArray(payload.cards)) {
    throw new Error(payload?.message ?? '결제수단을 불러오지 못했습니다.')
  }
  return { cards: payload.cards, points: payload.points }
}

export async function cancelOrder(orderNo: string): Promise<StorefrontOrder> {
  const response = await fetch(`/api/shop/orders/${encodeURIComponent(orderNo)}/cancel`, {
    method: 'POST',
  })

  const payload = await readPayload<{ order?: StorefrontOrder; message?: string }>(response)

  if (!response.ok || !payload?.order) {
    throw new Error(payload?.message ?? '주문을 취소하지 못했습니다.')
  }

  return payload.order
}

/* ── 견적서 ──────────────────────────────────────────────────────── */

export type QuoteRequest =
  | {
      kind: 'CART'
      route: OrderRoute | null
      mode: CombinationMode
      items: { itemId: string; quantity: number; offerId: string | null }[]
    }
  | { kind: 'SUBSCRIPTION'; planKey: string; people: number; frequencyIndex: number }

export async function requestQuote(input: QuoteRequest): Promise<StorefrontQuote> {
  const response = await fetch('/api/shop/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (response.status === 401) throw new LoginRequiredError()

  const payload = await readPayload<{ quote?: StorefrontQuote; message?: string }>(response)
  if (!response.ok || !payload?.quote) {
    throw new Error(payload?.message ?? '견적서를 발급하지 못했습니다.')
  }
  return payload.quote
}

/* ── 배송지 기억 — cart.ts 와 같은 외부 스토어 ───────────────────────── */

const SHIP_TO_KEY = 'cpoint.shipTo'

export const EMPTY_SHIP_TO: OrderShipTo = { name: '', zip: '', address: '', tel: null }

/**
 * 마지막 배송지. 이 몰은 모두 개방이라 고정 사업장 목록이 없고 주문자가 직접 적는다 —
 * 그 값을 기억해 두면 두 번째 주문부터는 확인만 하면 된다.
 *
 * `useState`+effect 로 복원하면 setState-in-effect 가 되고, 초기값에서 바로 읽으면
 * 서버 렌더에 localStorage 가 없어 하이드레이션이 깨진다 — 그래서 `cart.ts` 와 같은
 * `useSyncExternalStore` 외부 스토어다. localStorage 가 막힌 환경(사파리 프라이빗
 * 등)에서는 이번 세션 동안만 유지된다.
 */
let shipToSnapshot: OrderShipTo = EMPTY_SHIP_TO
let shipToLoaded = false

const shipToListeners = new Set<() => void>()

function readShipToStorage(): OrderShipTo {
  try {
    const raw = window.localStorage.getItem(SHIP_TO_KEY)
    const parsed = raw ? (JSON.parse(raw) as OrderShipTo) : null
    if (!parsed || typeof parsed.name !== 'string' || typeof parsed.address !== 'string') {
      return EMPTY_SHIP_TO
    }
    return {
      name: parsed.name,
      zip: typeof parsed.zip === 'string' ? parsed.zip : '',
      address: parsed.address,
      tel: typeof parsed.tel === 'string' && parsed.tel ? parsed.tel : null,
    }
  } catch {
    return EMPTY_SHIP_TO
  }
}

export function subscribeShipTo(listener: () => void): () => void {
  shipToListeners.add(listener)
  return () => shipToListeners.delete(listener)
}

export function getShipToSnapshot(): OrderShipTo {
  if (!shipToLoaded) {
    shipToSnapshot = readShipToStorage()
    shipToLoaded = true
  }
  return shipToSnapshot
}

/** 서버 스냅샷은 매번 «같은» 참조여야 한다. 새 객체를 주면 무한 렌더가 된다. */
export function getShipToServerSnapshot(): OrderShipTo {
  return EMPTY_SHIP_TO
}

export function setShipTo(next: OrderShipTo): void {
  shipToSnapshot = next
  shipToLoaded = true
  try {
    window.localStorage.setItem(SHIP_TO_KEY, JSON.stringify(next))
  } catch {
    // 저장에 실패해도 화면 상태는 유지한다 — 주문은 그대로 진행된다.
  }
  shipToListeners.forEach(notify => notify())
}

/* ── 활성 견적서 — 장바구니에서 받아 결제 화면까지 들고 간다 ───────────── */

const QUOTE_KEY = 'cpoint.activeQuote'

let quoteSnapshot: StorefrontQuote | null = null
let quoteLoaded = false

const quoteListeners = new Set<() => void>()

function readQuoteStorage(): StorefrontQuote | null {
  try {
    const raw = window.localStorage.getItem(QUOTE_KEY)
    const parsed = raw ? (JSON.parse(raw) as StorefrontQuote) : null
    return parsed && typeof parsed.quoteNo === 'string' ? parsed : null
  } catch {
    return null
  }
}

export function subscribeActiveQuote(listener: () => void): () => void {
  quoteListeners.add(listener)
  return () => quoteListeners.delete(listener)
}

export function getActiveQuoteSnapshot(): StorefrontQuote | null {
  if (!quoteLoaded) {
    quoteSnapshot = readQuoteStorage()
    quoteLoaded = true
  }
  return quoteSnapshot
}

export function getActiveQuoteServerSnapshot(): StorefrontQuote | null {
  return null
}

export function setActiveQuote(quote: StorefrontQuote | null): void {
  quoteSnapshot = quote
  quoteLoaded = true
  try {
    if (quote) window.localStorage.setItem(QUOTE_KEY, JSON.stringify(quote))
    else window.localStorage.removeItem(QUOTE_KEY)
  } catch {
    // 저장 실패는 화면 상태에 영향이 없다.
  }
  quoteListeners.forEach(notify => notify())
}
