import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/lib/api-errors'
import { createOrder, listOrders, OrderError } from '@/lib/orders'
import { getShopMember } from '@/lib/shop-member'
import {
  allowedPaymentMethods,
  type CustomerType,
  type OrderPaymentInput,
  type OrderRoute,
  type OrderShipTo,
  type PaymentMethod,
} from '@/lib/order-types'
import type { StubOrderLine } from '@/lib/postpaid-mall-stub'
import { isQuoteValid } from '@/lib/quote-types'
import { getQuote } from '@/lib/quotes'

/**
 * 몰 주문 — 브라우저와 원장 사이의 유일한 통로.
 *
 *   1) **주문자** — 요청 본문이 아니라 **세션**에서. 주문은 계약·결제의 당사자가
 *      필요해서 익명일 수 없다(로그인 없으면 401). 세션의 등급이 곧 고객 유형이다:
 *      발주기관(FULL) / 공급기업(RESTRICTED).
 *   2) **배송지** — 이 몰은 모두 개방이라 고정 사업장 목록이 없다. 주문자가 적은
 *      주소를 받되 서버가 모양을 검증한다.
 *   3) **금액** — 스텁 단계에서는 화면 스냅샷 단가·배송비를 받아 서버가 합산하고,
 *      세모 연동 후에는 단가 자체를 받지 않는다(카탈로그·견적서가 재확정).
 *   4) **경로·결제수단** — 세모 규칙(`order-types.ts` `allowedPaymentMethods`)을 여기서
 *      먼저 거른다. 공급기업은 안전결제 + 카드·포인트 선불만, 직접 구매는 후불만. 서버(세모)가
 *      최종 판정이지만, 여기서 같은 문구로 400 을 내면 «화면은 막았는데 API 는 통과» 가 없다.
 *   5) **카드 결제 입력** — 결제창에서 고른 씨마켓 저장카드 id(+잠금 카드면 비밀번호 6자리).
 *      몰은 저장·로그하지 않고 세모로 넘긴다.
 *   6) **견적서** — 견적번호가 오면 내 견적서인지·유효기간 안인지 확인한다. 세모가 그
 *      견적서의 오퍼·단가로 잠근다(품목·수량이 다르면 세모가 400).
 */

/** 한 번에 담을 수 있는 줄 수. 세모 주문 DTO 상한과 같은 값이다. */
const MAX_LINES = 200

interface OrderRequestBody {
  shipTo?: unknown
  items?: unknown
  clientOrderKey?: unknown
  route?: unknown
  paymentMethod?: unknown
  quoteNo?: unknown
  payment?: unknown
  shipping?: unknown
}

/** 본문의 품목 배열을 신뢰할 수 있는 모양으로 좁힌다. 한 줄이라도 깨졌으면 전체 거절. */
function parseLines(raw: unknown): StubOrderLine[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_LINES) return null

  const lines: StubOrderLine[] = []
  for (const entry of raw) {
    const line = entry as {
      itemId?: unknown
      name?: unknown
      spec?: unknown
      unit?: unknown
      quantity?: unknown
      unitPrice?: unknown
      offerId?: unknown
      supplierName?: unknown
    }

    const itemId = typeof line.itemId === 'string' ? line.itemId.trim() : ''
    const name = typeof line.name === 'string' ? line.name.trim() : ''
    const quantity = Number(line.quantity)
    const unitPrice = Number(line.unitPrice)

    if (!itemId || !name) return null
    if (!Number.isInteger(quantity) || quantity < 1) return null
    if (!Number.isInteger(unitPrice) || unitPrice < 1) return null

    lines.push({
      itemId,
      name,
      spec: typeof line.spec === 'string' && line.spec ? line.spec : null,
      unit: typeof line.unit === 'string' && line.unit ? line.unit : null,
      quantity,
      unitPrice,
      offerId: typeof line.offerId === 'string' && line.offerId ? line.offerId : null,
      supplierName:
        typeof line.supplierName === 'string' && line.supplierName ? line.supplierName : null,
    })
  }
  return lines
}

/**
 * 배송지 검증 — 형식은 느슨하게, 빈 값은 엄격하게.
 *
 * 우편번호 5자리·주소 5자 이상만 본다. 더 조이면(도로명 사전 대조 등) 정당한 주소가
 * 막히고, 덜 조이면 빈 종이가 나간다 — 배송지가 비어 있는 주문이 최악이다.
 */
function parseShipTo(raw: unknown): OrderShipTo | string {
  const value = raw as
    | { name?: unknown; zip?: unknown; address?: unknown; tel?: unknown }
    | undefined

  const name = typeof value?.name === 'string' ? value.name.trim() : ''
  const zip = typeof value?.zip === 'string' ? value.zip.trim() : ''
  const address = typeof value?.address === 'string' ? value.address.trim() : ''
  const tel = typeof value?.tel === 'string' ? value.tel.trim() : ''

  if (!name || name.length > 60) return '받는 곳 이름을 확인해 주세요(1~60자).'
  if (!/^\d{5}$/.test(zip)) return '우편번호는 숫자 5자리입니다.'
  if (address.length < 5 || address.length > 200) return '주소를 확인해 주세요(5자 이상).'
  if (tel && !/^[\d\-+() ]{7,20}$/.test(tel)) return '연락처 형식을 확인해 주세요.'

  return { name, zip, address, tel: tel || null }
}

function parseRoute(raw: unknown): OrderRoute {
  return raw === 'DIRECT' ? 'DIRECT' : 'SAFE'
}

function parsePaymentMethod(raw: unknown): PaymentMethod | null {
  return raw === 'CARD' || raw === 'POINT' || raw === 'TAX_INVOICE' ? raw : null
}

/** 카드 입력 — id 는 양의 정수, 비밀번호는 숫자 6자리(세모 DTO 와 같은 검증). 모양이 아니면 문구를 돌려준다. */
function parsePayment(raw: unknown): OrderPaymentInput | null | string {
  if (raw === undefined || raw === null) return null
  const value = raw as { cardId?: unknown; cardPassword?: unknown }
  const cardId = Number(value.cardId)
  if (!Number.isInteger(cardId) || cardId < 1) return '결제할 카드를 골라 주세요.'
  const password = typeof value.cardPassword === 'string' ? value.cardPassword.trim() : ''
  if (password && !/^\d{6}$/.test(password)) return '결제 확인 비밀번호는 숫자 6자리입니다.'
  return { cardId, ...(password ? { cardPassword: password } : {}) }
}

/**
 * 세모 `resolveOpenMallOrderTerms` 와 같은 표로 경로·결제수단을 확정한다.
 * 규칙 밖의 조합은 세모가 내는 것과 같은 문구로 400 — 화면이 오래된 탭이어도 말이 같다.
 */
function resolveTerms(
  customerType: CustomerType,
  rawRoute: unknown,
  rawMethod: unknown,
): { route: OrderRoute; paymentMethod: PaymentMethod } | string {
  const requestedRoute = parseRoute(rawRoute)
  const requested = parsePaymentMethod(rawMethod)

  if (customerType === 'COMPANY') {
    if (requestedRoute !== 'SAFE') {
      return '공급기업 주문은 씨마켓 구매대행(안전결제)으로만 받습니다 — 직접구매는 발주기관만 고를 수 있습니다.'
    }
    if (requested !== 'CARD' && requested !== 'POINT') {
      return '공급기업 주문은 카드 또는 포인트 선불로만 결제할 수 있습니다(후불 불가).'
    }
    return { route: 'SAFE', paymentMethod: requested }
  }

  if (requestedRoute === 'DIRECT') {
    if (requested && requested !== 'TAX_INVOICE') {
      return '직접구매는 공급사별 세금계산서 후불입니다 — 카드·포인트 결제는 안전결제에서 고르세요.'
    }
    return { route: 'DIRECT', paymentMethod: 'TAX_INVOICE' }
  }

  // 발주기관이 결제수단을 안 보내면 후불 — 기관 구매의 기본값이자 화면의 기본 선택.
  const paymentMethod = requested ?? 'TAX_INVOICE'
  if (!allowedPaymentMethods(customerType, 'SAFE').includes(paymentMethod)) {
    return '고를 수 없는 결제수단입니다.'
  }
  return { route: 'SAFE', paymentMethod }
}

export async function POST(request: Request) {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json(
      { message: '주문하려면 씨마켓 계정으로 로그인해 주세요.' },
      { status: 401 },
    )
  }

  let body: OrderRequestBody
  try {
    body = (await request.json()) as OrderRequestBody
  } catch {
    return NextResponse.json({ message: '요청 본문을 읽지 못했습니다.' }, { status: 400 })
  }

  const lines = parseLines(body.items)
  if (!lines) {
    return NextResponse.json(
      { message: `주문 품목이 올바르지 않습니다(1~${MAX_LINES}줄, 수량은 1 이상).` },
      { status: 400 },
    )
  }

  const shipTo = parseShipTo(body.shipTo)
  if (typeof shipTo === 'string') {
    return NextResponse.json({ message: shipTo }, { status: 400 })
  }

  // 발주기관(FULL) / 공급기업(RESTRICTED) — 세션 등급이 곧 고객 유형이다.
  const customerType: CustomerType = member.tier === 'FULL' ? 'INSTITUTION' : 'COMPANY'
  const terms = resolveTerms(customerType, body.route, body.paymentMethod)
  if (typeof terms === 'string') {
    return NextResponse.json({ message: terms }, { status: 400 })
  }
  const { route, paymentMethod } = terms

  // 공급기업 주문은 공급사를 고르지 않는다(세모가 최저가로 확정) — 이름·오퍼 지정을 지운다.
  if (customerType === 'COMPANY') {
    for (const line of lines) {
      line.supplierName = null
      line.offerId = null
    }
  }

  const payment = paymentMethod === 'CARD' ? parsePayment(body.payment) : null
  if (typeof payment === 'string') {
    return NextResponse.json({ message: payment }, { status: 400 })
  }
  if (paymentMethod === 'CARD' && !payment) {
    return NextResponse.json({ message: '결제할 카드를 골라 주세요.' }, { status: 400 })
  }

  const shipping = Math.max(0, Math.round(Number(body.shipping) || 0))

  // 견적번호 — 내 것이어야 하고, 유효기간 안이어야 한다. 아니면 주문을 세우지 않는다:
  // 만료된 견적 단가로 품의가 났는데 주문이 다른 값으로 서면 담당자가 설명할 길이 없다.
  const quoteNo = typeof body.quoteNo === 'string' && body.quoteNo ? body.quoteNo.trim() : null
  if (quoteNo) {
    try {
      const quote = await getQuote(member.memberKey, quoteNo)
      if (!isQuoteValid(quote)) {
        return NextResponse.json(
          { message: '견적서 유효기간이 지났습니다. 장바구니에서 견적서를 다시 발급해 주세요.' },
          { status: 409 },
        )
      }
    } catch (error) {
      if (error instanceof OrderError && error.status === 404) {
        return NextResponse.json({ message: '견적서를 찾을 수 없습니다.' }, { status: 400 })
      }
      throw error
    }
  }

  try {
    const order = await createOrder({
      memberId: member.memberKey,
      shipTo,
      lines,
      clientOrderKey:
        typeof body.clientOrderKey === 'string' && body.clientOrderKey ? body.clientOrderKey : null,
      route,
      paymentMethod,
      quoteNo,
      payment,
      shipping,
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error, '주문을 등록하지 못했습니다.')
  }
}

/** 내 주문 내역. 남의 주문은 볼 수 없다 — 계정을 세션에서만 받기 때문이다. */
export async function GET() {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }

  try {
    const page = await listOrders(member.memberKey)
    return NextResponse.json(page)
  } catch (error) {
    return toErrorResponse(error, '주문 내역을 불러오지 못했습니다.')
  }
}
