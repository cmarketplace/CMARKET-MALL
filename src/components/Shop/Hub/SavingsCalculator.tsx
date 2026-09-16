'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'

import { useShop } from '@/app/providers/ShopProvider'
import type { Product } from '@/components/Shop/product.data'
import { LoginRequiredError } from '@/lib/place-order'
import { matchScore, MAX_PASTE_ROWS, parsePurchasePaste, type PastedRow } from '@/lib/purchase-paste'

import { inputClass } from '../Requests/RequestKit'

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')

const SAMPLE = ['품명\t규격\t수량\t단가', 'A4 복사용지\t80g 2500매\t24\t28500', '볼펜\t0.7mm 검정 12자루\t10\t4800', '종이컵\t6.5oz 1000개\t6\t19800'].join('\n')

interface Result {
  row: PastedRow
  candidates: Product[]
  chosen: string | null
}

/** 이름이 이 비율 미만으로 겹치면 «같은 상품인지 확인» 을 띄운다. */
const CONFIDENT = 0.6

/**
 * 절감액 계산기 — 붙여 넣기 → 후보 찾기 → 줄마다 후보 고르기 → 합계.
 *
 * 몰이 더 비싼 줄은 절감액을 음수로 깎지 않고 0 으로 두되 «몰이 더 비쌉니다» 를 적는다. 합계를
 * 부풀리지도, 감추지도 않는다. 후보가 없는 줄은 «구해드림» 으로 보낸다.
 */
export default function SavingsCalculator() {
  const { addToCart } = useShop()
  const [raw, setRaw] = useState('')
  const [results, setResults] = useState<Result[] | null>(null)
  const [skipped, setSkipped] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [added, setAdded] = useState(false)

  const run = async () => {
    setError(null)
    setNeedsLogin(false)
    setAdded(false)
    const parsed = parsePurchasePaste(raw)
    if (parsed.rows.length === 0) {
      setError('읽을 수 있는 줄이 없습니다. 품명과 수량·단가 숫자 칸이 함께 있는지 확인해 주세요.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/shop/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsed.rows.map(row => ({ name: row.name, spec: row.spec })) }),
      })
      if (response.status === 401) throw new LoginRequiredError()
      const payload = (await response.json().catch(() => null)) as
        | { results?: { index: number; candidates: Product[] }[]; message?: string }
        | null
      if (!response.ok || !payload?.results) throw new Error(payload?.message ?? '계산하지 못했습니다.')

      setSkipped(parsed.skipped)
      setResults(
        parsed.rows.map((row, index) => {
          const candidates = payload.results?.find(entry => entry.index === index)?.candidates ?? []
          return { row, candidates, chosen: candidates[0]?.id ?? null }
        }),
      )
    } catch (caught) {
      if (caught instanceof LoginRequiredError) setNeedsLogin(true)
      setError(caught instanceof Error ? caught.message : '계산하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const summary = useMemo(() => {
    if (!results) return null
    let before = 0
    let after = 0
    let matched = 0
    for (const result of results) {
      const product = result.candidates.find(candidate => candidate.id === result.chosen)
      if (!product) continue
      matched += 1
      before += result.row.unitPrice * result.row.quantity
      after += Math.min(product.basePrice, result.row.unitPrice) * result.row.quantity
    }
    return { before, after, saving: before - after, matched }
  }, [results])

  const addAll = () => {
    if (!results) return
    for (const result of results) {
      const product = result.candidates.find(candidate => candidate.id === result.chosen)
      if (product && product.basePrice < result.row.unitPrice) addToCart(product, result.row.quantity)
    }
    setAdded(true)
  }

  return (
    <div className="space-y-6">
      <div className="border-border rounded-2xl border p-5">
        <label className="block">
          <span className="text-text text-sm font-semibold">구매 내역 붙여 넣기</span>
          <span className="text-muted ml-1.5 text-xs">최대 {MAX_PASTE_ROWS}줄 · 품명 / 규격 / 수량 / 단가</span>
          <textarea
            value={raw}
            onChange={event => setRaw(event.target.value)}
            rows={8}
            placeholder={SAMPLE}
            className={`${inputClass} mt-2 font-mono text-xs`}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={run}
            disabled={busy || !raw.trim()}
            className="bg-primary hover:bg-primary-dark h-11 cursor-pointer rounded-control px-5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          >
            {busy ? '몰에서 찾는 중…' : '절감액 계산하기'}
          </button>
          <button
            type="button"
            onClick={() => setRaw(SAMPLE)}
            className="text-primary hover:bg-blue-tint cursor-pointer rounded-control px-4 py-2.5 text-sm font-semibold"
          >
            예시 넣어 보기
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-5 text-[#B3261E]">
            {error}
            {needsLogin && (
              <>
                {' '}
                <Link href="/login?next=/shop/savings" className="font-semibold underline">
                  로그인하기
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      {results && summary && (
        <>
          <div className="bg-navy grid gap-4 rounded-2xl p-6 text-white sm:grid-cols-3">
            <div>
              <p className="text-on-dark-muted text-xs">붙여 넣은 금액(찾은 {summary.matched}줄)</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{won(summary.before)}원</p>
            </div>
            <div>
              <p className="text-on-dark-muted text-xs">씨마켓몰 판매가로</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{won(summary.after)}원</p>
            </div>
            <div>
              <p className="text-on-dark-muted text-xs">줄일 수 있는 금액</p>
              <p className="text-mint mt-1 text-2xl font-semibold tabular-nums">{won(summary.saving)}원</p>
            </div>
            <p className="text-on-dark-subtle text-xs sm:col-span-3">
              지금 몰 판매가(수량 1개 기준 최저가) 기준입니다. 수량 구간 단가·배송비는 장바구니에서 다시 계산됩니다.
              {skipped > 0 && ` 읽지 못한 줄 ${skipped}개는 빠졌습니다.`}
            </p>
          </div>

          <div className="border-border overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-light-soft text-muted text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">붙여 넣은 품목</th>
                  <th className="px-4 py-3 font-medium">몰에서 찾은 상품</th>
                  <th className="px-4 py-3 text-right font-medium">단가 비교</th>
                  <th className="px-4 py-3 text-right font-medium">차액</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => {
                  const product = result.candidates.find(candidate => candidate.id === result.chosen) ?? null
                  const diff = product ? (result.row.unitPrice - product.basePrice) * result.row.quantity : 0
                  const unsure = product ? matchScore(result.row.name, product.name) < CONFIDENT : false
                  return (
                    <tr key={index} className="border-border border-t align-top">
                      <td className="px-4 py-3">
                        <span className="text-text block font-semibold">{result.row.name}</span>
                        <span className="text-muted block text-xs">
                          {result.row.spec && `${result.row.spec} · `}
                          {result.row.quantity.toLocaleString('ko-KR')}개 × {won(result.row.unitPrice)}원
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {result.candidates.length === 0 ? (
                          <Link
                            href={`/shop/request?type=sourcing&item=${encodeURIComponent(result.row.name)}`}
                            className="text-primary text-xs font-semibold hover:underline"
                          >
                            몰에 없음 · 구해 달라고 요청
                          </Link>
                        ) : (
                          <>
                            <select
                              value={result.chosen ?? ''}
                              onChange={event =>
                                setResults(current =>
                                  current?.map((entry, at) => (at === index ? { ...entry, chosen: event.target.value || null } : entry)) ?? null,
                                )
                              }
                              aria-label={`${result.row.name} 비교할 상품`}
                              className={`${inputClass} py-2 text-xs`}
                            >
                              {result.candidates.map(candidate => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.name}
                                </option>
                              ))}
                              <option value="">비교에서 빼기</option>
                            </select>
                            {unsure && <span className="mt-1 block text-[11px] text-[#9A5B00]">같은 상품인지 확인해 주세요</span>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {product ? (
                          <>
                            <span className="text-muted block text-xs line-through">{won(result.row.unitPrice)}원</span>
                            <span className="text-text font-semibold">{won(product.basePrice)}원</span>
                          </>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {product ? (
                          diff > 0 ? (
                            <span className="text-highlight font-semibold">-{won(diff)}원</span>
                          ) : (
                            <span className="text-muted text-xs">몰이 더 비쌉니다</span>
                          )
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addAll}
              disabled={summary.saving <= 0}
              className="bg-primary hover:bg-primary-dark inline-flex h-11 cursor-pointer items-center gap-2 rounded-control px-5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              <ShoppingCart size={16} aria-hidden="true" />
              싸지는 줄만 장바구니에 담기
            </button>
            {added && (
              <Link href="/shop/cart" className="text-primary text-sm font-semibold hover:underline">
                장바구니 보기
              </Link>
            )}
            <Link href="/shop/annual" className="text-muted-strong hover:text-primary ml-auto text-sm font-semibold">
              매달 사는 품목이면 연간 단가계약으로 →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
