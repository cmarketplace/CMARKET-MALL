import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { calculateCartAmounts } from '@/lib/cart-amounts'
import type { OrderRoute } from '@/lib/order-types'
import { PostpaidMallError } from '@/lib/postpaid-mall-stub'
import {
  QUOTE_VALID_DAYS,
  type QuoteKind,
  type QuoteLine,
  type QuoteSubscription,
  type StorefrontQuote,
} from '@/lib/quote-types'
import { isSemoConfigured } from '@/lib/semo-api'
import { semoCreateQuote, semoGetQuote, semoListQuotes } from '@/lib/semo-quotes'

/**
 * 견적서 원장 — **세모 견적서 원장으로 가는 이음새.** (`orders.ts` 와 같은 모양)
 *
 * `SEMO_API_BASE`/`SEMO_API_KEY` 가 채워진 환경에서는 세모가 정본이다(`semo-quotes.ts`):
 * 견적번호·유효기간을 세모가 정하고, 단가를 카탈로그로 다시 확정해 금액까지 계산한 뒤
 * 세모 DB 에 보관한다. 몰은 Vercel 서버리스라 인스턴스마다 메모리가 따로다 — 원장이 몰
 * 안에 있으면 방금 받은 견적번호가 다음 요청에서 «없는 견적서» 가 된다.
 *
 * 키가 없으면 로컬 스텁 원장이 자리를 지킨다(개발·데모): `var/quotes-stub.json`
 * (.gitignore), 파일을 못 쓰는 환경에서는 메모리로만 돈다.
 *
 * 어느 쪽이든 주문에는 `quoteNo` 로만 연결된다. 소유는 세션의 memberKey(씨마켓 sub) 하나로
 * 가르고, 남의 견적서는 «없는 견적서»(404)다.
 */

export interface CreateQuoteInput {
  memberId: string
  kind: QuoteKind
  route: OrderRoute | null
  lines: QuoteLine[]
  shipping: number
  subscription: QuoteSubscription | null
}

export async function createQuote(input: CreateQuoteInput): Promise<StorefrontQuote> {
  if (isSemoConfigured()) return semoCreateQuote(input)
  return stubCreateQuote(input)
}

/** 내 견적서 목록(최신순). */
export async function listQuotes(memberId: string): Promise<StorefrontQuote[]> {
  if (isSemoConfigured()) return semoListQuotes(memberId)
  return stubListQuotes(memberId)
}

/** 남의 견적서는 «없는 견적서» 다 — 주문과 같은 규칙. */
export async function getQuote(memberId: string, quoteNo: string): Promise<StorefrontQuote> {
  if (isSemoConfigured()) return semoGetQuote(memberId, quoteNo)
  return stubGetQuote(memberId, quoteNo)
}

/* ── 로컬 스텁 원장 (세모 키 없음) ─────────────────────────────────────── */

interface QuoteState {
  version: 1
  quotes: StorefrontQuote[]
  quoteSeq: number
}

const STORE_PATH = path.join(process.cwd(), 'var', 'quotes-stub.json')

const globalStore = globalThis as unknown as { __mallQuotes?: QuoteState }

function loadState(): QuoteState {
  if (globalStore.__mallQuotes) return globalStore.__mallQuotes

  let state: QuoteState = { version: 1, quotes: [], quoteSeq: 0 }
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as QuoteState
    if (parsed?.version === 1) state = parsed
  } catch {
    // 첫 실행(파일 없음)이거나 손으로 고치다 깨진 경우 — 빈 원장에서 다시 시작한다.
  }

  globalStore.__mallQuotes = state
  return state
}

function saveState(state: QuoteState): void {
  globalStore.__mallQuotes = state
  try {
    mkdirSync(path.dirname(STORE_PATH), { recursive: true })
    writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf8')
  } catch {
    // 파일을 못 쓰는 환경(서버리스)에서는 메모리로만 유지한다.
  }
}

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

function stubCreateQuote(input: CreateQuoteInput): StorefrontQuote {
  const state = loadState()

  const amounts =
    input.kind === 'SUBSCRIPTION' && input.subscription
      ? calculateCartAmounts([{ unitPrice: input.subscription.monthlyEstimate, quantity: 1 }])
      : calculateCartAmounts(
          input.lines.map(line => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
          { shipping: input.shipping },
        )

  const suppliers = new Set(
    input.lines.map(line => line.supplierName ?? line.offerId ?? line.itemId),
  )

  state.quoteSeq += 1
  const now = new Date()
  const validUntil = new Date(now.getTime() + QUOTE_VALID_DAYS * 86_400_000)

  const quote: StorefrontQuote = {
    quoteNo: `Q-${kstDateStamp()}-${String(state.quoteSeq).padStart(4, '0')}`,
    kind: input.kind,
    memberId: input.memberId,
    createdAt: now.toISOString(),
    validUntil: validUntil.toISOString(),
    route: input.route,
    lines: input.lines,
    supply: amounts.supply,
    shipping: amounts.shipping,
    vat: amounts.vat,
    total: amounts.total,
    supplierCount: input.kind === 'SUBSCRIPTION' ? 1 : suppliers.size,
    subscription: input.subscription,
  }

  state.quotes.push(quote)
  saveState(state)
  return quote
}

function stubListQuotes(memberId: string): StorefrontQuote[] {
  return loadState()
    .quotes.filter(quote => quote.memberId === memberId)
    .reverse()
}

function stubGetQuote(memberId: string, quoteNo: string): StorefrontQuote {
  const quote = loadState().quotes.find(
    row => row.quoteNo === quoteNo && row.memberId === memberId,
  )
  if (!quote) throw new PostpaidMallError(404, '견적서를 찾을 수 없습니다.')
  return quote
}
