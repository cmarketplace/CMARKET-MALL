import {
  stubCancelOrder,
  stubGetOrder,
  stubListOrders,
  stubPlaceOrder,
  type StubOrderLine,
} from '@/lib/postpaid-mall-stub'
import { isSemoConfigured } from '@/lib/semo-api'
import {
  semoCancelOrder,
  semoCreateOrder,
  semoGetOrder,
  semoListOrders,
} from '@/lib/semo-orders'
import type {
  OrderListPage,
  OrderPaymentInput,
  OrderRoute,
  OrderShipTo,
  PaymentMethod,
  StorefrontOrder,
} from '@/lib/order-types'

export { PostpaidMallError as OrderError } from '@/lib/postpaid-mall-stub'

/**
 * 주문 — **세모 주문 파이프라인으로 가는 이음새.**
 *
 * `SEMO_API_BASE`/`SEMO_API_KEY` 가 채워진 환경에서는 세모가 정본이다:
 * 접수 → (안전결제면) 씨마켓 원장 등록·선불 결제 → 공급사 수락 → 배송 → 구매확정 → 정산.
 * **단가는 세모가 카탈로그(또는 견적서)에서 재확정한다** — 세모 모드에서는 화면 스냅샷
 * 단가를 보내지 않으며, 영수증은 서버 확정값만 그린다.
 *
 * 키가 없으면 로컬 스텁 원장이 같은 규칙으로 자리를 지킨다(개발·데모).
 */

export interface CreateOrderInput {
  memberId: string
  /** 결제 명의(소속 회원 id) — 직원 주문에만 채운다. 회원 주문은 null(`shop-member.ts` `semoPayerMemberId`). */
  payerMemberId: string | null
  shipTo: OrderShipTo
  lines: StubOrderLine[]
  clientOrderKey: string | null
  /** 씨마켓 안전결제 / 공급사 직접 구매 (`order-types.ts`) */
  route: OrderRoute
  paymentMethod: PaymentMethod | null
  quoteNo: string | null
  /** 카드 결제 입력(결제창에서 고른 씨마켓 저장카드). 카드가 아니면 null. */
  payment: OrderPaymentInput | null
  /** 배송비 합 — 스텁이 화면 스냅샷을 믿는 값. 세모 모드에서는 보내지 않는다. */
  shipping: number
}

export async function createOrder(input: CreateOrderInput): Promise<StorefrontOrder> {
  if (isSemoConfigured()) {
    return semoCreateOrder({
      memberId: input.memberId,
      payerMemberId: input.payerMemberId,
      shipTo: input.shipTo,
      lines: input.lines.map(line => ({
        itemId: line.itemId,
        quantity: line.quantity,
        offerId: line.offerId,
      })),
      clientOrderKey: input.clientOrderKey,
      route: input.route,
      paymentMethod: input.paymentMethod,
      quoteNo: input.quoteNo,
      payment: input.payment,
    })
  }
  return stubPlaceOrder(input)
}

export async function listOrders(memberId: string): Promise<OrderListPage> {
  if (isSemoConfigured()) return semoListOrders(memberId)
  const orders = stubListOrders(memberId)
  return { orders, total: orders.length }
}

export async function getOrder(memberId: string, orderNo: string): Promise<StorefrontOrder> {
  if (isSemoConfigured()) return semoGetOrder(memberId, orderNo)
  return stubGetOrder(memberId, orderNo)
}

export async function cancelOrder(memberId: string, orderNo: string): Promise<StorefrontOrder> {
  if (isSemoConfigured()) return semoCancelOrder(memberId, orderNo)
  return stubCancelOrder(memberId, orderNo)
}
