import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { calculateCartAmounts } from '@/lib/cart-amounts'
import {
  allowedPaymentMethods,
  CANCELABLE_STATUSES,
  type CustomerType,
  type DealType,
  type OrderItem,
  type OrderPaymentInput,
  type OrderRoute,
  type OrderShipTo,
  type PaymentMethod,
  type PaymentOptions,
  type StorefrontOrder,
} from '@/lib/order-types'

/**
 * 몰 스텁 주문 원장 — **세모 키가 없는 로컬·데모의 임시 뼈대다. 정본이 아니다.**
 *
 * 실제 주문의 정본은 세모 주문 파이프라인(`/external/storefronts/{slug}/orders`)이다:
 * 접수 → 씨마켓 등록·선불 결제 → 공급사 수락 → 배송 → 구매확정 → 정산.
 * 이 스텁은 그 파이프라인이 **거절하는 것을 같은 사유로 거절**하고(고객 유형별 결제 규칙,
 * 카드 거절, 잔액 부족), 받는 것은 같은 모양으로 남긴다 — 그래야 키 없이 눌러 본 화면이
 * 실연동에서 다르게 움직이지 않는다.
 *
 * 지키는 것: 멱등(같은 클릭 = 주문 한 건)·소유(내 주문만 보인다)·규칙(세모와 같은 표).
 *
 * 저장: `var/postpaid-mall-stub.json` (.gitignore). 로컬 dev 에서는 재시작에도 남고,
 * 파일을 못 쓰는 환경에서는 메모리로만 돈다 — 그 환경에 갈 때는 이미 실연동이어야 한다.
 */

interface StubState {
  version: 1
  orders: StorefrontOrder[]
  /** clientOrderKey → orderNo. 재시도 멱등성의 축. */
  orderKeys: Record<string, string>
  orderSeq: number
}

export class PostpaidMallError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'PostpaidMallError'
  }
}

const STORE_PATH = path.join(process.cwd(), 'var', 'postpaid-mall-stub.json')

/** dev 서버의 HMR 이 모듈을 다시 평가해도 상태가 살아남게 globalThis 에 둔다. */
const globalStore = globalThis as unknown as { __postpaidMallStub?: StubState }

/**
 * 경로·공급사·고객 유형 축이 생기기 전에 저장된 주문을 지금 모양으로 맞춘다.
 * 옛 주문은 전부 «안전결제·배송비 0·공급사 1곳·발주기관» 으로 읽는다 — 그때는 그 축이 없었다.
 */
function normalizeOrder(order: StorefrontOrder): StorefrontOrder {
  return {
    ...order,
    customerType: order.customerType ?? null,
    dealType: order.dealType ?? null,
    route: order.route ?? 'SAFE',
    paymentMethod: order.paymentMethod ?? null,
    quoteNo: order.quoteNo ?? null,
    totalShipping: order.totalShipping ?? 0,
    supplierCount: order.supplierCount ?? 1,
    items: order.items.map(item => ({
      ...item,
      offerId: item.offerId ?? null,
      supplierName: item.supplierName ?? null,
    })),
  }
}

function loadState(): StubState {
  if (globalStore.__postpaidMallStub) return globalStore.__postpaidMallStub

  let state: StubState = { version: 1, orders: [], orderKeys: {}, orderSeq: 0 }
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as StubState
    if (parsed?.version === 1) {
      state = { ...parsed, orders: parsed.orders.map(normalizeOrder) }
    }
  } catch {
    // 첫 실행(파일 없음)이거나 손으로 고치다 깨진 경우 — 빈 원장에서 다시 시작한다.
  }

  globalStore.__postpaidMallStub = state
  return state
}

function saveState(state: StubState): void {
  globalStore.__postpaidMallStub = state
  try {
    mkdirSync(path.dirname(STORE_PATH), { recursive: true })
    writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf8')
  } catch {
    // 파일을 못 쓰는 환경(서버리스)에서는 메모리로만 유지한다.
  }
}

/** KST 벽시계 날짜 8자리 — 서버가 UTC 여도 주문일은 한국 날짜여야 한다. */
function kstDateStamp(): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replace(/\D/g, '')
}

/* ── 세모와 같은 판정: 주문자 키 → 고객 유형 ─────────────────────────── */

/** 씨마켓 sub(«역할:그룹코드:회원ID»)의 역할. 세모 `parseCmarketSub` 와 같은 규칙. */
function roleOf(memberKey: string): string {
  const first = memberKey.indexOf(':')
  return first > 0 ? memberKey.slice(0, first) : ''
}

/** sub 의 회원/사번 id(두 번째 `:` 뒤). 모양이 아니면 빈 문자열. */
function memberIdOf(memberKey: string): string {
  const second = memberKey.indexOf(':', memberKey.indexOf(':') + 1)
  return second > 0 ? memberKey.slice(second + 1) : ''
}

/**
 * 공급사(SUPPLIER)와 직원(EMPLOYEE)은 공급기업 규칙이다 — 직원은 2026-09-16 대표 결정(기관이 아니므로 기업과
 * 같이 선불만). 몰의 `customerTypeOf` 와 같은 표이고, 역할을 못 읽는 옛 키만 예전처럼 발주기관으로 둔다.
 */
export function stubCustomerType(memberKey: string): CustomerType {
  const role = roleOf(memberKey)
  return role === 'SUPPLIER' || role === 'EMPLOYEE' ? 'COMPANY' : 'INSTITUTION'
}

/**
 * 결제 명의 — 세모와 같은 판정. 직원은 카드·포인트가 회원 단위라 **소속 회원 id 가 반드시** 있어야 하고,
 * 회원은 보내지 않거나 자기 id 여야 한다. 둘 다 400(몰 라우트가 직원의 빈 소속을 403 으로 먼저 막는다).
 */
function assertPayer(memberKey: string, payerMemberId: string | null): void {
  if (roleOf(memberKey) === 'EMPLOYEE') {
    if (!payerMemberId) {
      throw new PostpaidMallError(400, '직원 계정의 결제에는 소속 회원(payerMemberId)이 필요합니다.')
    }
    return
  }
  if (payerMemberId && payerMemberId !== memberIdOf(memberKey)) {
    throw new PostpaidMallError(400, '결제 회원(payerMemberId)이 주문자 회원과 다릅니다.')
  }
}

/* ── 결제수단 스텁 — 예시 카드 두 장(하나는 거절·비밀번호 잠금)과 잔액 ─────── */

/** 스텁에서 «카드사 거절» 을 재현하는 카드. 세모 로컬 검증의 가짜 씨마켓과 같은 번호다. */
const STUB_DECLINED_CARD_ID = 99
const STUB_CARD_PASSWORD = '123456'
const STUB_POINT_BALANCE = 105_000

export function stubPaymentOptions(memberKey: string, payerMemberId: string | null): PaymentOptions {
  assertPayer(memberKey, payerMemberId)
  const company = stubCustomerType(memberKey) === 'COMPANY'
  return {
    cards: [
      { id: 12, cardNickname: '법인 신한 (예시)', maskedCardNumber: '5432-****-****-1234', requiresPassword: false },
      {
        id: STUB_DECLINED_CARD_ID,
        cardNickname: '거절 카드 (예시 · 비밀번호 123456)',
        maskedCardNumber: '9999-****-****-0000',
        requiresPassword: true,
      },
    ],
    points: {
      balance: STUB_POINT_BALANCE,
      bonusBalance: company ? 5_000 : 0,
      paidBalance: company ? 100_000 : STUB_POINT_BALANCE,
      settlementBalance: 0,
    },
  }
}

/* ── 주문 ────────────────────────────────────────────────────────────── */

export interface StubOrderLine {
  itemId: string
  name: string
  spec: string | null
  unit: string | null
  quantity: number
  /** 공급가액 단가 — 스텁은 화면 스냅샷을 믿는다. 세모 연동 시 카탈로그가 재확정한다. */
  unitPrice: number
  offerId: string | null
  supplierName: string | null
}

export function stubPlaceOrder(input: {
  memberId: string
  payerMemberId: string | null
  shipTo: OrderShipTo
  lines: StubOrderLine[]
  clientOrderKey: string | null
  route: OrderRoute
  paymentMethod: PaymentMethod | null
  quoteNo: string | null
  payment: OrderPaymentInput | null
  shipping: number
}): StorefrontOrder {
  const state = loadState()

  // 멱등 — 같은 클릭의 재시도는 이미 선 주문을 돌려준다.
  if (input.clientOrderKey) {
    const existingNo = state.orderKeys[input.clientOrderKey]
    const existing = existingNo ? state.orders.find(order => order.orderNo === existingNo) : null
    if (existing) return existing
  }

  // 세모 `resolveOpenMallOrderTerms` 와 같은 판정 — 화면이 막았어도 서버가 한 번 더 본다.
  assertPayer(input.memberId, input.payerMemberId)
  const customerType = stubCustomerType(input.memberId)
  const dealType: DealType = customerType === 'COMPANY' ? 'CMARKET_AGENCY' : 'SUPPLIER_DIRECT'
  if (customerType === 'COMPANY' && input.route !== 'SAFE') {
    throw new PostpaidMallError(
      400,
      '공급기업·씨마켓 직원 주문은 씨마켓 구매대행(안전결제)으로만 받습니다 — 직접구매는 발주기관만 고를 수 있습니다.',
    )
  }
  const paymentMethod: PaymentMethod =
    input.route === 'DIRECT' ? 'TAX_INVOICE' : (input.paymentMethod ?? 'TAX_INVOICE')
  if (!allowedPaymentMethods(customerType, input.route).includes(paymentMethod)) {
    throw new PostpaidMallError(
      400,
      customerType === 'COMPANY'
        ? '공급기업·씨마켓 직원 주문은 카드 또는 포인트 선불로만 결제할 수 있습니다(후불 불가).'
        : '직접구매는 공급사별 세금계산서 후불입니다 — 카드·포인트 결제는 안전결제에서 고르세요.',
    )
  }

  const amounts = calculateCartAmounts(
    input.lines.map(line => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
    { shipping: input.shipping },
  )

  // 선불 — 세모+씨마켓이 거절하는 경우를 같은 상태코드·문구로 재현한다. 주문은 남지 않는다.
  if (paymentMethod === 'CARD') {
    if (!input.payment?.cardId) {
      throw new PostpaidMallError(
        400,
        '카드 결제에는 payment.cardId(씨마켓 저장카드 id)가 필요합니다 — 결제수단 조회(payment-options)에서 고르세요.',
      )
    }
    const card = stubPaymentOptions(input.memberId, input.payerMemberId).cards.find(
      row => row.id === input.payment?.cardId,
    )
    if (!card) throw new PostpaidMallError(400, '결제가 완료되지 않았습니다: 카드를 찾을 수 없어요.')
    if (card.requiresPassword && input.payment.cardPassword !== STUB_CARD_PASSWORD) {
      throw new PostpaidMallError(400, '결제가 완료되지 않았습니다: 결제 확인 비밀번호가 맞지 않아요.')
    }
    if (card.id === STUB_DECLINED_CARD_ID) {
      throw new PostpaidMallError(402, '결제가 완료되지 않았습니다: 결제가 거절됐어요: 8327 은행잔액부족')
    }
  }
  if (paymentMethod === 'POINT' && amounts.total > STUB_POINT_BALANCE) {
    throw new PostpaidMallError(
      402,
      `포인트 잔액이 부족합니다(결제액 ${amounts.total.toLocaleString('ko-KR')}원). 충전하거나 카드로 결제해 주세요.`,
    )
  }

  // 공급기업은 오퍼를 고르지 않는다 — 세모가 최저가로 확정한다(D5). 스텁은 지정을 지우기만 한다.
  const lines =
    customerType === 'COMPANY'
      ? input.lines.map(line => ({ ...line, offerId: null, supplierName: null }))
      : input.lines

  const supplierCount = new Set(
    lines.map(line => line.supplierName ?? line.offerId ?? line.itemId),
  ).size

  state.orderSeq += 1
  const orderNo = `CP${kstDateStamp()}-${String(state.orderSeq).padStart(4, '0')}`

  const items: OrderItem[] = lines.map((line, index) => ({
    seq: index + 1,
    itemId: line.itemId,
    name: line.name,
    spec: line.spec,
    unit: line.unit,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    offerId: line.offerId,
    supplierName: line.supplierName,
  }))

  const order: StorefrontOrder = {
    orderNo,
    // 자동매칭 몰과 같이 접수 직후 공급사에게 전달된다.
    status: 'MATCHED',
    memberId: input.memberId,
    customerType,
    dealType,
    route: input.route,
    paymentMethod,
    quoteNo: input.quoteNo,
    shipToName: input.shipTo.name,
    shipToZip: input.shipTo.zip,
    shipToAddress: input.shipTo.address,
    shipToTel: input.shipTo.tel,
    totalSupply: amounts.supply,
    totalShipping: amounts.shipping,
    totalVat: amounts.vat,
    totalPayable: amounts.total,
    supplierCount,
    canceledAt: null,
    createdAt: new Date().toISOString(),
    items,
  }

  state.orders.push(order)
  if (input.clientOrderKey) state.orderKeys[input.clientOrderKey] = orderNo

  saveState(state)
  return order
}

export function stubListOrders(memberId: string): StorefrontOrder[] {
  return loadState()
    .orders.filter(order => order.memberId === memberId)
    .reverse()
}

/** 남의 주문은 «없는 주문» 이다 — 403 은 그 번호가 존재한다는 것을 알려 준다(KCL 교훈). */
export function stubGetOrder(memberId: string, orderNo: string): StorefrontOrder {
  const order = loadState().orders.find(
    row => row.orderNo === orderNo && row.memberId === memberId,
  )
  if (!order) throw new PostpaidMallError(404, '주문을 찾을 수 없습니다.')
  return order
}

export function stubCancelOrder(memberId: string, orderNo: string): StorefrontOrder {
  const state = loadState()
  const order = state.orders.find(row => row.orderNo === orderNo && row.memberId === memberId)
  if (!order) throw new PostpaidMallError(404, '주문을 찾을 수 없습니다.')

  if (order.status === 'CANCELED') return order // 취소의 재시도도 멱등이다

  if (!CANCELABLE_STATUSES.includes(order.status)) {
    throw new PostpaidMallError(
      409,
      '공급사가 주문을 수락해 화면에서 취소할 수 없습니다. 관리자에게 문의해 주세요.',
    )
  }

  // 선불이면 실연동에서는 세모가 승인 취소·포인트 반환까지 한다 — 스텁은 상태만 닫는다.
  order.status = 'CANCELED'
  order.canceledAt = new Date().toISOString()

  saveState(state)
  return order
}
