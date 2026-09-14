import type {
  CustomerType,
  DealType,
  OrderListPage,
  OrderPaymentInput,
  OrderRoute,
  OrderStatus,
  PaymentMethod,
  StorefrontOrder,
} from '@/lib/order-types'
import { PostpaidMallError } from '@/lib/postpaid-mall-stub'
import { resolveSemoApi, storefrontUrl } from '@/lib/semo-api'
import { fetchItemOffers } from '@/lib/semo-feed'

/**
 * 세모 주문 클라이언트 — `orders.ts` 가 세모 모드에서 위임하는 곳.
 *
 * 세모 쪽 실체: `POST /external/storefronts/{slug}/orders` — 주문자(`employeeNo` = 씨마켓 sub)의
 * 역할로 고객 유형·거래 형태·결제 규칙을 세모가 판정하고, 안전결제(SAFE)면 **같은 요청 안에서**
 * 씨마켓 원장에 등록하고 선불(카드·포인트)을 승인한다. 결제가 거절되면 주문은 남지 않고
 * 402/400 으로 사유가 온다(카드 거절·잔액 부족), 씨마켓 연동이 안 된 환경은 503 이다.
 *
 * 몰이 보내는 것은 «누가·무엇을 몇 개·어느 오퍼로·어느 경로·어느 수단·어느 견적서로» 뿐이다.
 * 단가는 보내지 않는다 — 카탈로그(또는 견적서 잠금)가 재확정한다.
 *
 * **모르는 필드는 세모가 버린다(whitelist, 거절 아님).** 그래서 확장 필드를 게이트 없이 항상
 * 보낸다. 다만 세모가 이 필드를 *읽기* 시작한 버전(작업판 물결 1~2, `feat/mall-open-orderer`)
 * 보다 몰이 먼저 나가면 경로·오퍼 지정이 조용히 무시된 채 주문이 선다 — **배포는 세모 먼저,
 * 몰 나중**(README 참고).
 *
 * 응답은 `{success, data, message}` 봉투다. 4xx 의 message 는 담당자가 고칠 수 있는
 * 말(품절·잔액 부족·카드 거절 등)이라 그대로 전달한다. 검증 실패(400)는 배열로 올 수 있다.
 */

const UPSTREAM_TIMEOUT_MS = 20_000

interface SemoEnvelope<T> {
  success?: boolean
  data?: T
  message?: string | string[]
}

async function semoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const config = resolveSemoApi()

  const response = await fetch(storefrontUrl(config, path), {
    ...init,
    headers: {
      'X-API-Key': config.apiKey,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as SemoEnvelope<T> | null

  if (!response.ok || payload?.success === false || payload?.data === undefined) {
    const raw = payload?.message
    const message = Array.isArray(raw) ? raw.join(' ') : raw
    throw new PostpaidMallError(
      response.status >= 400 ? response.status : 502,
      message || `세모 응답 오류 (${response.status})`,
    )
  }

  return payload.data
}

/** 세모 `StorefrontOrderDto`. 종전 몰(KCL) 주문은 씨마켓몰 칸이 null 이다. */
interface SemoOrderPayload {
  orderNo: string
  status: string
  employeeNo: string | null
  customerType?: CustomerType | null
  dealType?: DealType | null
  route?: OrderRoute | null
  paymentMethod?: PaymentMethod | null
  quoteNo?: string | null
  totalShipping?: number | null
  supplierCount?: number | null
  shipToName: string
  shipToZip: string
  shipToAddress: string
  shipToTel: string | null
  totalSupply: number
  totalVat: number
  totalPayable: number
  canceledAt: string | null
  createdAt: string
  items: {
    seq: number
    itemId: string
    name: string
    spec: string | null
    unit: string | null
    quantity: number
    salePrice: number
    /** 세모 어휘. 몰 안에서는 `offerId` 다. */
    offeringId?: string | null
    supplierName?: string | null
  }[]
}

function toMallOrder(order: SemoOrderPayload): StorefrontOrder {
  const items = order.items.map(item => ({
    seq: item.seq,
    itemId: item.itemId,
    name: item.name,
    spec: item.spec,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.salePrice,
    offerId: item.offeringId ?? null,
    supplierName: item.supplierName ?? null,
  }))
  // 세모 주문 응답에는 공급사가 없다 — 우선 오퍼 단위로 센다(상한). 정확한 값은 `withSuppliers` 가
  // 피드에서 오퍼→공급사를 풀어 다시 센다. 배송비는 세모 카탈로그에 없어 0.
  const supplierCount =
    order.supplierCount ??
    new Set(items.map(item => item.supplierName ?? item.offerId ?? item.itemId)).size

  return {
    orderNo: order.orderNo,
    status: order.status as OrderStatus,
    memberId: order.employeeNo ?? '',
    customerType: order.customerType ?? null,
    dealType: order.dealType ?? null,
    route: order.route ?? 'SAFE',
    paymentMethod: order.paymentMethod ?? null,
    quoteNo: order.quoteNo ?? null,
    totalShipping: order.totalShipping ?? 0,
    supplierCount,
    shipToName: order.shipToName,
    shipToZip: order.shipToZip,
    shipToAddress: order.shipToAddress,
    shipToTel: order.shipToTel,
    totalSupply: order.totalSupply,
    totalVat: order.totalVat,
    totalPayable: order.totalPayable,
    canceledAt: order.canceledAt,
    createdAt: order.createdAt,
    items,
  }
}

/** 피드에서 풀 수 있는 품목 수 상한 — 장바구니·북마크 조회(`fetchProductsByIds`)와 같은 값. */
const SUPPLIER_LOOKUP_LIMIT = 60

/**
 * 주문 줄의 오퍼 → 공급사 실명·수. 세모 주문 DTO 에는 공급사가 없어서 피드(품목별 오퍼, 5분 캐시)로 푼다.
 *
 * 발주기관 주문만 — 공급기업(씨마켓 구매대행) 주문은 계약 상대가 씨마켓 한 곳이고 실제 공급사는
 * 그 손님에게 가리는 정보라 «1곳» 으로 둔다. 피드가 죽으면 상한(오퍼 수)을 그대로 둔다 — 영수증이
 * 공급사 수 하나 때문에 안 열리면 담당자는 «주문이 안 됐다» 로 읽는다.
 */
async function withSuppliers(orders: StorefrontOrder[]): Promise<StorefrontOrder[]> {
  const lookup = orders.filter(
    order => order.customerType !== 'COMPANY' && order.items.some(item => item.offerId && !item.supplierName),
  )
  const itemIds = [...new Set(lookup.flatMap(order => order.items.map(item => item.itemId)))].slice(
    0,
    SUPPLIER_LOOKUP_LIMIT,
  )

  const supplierByOffer = new Map<string, { id: string | null; name: string | null }>()
  await Promise.all(
    itemIds.map(async itemId => {
      try {
        for (const offer of await fetchItemOffers(itemId)) {
          supplierByOffer.set(offer.offerId, { id: offer.supplierId, name: offer.supplierName })
        }
      } catch {
        // 피드 실패 — 이 품목의 줄은 오퍼 단위 상한으로 남는다.
      }
    }),
  )

  return orders.map(order => {
    if (order.customerType === 'COMPANY') return { ...order, supplierCount: 1 }
    if (supplierByOffer.size === 0) return order

    const items = order.items.map(item => {
      const supplier = item.offerId ? supplierByOffer.get(item.offerId) : undefined
      return supplier ? { ...item, supplierName: item.supplierName ?? supplier.name } : item
    })
    const keys = items.map(
      item =>
        (item.offerId ? supplierByOffer.get(item.offerId)?.id : null) ??
        item.supplierName ??
        item.offerId ??
        item.itemId,
    )
    return { ...order, items, supplierCount: new Set(keys).size }
  })
}

export async function semoCreateOrder(input: {
  memberId: string
  shipTo: { name: string; zip: string; address: string; tel: string | null }
  /** 세모는 품목·오퍼·수량만 받는다 — 단가는 카탈로그(또는 견적서)가 재확정한다. */
  lines: { itemId: string; quantity: number; offerId: string | null }[]
  clientOrderKey: string | null
  route: OrderRoute
  paymentMethod: PaymentMethod | null
  quoteNo: string | null
  payment: OrderPaymentInput | null
}): Promise<StorefrontOrder> {
  const order = await semoFetch<SemoOrderPayload>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      employeeNo: input.memberId,
      shipTo: {
        name: input.shipTo.name,
        zip: input.shipTo.zip,
        address: input.shipTo.address,
        ...(input.shipTo.tel ? { tel: input.shipTo.tel } : {}),
      },
      items: input.lines.map(line => ({
        itemId: line.itemId,
        quantity: line.quantity,
        // 세모 주문 DTO 의 이름은 `offeringId`(견적 DTO 는 `offerId` — 둘이 다르다).
        ...(line.offerId ? { offeringId: line.offerId } : {}),
      })),
      ...(input.clientOrderKey ? { clientOrderKey: input.clientOrderKey } : {}),
      route: input.route,
      ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
      ...(input.quoteNo ? { quoteNo: input.quoteNo } : {}),
      ...(input.payment
        ? {
            payment: {
              cardId: input.payment.cardId,
              ...(input.payment.cardPassword ? { cardPassword: input.payment.cardPassword } : {}),
            },
          }
        : {}),
    }),
  })
  const [mall] = await withSuppliers([toMallOrder(order)])
  return mall
}

export async function semoListOrders(memberId: string): Promise<OrderListPage> {
  const page = await semoFetch<{ orders: SemoOrderPayload[]; total: number }>(
    `/orders?employeeNo=${encodeURIComponent(memberId)}&limit=50`,
  )
  return { orders: await withSuppliers(page.orders.map(toMallOrder)), total: page.total }
}

/**
 * 주문 1건 — **소유 검증은 몰의 몫이다.** 세모 조회는 몰 단위라 주문번호만 맞으면
 * 돌려준다. 남의 주문은 «없는 주문»(404)으로 접는다 — 403 은 존재를 알려 준다.
 */
export async function semoGetOrder(memberId: string, orderNo: string): Promise<StorefrontOrder> {
  const order = await semoFetch<SemoOrderPayload>(`/orders/${encodeURIComponent(orderNo)}`)
  if ((order.employeeNo ?? '') !== memberId) {
    throw new PostpaidMallError(404, '주문을 찾을 수 없습니다.')
  }
  const [mall] = await withSuppliers([toMallOrder(order)])
  return mall
}

/**
 * 취소 — 접수(PLACED)·공급사 수락 대기(MATCHED)까지. 안전결제 선불이면 세모가 취소 직후
 * 씨마켓 승인 취소·포인트 반환까지 한다(몰은 부르기만 한다).
 */
export async function semoCancelOrder(memberId: string, orderNo: string): Promise<StorefrontOrder> {
  // 취소 전에 소유를 확인한다 — 세모 취소 API 는 몰 단위라, 이 확인이 없으면
  // 주문번호를 추측한 사람이 남의 주문을 닫을 수 있다.
  await semoGetOrder(memberId, orderNo)

  const order = await semoFetch<SemoOrderPayload>(
    `/orders/${encodeURIComponent(orderNo)}/cancel`,
    { method: 'POST', body: JSON.stringify({ reason: '손님 취소(씨마켓몰)' }) },
  )
  const [mall] = await withSuppliers([toMallOrder(order)])
  return mall
}
