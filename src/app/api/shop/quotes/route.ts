import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/lib/api-errors'
import { combine, type CombinationMode } from '@/lib/cart-combination'
import { fetchProductsByIds, maskProducts } from '@/lib/catalog'
import {
  clampPeople,
  estimateMonthly,
  SUBSCRIPTION_PLANS,
} from '@/config/subscriptions'
import { createQuote, listQuotes } from '@/lib/quotes'
import type { QuoteLine } from '@/lib/quote-types'
import { getShopMember } from '@/lib/shop-member'
import type { OrderRoute } from '@/lib/order-types'

/**
 * 견적서 발급 — «견적서 먼저, 주문은 결재 후».
 *
 * 단가는 **서버가 카탈로그에서 다시 잡는다.** 화면이 보낸 것은 «어느 품목을 몇 개, 어느
 * 업체로» 뿐이다. 견적서는 품의에 붙는 종이라 화면 스냅샷 값을 그대로 찍으면 안 된다.
 *
 * 명의는 세션에서만 온다(로그인 없으면 401) — 견적서에 기관·담당자가 실려야 하기 때문이다.
 */

const MAX_LINES = 200

interface CartQuoteBody {
  kind?: 'CART'
  route?: unknown
  mode?: unknown
  items?: unknown
}

interface SubscriptionQuoteBody {
  kind: 'SUBSCRIPTION'
  planKey?: unknown
  people?: unknown
  frequencyIndex?: unknown
}

function parseRoute(raw: unknown): OrderRoute | null {
  return raw === 'SAFE' || raw === 'DIRECT' ? raw : null
}

function parseMode(raw: unknown): CombinationMode {
  return raw === 'single' || raw === 'manual' ? raw : 'best'
}

export async function POST(request: Request) {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json(
      { message: '견적서를 받으려면 씨마켓 계정으로 로그인해 주세요.' },
      { status: 401 },
    )
  }

  let body: CartQuoteBody | SubscriptionQuoteBody
  try {
    body = (await request.json()) as CartQuoteBody | SubscriptionQuoteBody
  } catch {
    return NextResponse.json({ message: '요청 본문을 읽지 못했습니다.' }, { status: 400 })
  }

  try {
    if (body.kind === 'SUBSCRIPTION') {
      const plan = SUBSCRIPTION_PLANS.find(item => item.key === body.planKey)
      if (!plan) return NextResponse.json({ message: '구독 상품을 확인해 주세요.' }, { status: 400 })

      const people = clampPeople(Number(body.people))
      const frequencyIndex = Math.min(
        plan.frequencies.length - 1,
        Math.max(0, Number(body.frequencyIndex) || 0),
      )
      const quote = await createQuote({
        memberId: member.memberKey,
        kind: 'SUBSCRIPTION',
        route: 'SAFE',
        lines: [],
        shipping: 0,
        subscription: {
          planKey: plan.key,
          planName: plan.name,
          people,
          frequencyLabel: plan.frequencies[frequencyIndex].label,
          monthlyEstimate: estimateMonthly(plan, people, frequencyIndex),
        },
      })
      return NextResponse.json({ quote }, { status: 201 })
    }

    const raw = Array.isArray(body.items) ? body.items : []
    if (raw.length === 0 || raw.length > MAX_LINES) {
      return NextResponse.json(
        { message: `견적 품목이 올바르지 않습니다(1~${MAX_LINES}줄).` },
        { status: 400 },
      )
    }

    const requested = raw
      .map(entry => {
        const line = entry as { itemId?: unknown; quantity?: unknown; offerId?: unknown }
        const itemId = typeof line.itemId === 'string' ? line.itemId.trim() : ''
        const quantity = Number(line.quantity)
        const offerId = typeof line.offerId === 'string' && line.offerId ? line.offerId : null
        return itemId && Number.isInteger(quantity) && quantity >= 1
          ? { itemId, quantity, offerId }
          : null
      })
      .filter((line): line is { itemId: string; quantity: number; offerId: string | null } => Boolean(line))

    if (requested.length !== raw.length) {
      return NextResponse.json({ message: '견적 품목의 수량을 확인해 주세요.' }, { status: 400 })
    }

    // 견적서는 손님이 보는 종이다 — 손님 등급대로 접은 상품으로 만든다(공급사명이 새지 않게).
    const products = maskProducts(
      await fetchProductsByIds(requested.map(line => line.itemId)),
      member.tier,
    )
    const byId = new Map(products.map(product => [product.id, product]))
    const missing = requested.filter(line => !byId.has(line.itemId))
    if (missing.length > 0) {
      return NextResponse.json(
        { message: '더 이상 판매하지 않는 품목이 있습니다. 장바구니를 새로고침해 주세요.' },
        { status: 409 },
      )
    }

    const result = combine(
      requested.map(line => ({
        product: byId.get(line.itemId)!,
        quantity: line.quantity,
        offerId: line.offerId,
      })),
      parseMode(body.mode),
    )

    const lines: QuoteLine[] = result.lines.map(line => ({
      itemId: line.product.id,
      name: line.product.name,
      spec: [line.product.spec1, line.product.spec2].filter(Boolean).join(' ') || null,
      unit: line.product.unit || null,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      offerId: line.offer.offerId,
      supplierName: line.offer.supplierName,
    }))

    const quote = await createQuote({
      memberId: member.memberKey,
      kind: 'CART',
      route: member.tier === 'FULL' ? parseRoute(body.route) : 'SAFE',
      lines,
      shipping: result.shipping,
      subscription: null,
    })
    return NextResponse.json({ quote }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error, '견적서를 발급하지 못했습니다.')
  }
}

/** 내 견적서 목록. */
export async function GET() {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }
  try {
    return NextResponse.json({ quotes: await listQuotes(member.memberKey) })
  } catch (error) {
    return toErrorResponse(error, '견적서 목록을 불러오지 못했습니다.')
  }
}
