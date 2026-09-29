'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'

import { calculateCartAmounts } from '@/lib/cart-amounts'
import type { CombinationInput, CombinationMode, CombinationResult } from '@/lib/cart-combination'
import {
  LoginRequiredError,
  getActiveQuoteServerSnapshot,
  getActiveQuoteSnapshot,
  requestQuote,
  setActiveQuote,
  subscribeActiveQuote,
} from '@/lib/place-order'
import { isQuoteValid } from '@/lib/quote-types'

interface CartSummaryProps {
  result: CombinationResult
  inputs: CombinationInput[]
  mode: CombinationMode
  /** 업체가 전부 익명(제한 고객·미제공) — 업체·배송·계산서 수와 업체별 소계를 그리지 않는다. */
  anonymous?: boolean
  /** 공급기업 — 안전결제뿐이라 계산서는 업체 수와 무관하게 씨마켓 발행 1장이다(직접 구매 없음). */
  safeOnly?: boolean
}

const won = (n: number) => n.toLocaleString('ko-KR')

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' }).format(
    new Date(iso),
  )

/**
 * 장바구니 요약 — 금액 · 업체/배송/계산서 수 · 견적서 · 결제 화면으로.
 *
 * 주문은 여기서 내지 않는다. «어떻게 살 것인가»(안전결제 / 직접 구매)를 고르는 화면이
 * 따로 있고(`/shop/checkout`), 배송지도 거기서 적는다. 여기가 하는 일은 «얼마인가» 와
 * «견적서 먼저 받을 것인가» 둘이다.
 *
 * 금액은 `cart-amounts.ts` 만 쓴다(배송비 포함 총액 = 청구 예정액).
 */
export default function CartSummary({
  result,
  inputs,
  mode,
  anonymous = false,
  safeOnly = false,
}: CartSummaryProps) {
  const activeQuote = useSyncExternalStore(
    subscribeActiveQuote,
    getActiveQuoteSnapshot,
    getActiveQuoteServerSnapshot,
  )
  const [isQuoting, setIsQuoting] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)

  const count = result.lines.reduce((sum, line) => sum + line.quantity, 0)
  const amounts = calculateCartAmounts(
    result.lines.map(line => ({ unitPrice: line.unitPrice, quantity: line.quantity })),
    { shipping: result.shipping },
  )
  const hasSelection = result.lines.length > 0
  const n = result.supplierCount
  const quoteStillValid = activeQuote ? isQuoteValid(activeQuote) : false

  const handleQuote = async () => {
    if (!hasSelection || isQuoting) return
    setQuoteError(null)
    setNeedsLogin(false)
    setIsQuoting(true)
    try {
      const quote = await requestQuote({
        kind: 'CART',
        route: null,
        mode,
        items: inputs.map(input => ({
          itemId: input.product.id,
          quantity: input.quantity,
          offerId: input.offerId,
        })),
      })
      setActiveQuote(quote)
    } catch (error) {
      if (error instanceof LoginRequiredError) setNeedsLogin(true)
      else setQuoteError(error instanceof Error ? error.message : '견적서를 발급하지 못했습니다.')
    } finally {
      setIsQuoting(false)
    }
  }

  return (
    <aside className="rounded-2xl bg-light-soft p-6">
      <div className="space-y-3 rounded-xl bg-white p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">선택 상품</span>
          <span className="text-text font-medium">
            {result.lines.length}종 / {count}개
          </span>
        </div>

        {/* 서류 수 — 절감액과 같은 무게로 */}
        {hasSelection && !anonymous && (
          <div className="border-bg grid grid-cols-3 gap-2 border-y border-dashed py-3 text-center">
            {[
              ['업체', `${n}곳`],
              ['배송', `${n}건`],
              ['계산서', n > 1 && !safeOnly ? `${n}장 · 안전결제 1장` : '1장'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-muted text-[11px]">{label}</p>
                <p className="text-text mt-0.5 text-xs font-semibold">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* 업체별 소계 */}
        {result.groups.length > 0 && !anonymous && (
          <ul className="space-y-1.5">
            {result.groups.map(group => (
              <li key={group.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-text inline-flex min-w-0 items-center gap-1.5">
                  <span aria-hidden="true" className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                  <span className="truncate">
                    {group.label} · {group.lineCount}품목
                  </span>
                </span>
                <span className="text-muted shrink-0 tabular-nums">
                  {won(group.supply)}원{group.shippingFee > 0 ? ` +배송 ${won(group.shippingFee)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="border-bg space-y-2 border-t border-dashed pt-3">
          <div className="flex items-center justify-between">
            <span className="text-muted">상품 금액</span>
            <span className="text-text font-medium tabular-nums">{won(amounts.supply)}원</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">배송비{anonymous ? '' : ` (${n}건)`}</span>
            <span className="text-text font-medium tabular-nums">
              {amounts.shipping > 0 ? `${won(amounts.shipping)}원` : '무료'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">부가세 10%</span>
            <span className="text-text font-medium tabular-nums">{won(amounts.vat)}원</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between">
        <span className="text-text font-semibold">청구 예정 금액</span>
        <strong className="text-primary text-2xl font-semibold tabular-nums">{won(amounts.total)}원</strong>
      </div>
      <p className="text-muted mt-1 text-right text-xs leading-5">
        부가세 포함 · <strong className="font-semibold">지금 결제하지 않습니다</strong>
      </p>

      {/* 견적서 — 결재용 종이를 먼저 */}
      {activeQuote && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-xs leading-5 ${
            quoteStillValid ? 'bg-highlight-soft text-highlight-strong' : 'bg-bg text-muted'
          }`}
        >
          <p className="flex items-center gap-1.5 font-semibold">
            <FileText size={14} />
            견적서 {activeQuote.quoteNo}
          </p>
          <p className="mt-0.5">
            {quoteStillValid
              ? `${formatDate(activeQuote.validUntil)}까지 총액 ${won(activeQuote.total)}원 잠금 · 결재 후 이 번호로 주문`
              : '유효기간이 지났습니다. 다시 발급해 주세요.'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['견적서', '내부 결재', '견적번호로 주문'].map((step, index) => (
              <span key={step} className="rounded-full bg-white px-2 py-0.5 text-[11px]">
                {index + 1}. {step}
              </span>
            ))}
          </div>
        </div>
      )}

      {needsLogin && (
        <p className="mt-4 rounded-xl bg-highlight-soft px-4 py-3 text-sm leading-6 text-highlight-strong">
          견적서에는 기관·담당자가 실려야 합니다.{' '}
          <Link href="/login?next=/shop/cart" className="font-semibold underline underline-offset-2">
            씨마켓 계정으로 로그인
          </Link>
        </p>
      )}

      {quoteError && (
        <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-5 text-[#B3261E]">
          {quoteError}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleQuote}
          disabled={!hasSelection || isQuoting}
          className="text-text hover:bg-bg w-full cursor-pointer rounded-full border border-border bg-white px-6 py-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isQuoting ? '견적서를 만드는 중…' : activeQuote && quoteStillValid ? '견적서 다시 발급' : '견적서 발급 · 가격 7일 잠금'}
        </button>
        <Link
          href="/shop/checkout"
          aria-disabled={!hasSelection}
          className={`w-full rounded-full px-6 py-4 text-center text-sm font-semibold transition-all duration-200 ${
            hasSelection
              ? 'bg-primary hover:bg-primary-dark text-white hover:-translate-y-0.5'
              : 'bg-bg text-muted pointer-events-none'
          }`}
        >
          {hasSelection ? '주문 방법 선택으로' : '주문할 상품을 선택하세요'}
        </Link>
      </div>
    </aside>
  )
}
