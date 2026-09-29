'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

import { ANNUAL_CONTRACT_TERMS, type AnnualContractRound } from '@/config/annual-contracts'
import { formatKDate } from '@/lib/kdate'
import type { PriceBenchmarkItem } from '@/lib/price-benchmark'
import { topic } from '@/lib/korean'

import {
  ContactFieldset,
  Field,
  inputClass,
  RequestReceived,
  SubmitError,
  useContactDraft,
  useRequestSubmit,
} from '../Requests/RequestKit'

const num = (n: number) => n.toLocaleString('ko-KR')

/**
 * 연간 단가계약 신청서 — 품목 표에 월 수량을 적고 한 건으로 보낸다(refKey = 회차 key).
 *
 * 공동구매와 달리 품목별로 쪼개지 않는다: 여기는 진행 막대가 없고, 운영자는 한 곳의 신청을
 * 한 장의 단가계약서로 회신한다.
 */
interface BenchmarkView {
  items: PriceBenchmarkItem[]
  basisLabel: string
  method: string
}

export default function AnnualContractHub({
  round,
  stub,
  benchmark,
}: {
  round: AnnualContractRound
  stub: boolean
  /** 입찰 상한(인터넷 정상가). 스냅샷이 없으면 null */
  benchmark: BenchmarkView | null
}) {
  const [monthly, setMonthly] = useState<Record<string, string>>({})
  const [sites, setSites] = useState('1')
  const [address, setAddress] = useState('')
  const [memo, setMemo] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const { contact, set } = useContactDraft()
  const { submit, busy, error, needsLogin, created, reset } = useRequestSubmit()

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const picks = round.items
      .map(item => ({ item, quantity: Number(monthly[item.key] || 0) }))
      .filter(pick => pick.quantity > 0)
    if (picks.length === 0) return setFormError('신청할 품목의 월 수량을 하나 이상 적어 주세요.')
    const short = picks.find(pick => pick.quantity < pick.item.minMonthly)
    if (short) {
      return setFormError(`${topic(short.item.name)} 한 달 ${num(short.item.minMonthly)}${short.item.unit}부터 신청할 수 있습니다.`)
    }
    if (!address.trim()) return setFormError('배송 주소(대표 한 곳)를 적어 주세요.')

    const ok = await submit(contact, [
      {
        type: 'ANNUAL_CONTRACT',
        refKey: round.key,
        title: `${round.title} · ${picks[0].item.name}${picks.length > 1 ? ` 외 ${picks.length - 1}품목` : ''}`,
        quantity: null,
        details: [
          ...picks.map(({ item, quantity }) => ({
            label: item.name,
            value: `${item.spec} · 월 ${num(quantity)}${item.unit}`,
          })),
          { label: '배송지 수', value: `${sites}곳` },
          { label: '대표 배송 주소', value: address },
          { label: '메모', value: memo },
        ],
      },
    ])
    if (ok) {
      setMonthly({})
      setMemo('')
    }
  }

  if (created) {
    return <RequestReceived requests={created} stub={stub} onAnother={reset} anotherLabel="신청서 다시 쓰기" />
  }

  return (
    <form onSubmit={send} className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <ul className="bg-blue-tint grid gap-2 rounded-2xl p-5 sm:grid-cols-2">
          {ANNUAL_CONTRACT_TERMS.map(term => (
            <li key={term} className="text-text flex items-start gap-2 text-sm">
              <Check size={16} className="text-primary mt-0.5 shrink-0" aria-hidden="true" />
              {term}
            </li>
          ))}
        </ul>

        <div className="border-border overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-light-soft text-muted text-left text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">품목</th>
                <th className="px-4 py-3 font-medium">낙찰 단가 · 입찰 상한</th>
                <th className="w-40 px-4 py-3 font-medium">월 수량</th>
              </tr>
            </thead>
            <tbody>
              {round.items.map(item => {
                const ceiling = benchmark?.items.find(entry => entry.key === item.key) ?? null
                return (
                <tr key={item.key} className="border-border border-t">
                  <td className="px-4 py-3">
                    <span className="text-text block font-semibold">{item.name}</span>
                    <span className="text-muted block text-xs">{item.spec}</span>
                    <Link href={`/shop/products?q=${encodeURIComponent(item.keyword)}`} className="text-primary text-xs font-semibold hover:underline">
                      지금 몰 판매가
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {item.unitPrice !== null ? (
                      <span className="text-text font-semibold tabular-nums">
                        {num(item.unitPrice)}원<span className="text-muted text-xs font-normal"> / {item.unit}</span>
                      </span>
                    ) : ceiling ? (
                      <span className="block">
                        <span className="text-text block font-semibold tabular-nums">
                          {num(ceiling.median)}원 미만
                        </span>
                        <span className="text-muted block text-[11px]">인터넷 정상가 · 낙찰 후 단가 공개</span>
                      </span>
                    ) : (
                      <span className="text-muted text-xs">입찰 후 공개</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="relative block">
                      <input
                        value={monthly[item.key] ?? ''}
                        onChange={event => setMonthly(current => ({ ...current, [item.key]: event.target.value.replace(/\D/g, '') }))}
                        inputMode="numeric"
                        placeholder={`${item.minMonthly}~`}
                        aria-label={`${item.name} 월 수량`}
                        className={`${inputClass} pr-12 tabular-nums`}
                      />
                      <span className="text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">{item.unit}</span>
                    </span>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-muted text-xs">신청 마감 {formatKDate(round.applyClosesAt)} · 마감 뒤 품목별 입찰 결과와 단가계약서를 담당자께 보내 드립니다.</p>
        {benchmark && (
          <p className="text-muted text-[11px] leading-5">
            입찰 상한 = 인터넷 정상가({benchmark.basisLabel}). {benchmark.method}
          </p>
        )}
      </div>

      <div className="border-border space-y-4 rounded-2xl border bg-white p-5 lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
        <Field label="배송지 수" hint="지점·사업소가 여러 곳이면">
          <input value={sites} onChange={event => setSites(event.target.value.replace(/\D/g, '') || '1')} inputMode="numeric" className={inputClass} />
        </Field>
        <Field label="대표 배송 주소">
          <input value={address} onChange={event => setAddress(event.target.value)} placeholder="세종 한누리대로 402" className={inputClass} />
        </Field>
        <Field label="메모" hint="선택">
          <textarea value={memo} onChange={event => setMemo(event.target.value)} rows={3} placeholder="지금 쓰는 규격·브랜드, 분할 배송 요청" className={inputClass} />
        </Field>
        <ContactFieldset contact={contact} set={set} />
        <SubmitError error={formError ?? error} needsLogin={needsLogin} next="/shop/annual" />
        <button
          type="submit"
          disabled={busy}
          className="bg-primary hover:bg-primary-dark h-12 w-full cursor-pointer rounded-control text-sm font-semibold text-white transition-colors disabled:opacity-60"
        >
          {busy ? '보내는 중…' : '연간 단가계약 신청하기'}
        </button>
      </div>
    </form>
  )
}
