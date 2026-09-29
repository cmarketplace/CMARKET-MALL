import type { OrderRoute } from '@/lib/order-types'
import { PostpaidMallError } from '@/lib/postpaid-mall-stub'
import type {
  QuoteKind,
  QuoteLine,
  QuoteSubscription,
  StorefrontQuote,
} from '@/lib/quote-types'
import { resolveSemoApi, storefrontUrl } from '@/lib/semo-api'

/**
 * 세모 견적서 클라이언트 — `quotes.ts` 가 세모 모드에서 위임하는 곳.
 *
 * 세모 쪽 실체: `/external/storefronts/{slug}/quotes` — 견적번호·유효기간을 **세모가** 정하고
 * 원장도 세모 DB(`storefront_quotes`)에 있다. 몰(Vercel)은 인스턴스가 여럿이라 견적서를 몰
 * 안에 두면 방금 받은 번호가 다음 요청에서 사라진다.
 *
 * 단가는 보내지 않는다 — 세모가 카탈로그(몰 승인 오퍼)로 다시 확정하고 금액도 계산한다.
 * 몰이 보내는 것은 «누구의 무엇을 몇 개, 어느 업체로» 와, 세모가 아직 모르는 두 값
 * (공급사 배송비 합·구독 월 예상 금액)뿐이다.
 *
 * 응답은 `{success, data, message}` 봉투다. 4xx 의 message 는 담당자가 고칠 수 있는
 * 말(판매 중지 품목 등)이라 그대로 전달한다(`semo-orders.ts` 와 같은 규칙).
 */

const UPSTREAM_TIMEOUT_MS = 10_000
const LIST_LIMIT = 50

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
    // 검증 실패(400)는 message 가 배열로 올 수 있다.
    const raw = payload?.message
    const message = Array.isArray(raw) ? raw.join(' ') : raw
    throw new PostpaidMallError(
      response.status >= 400 ? response.status : 502,
      message || `세모 응답 오류 (${response.status})`,
    )
  }

  return payload.data
}

interface SemoQuotePayload {
  quoteNo: string
  kind: QuoteKind
  ownerKey: string
  createdAt: string
  validUntil: string
  route: OrderRoute | null
  lines: {
    itemId: string
    offerId: string | null
    name: string
    spec: string | null
    unit: string | null
    quantity: number
    unitPrice: number
    supplierName: string | null
  }[]
  supply: number
  shipping: number
  vat: number
  total: number
  supplierCount: number
  subscription: QuoteSubscription | null
}

function toMallQuote(quote: SemoQuotePayload): StorefrontQuote {
  return {
    quoteNo: quote.quoteNo,
    kind: quote.kind,
    // 몰의 `memberId` 칸은 원래부터 세션의 memberKey(씨마켓 sub)였다 — 세모의 ownerKey 와 같은 값.
    memberId: quote.ownerKey,
    createdAt: quote.createdAt,
    validUntil: quote.validUntil,
    route: quote.route,
    lines: quote.lines.map(line => ({
      itemId: line.itemId,
      name: line.name,
      spec: line.spec,
      unit: line.unit,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      offerId: line.offerId,
      supplierName: line.supplierName,
    })),
    supply: quote.supply,
    shipping: quote.shipping,
    vat: quote.vat,
    total: quote.total,
    supplierCount: quote.supplierCount,
    subscription: quote.subscription,
  }
}

export async function semoCreateQuote(input: {
  memberId: string
  kind: QuoteKind
  route: OrderRoute | null
  /** 세모는 품목·오퍼·수량·표시명만 받는다 — 단가는 카탈로그가 재확정한다. */
  lines: QuoteLine[]
  shipping: number
  subscription: QuoteSubscription | null
}): Promise<StorefrontQuote> {
  const common = {
    ownerKey: input.memberId,
    ...(input.route ? { route: input.route } : {}),
  }

  const body =
    input.kind === 'SUBSCRIPTION'
      ? {
          ...common,
          kind: 'SUBSCRIPTION',
          ...(input.subscription
            ? {
                subscription: {
                  planKey: input.subscription.planKey,
                  planName: input.subscription.planName,
                  people: input.subscription.people,
                  frequencyLabel: input.subscription.frequencyLabel,
                  monthlyEstimate: input.subscription.monthlyEstimate,
                },
              }
            : {}),
        }
      : {
          ...common,
          kind: 'CART',
          items: input.lines.map(line => ({
            itemId: line.itemId,
            quantity: line.quantity,
            // 몰의 임시 오퍼(`base:<id>`)도 그대로 보낸다 — 세모가 대표 최저가 오퍼로 접는다.
            ...(line.offerId ? { offerId: line.offerId } : {}),
            ...(line.supplierName ? { supplierName: line.supplierName } : {}),
          })),
          shipping: Math.max(0, Math.round(input.shipping || 0)),
        }

  const quote = await semoFetch<SemoQuotePayload>('/quotes', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return toMallQuote(quote)
}

export async function semoListQuotes(memberId: string): Promise<StorefrontQuote[]> {
  const page = await semoFetch<{ quotes: SemoQuotePayload[]; total: number }>(
    `/quotes?ownerKey=${encodeURIComponent(memberId)}&limit=${LIST_LIMIT}`,
  )
  return page.quotes.map(toMallQuote)
}

/**
 * 견적서 1건. 세모가 신원 키까지 맞춰 찾으므로 남의 견적서는 세모에서 404 로 온다.
 * 그래도 한 번 더 대조한다 — 이 대조는 싸고, 세모 쪽 조건이 빠지는 날의 마지막 자물쇠다.
 */
export async function semoGetQuote(memberId: string, quoteNo: string): Promise<StorefrontQuote> {
  const quote = await semoFetch<SemoQuotePayload>(
    `/quotes/${encodeURIComponent(quoteNo)}?ownerKey=${encodeURIComponent(memberId)}`,
  )
  if (quote.ownerKey !== memberId) {
    throw new PostpaidMallError(404, '견적서를 찾을 수 없습니다.')
  }
  return toMallQuote(quote)
}
