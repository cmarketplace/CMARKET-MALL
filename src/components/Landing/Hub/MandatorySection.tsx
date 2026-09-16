'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { MANDATORY_BASIS_NOTE, MANDATORY_CATEGORIES, mandatoryTarget } from '@/config/mandatory-purchase'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading, { SourceNote, landingButtonClass } from './SectionHeading'

const won = (n: number) => n.toLocaleString('ko-KR')
const digits = (value: string) => value.replace(/\D/g, '').slice(0, 13)

/**
 * 의무구매 계산기 — 올해 구매액을 넣으면 분야별 목표 금액, 실적을 넣으면 남은 금액.
 *
 * **브라우저 안에서만 계산한다**(아무것도 보내지 않는다). 분모가 분야마다 달라 물품·용역과 공사를
 * 따로 받는다. 비율이 없거나 분모를 몰이 알 수 없는 분야(기술개발·사회적기업·녹색)는 금액 대신
 * 문장으로 둔다 — 억지로 숫자를 만들지 않는다.
 */
export default function MandatorySection() {
  const [goodsServices, setGoodsServices] = useState('')
  const [construction, setConstruction] = useState('')
  const [achieved, setAchieved] = useState<Record<string, string>>({})

  const rows = useMemo(() => {
    const totals = { goodsServices: Number(goodsServices) || 0, construction: Number(construction) || 0 }
    return MANDATORY_CATEGORIES.map(category => {
      const target = totals.goodsServices + totals.construction > 0 ? mandatoryTarget(category, totals) : null
      const done = Number(achieved[category.key]) || 0
      return { category, target, remaining: target === null ? null : Math.max(0, target - done) }
    })
  }, [goodsServices, construction, achieved])

  const short = rows.filter(row => (row.remaining ?? 0) > 0)
  const totalRemaining = short.reduce((sum, row) => sum + (row.remaining ?? 0), 0)
  const requestHref = `/shop/request?type=mandatory${
    short.length > 0 ? `&cats=${short.map(row => row.category.key).join(',')}&amount=${totalRemaining}` : ''
  }`

  return (
    <RevealSection id="mandatory" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <SectionHeading
          eyebrow="의무구매 실적"
          title={
            <>
              올해 남은 의무구매,
              <br />
              <span className="keyword-gradient-glow">얼마</span>인지 계산해 보세요
            </>
          }
          description="올해 구매액을 넣으면 분야별 목표 금액이, 지금까지 실적을 넣으면 남은 금액이 나옵니다. 남은 분야는 인증을 가진 공급사 상품으로 견적을 모아 드립니다."
        />

        <RevealCard className="mt-12">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-4 rounded-lg bg-[var(--hub-card)] p-5 sm:grid-cols-2 sm:p-6">
              <AmountInput label="올해 물품·용역 구매액" value={goodsServices} onChange={setGoodsServices} />
              <AmountInput label="올해 공사 구매액" value={construction} onChange={setConstruction} hint="없으면 비워 두세요" />
            </div>

            <div className="border-border mt-4 overflow-x-auto rounded-lg border bg-white">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-light-soft text-muted text-left text-xs">
                  <tr>
                    <th className="px-4 py-3 font-medium">분야</th>
                    <th className="px-4 py-3 font-medium">목표</th>
                    <th className="px-4 py-3 text-right font-medium">목표 금액</th>
                    <th className="w-44 px-4 py-3 font-medium">지금까지 실적</th>
                    <th className="px-4 py-3 text-right font-medium">남은 금액</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ category, target, remaining }) => (
                    <tr key={category.key} className="border-border border-t">
                      <td className="px-4 py-3">
                        <span className="text-text block font-semibold">{category.label}</span>
                        <span className="text-muted block text-[11px]">{category.law}</span>
                      </td>
                      <td className="text-muted-strong px-4 py-3 text-[13px] break-keep">{category.target}</td>
                      <td className="text-text px-4 py-3 text-right tabular-nums">{target === null ? '-' : `${won(target)}원`}</td>
                      <td className="px-4 py-3">
                        {target === null ? (
                          <span className="text-muted text-xs">-</span>
                        ) : (
                          <input
                            value={achieved[category.key] ?? ''}
                            onChange={event => setAchieved(current => ({ ...current, [category.key]: digits(event.target.value) }))}
                            inputMode="numeric"
                            placeholder="0"
                            aria-label={`${category.label} 실적`}
                            className="text-text border-border focus-visible:ring-violet w-full rounded-control border bg-white px-3 py-2 text-right text-sm tabular-nums outline-none focus-visible:ring-2"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {remaining === null ? (
                          <span className="text-muted">-</span>
                        ) : remaining > 0 ? (
                          <span className="text-violet-strong font-semibold">{won(remaining)}원</span>
                        ) : (
                          <span className="text-highlight text-xs font-semibold">달성</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              {totalRemaining > 0 && (
                <p className="text-text text-center text-[15px]">
                  남은 분야 <strong className="font-semibold">{short.length}곳</strong> · 합계{' '}
                  <strong className="text-violet-strong font-semibold tabular-nums">{won(totalRemaining)}원</strong>
                </p>
              )}
              <Link href={requestHref} className={landingButtonClass}>
                {totalRemaining > 0 ? '남은 분야 인증 상품 견적 받기' : '인증 상품 견적 받기'}
              </Link>
            </div>
            <SourceNote>
              {MANDATORY_BASIS_NOTE} · 입력한 금액은 이 화면에서만 계산되고 어디에도 보내지 않습니다.
            </SourceNote>
          </div>
        </RevealCard>
      </div>
    </RevealSection>
  )
}

function AmountInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
}) {
  return (
    <label className="block">
      <span className="text-text text-sm font-semibold">{label}</span>
      {hint && <span className="text-muted ml-1.5 text-xs">{hint}</span>}
      <span className="relative mt-1.5 block">
        <input
          value={value ? won(Number(value)) : ''}
          onChange={event => onChange(digits(event.target.value))}
          inputMode="numeric"
          placeholder="0"
          className="text-text border-border focus-visible:ring-violet w-full rounded-control border bg-white px-4 py-3 pr-9 text-right text-lg font-semibold tabular-nums outline-none focus-visible:ring-2"
        />
        <span className="text-muted pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm">원</span>
      </span>
    </label>
  )
}
