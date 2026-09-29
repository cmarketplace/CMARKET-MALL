'use client'

import { useState } from 'react'

import { MANDATORY_BASIS_NOTE, MANDATORY_CATEGORIES } from '@/config/mandatory-purchase'

import { Field, inputClass, RequestFormFrame, RequestReceived, useContactDraft, useRequestSubmit } from '../../Requests/RequestKit'

/**
 * 의무구매 인증 상품 견적 — 채울 분야와 금액, 살 품목 분야를 받아 해당 인증 공급사 상품으로 견적을 모은다.
 * 랜딩 계산기에서 넘어오면 분야와 남은 금액이 채워진 채로 열린다(`?cats=&amount=`).
 */
export default function MandatoryForm({
  today,
  initialCategories,
  initialAmount,
  stub,
}: {
  today: string
  initialCategories: string[]
  initialAmount: string
  stub: boolean
}) {
  const [categories, setCategories] = useState<string[]>(initialCategories)
  const [amount, setAmount] = useState(initialAmount)
  const [fields, setFields] = useState('')
  const [deadline, setDeadline] = useState(`${today.slice(0, 4)}-12-31`)
  const [memo, setMemo] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const { contact, set } = useContactDraft()
  const { submit, busy, error, needsLogin, created, reset } = useRequestSubmit()

  const toggle = (key: string) =>
    setCategories(current => (current.includes(key) ? current.filter(entry => entry !== key) : [...current, key]))

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (categories.length === 0) return setFormError('채울 분야를 하나 이상 골라 주세요.')
    if (!fields.trim()) return setFormError('구매하려는 품목 분야를 적어 주세요.')

    const labels = MANDATORY_CATEGORIES.filter(category => categories.includes(category.key)).map(category => category.label)
    const ok = await submit(contact, [
      {
        type: 'MANDATORY_SOURCING',
        refKey: categories.join(','),
        title: `의무구매 · ${labels[0]}${labels.length > 1 ? ` 외 ${labels.length - 1}분야` : ''}`,
        quantity: null,
        details: [
          { label: '채울 분야', value: labels.join(', ') },
          { label: '채울 금액', value: amount ? `${Number(amount).toLocaleString('ko-KR')}원` : '' },
          { label: '구매 품목 분야', value: fields },
          { label: '집행 기한', value: deadline },
          { label: '메모', value: memo },
        ],
      },
    ])
    if (ok) {
      setFields('')
      setMemo('')
    }
  }

  if (created) return <RequestReceived requests={created} stub={stub} onAnother={reset} />

  return (
    <RequestFormFrame
      onSubmit={send}
      contact={contact}
      setContact={set}
      error={formError ?? error}
      needsLogin={needsLogin}
      busy={busy}
      next="/shop/request?type=mandatory"
      submitLabel="인증 상품 견적 받기"
      footnote={MANDATORY_BASIS_NOTE}
    >
      <fieldset>
        <legend className="text-text text-sm font-semibold">채울 분야</legend>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {MANDATORY_CATEGORIES.map(category => (
            <li key={category.key}>
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${
                  categories.includes(category.key) ? 'bg-blue-tint ring-primary ring-1' : 'bg-light-soft hover:bg-bg'
                }`}
              >
                <input
                  type="checkbox"
                  checked={categories.includes(category.key)}
                  onChange={() => toggle(category.key)}
                  className="accent-primary mt-1 h-4 w-4"
                />
                <span>
                  <span className="text-text block text-sm font-semibold">{category.label}</span>
                  <span className="text-muted block text-xs">{category.target}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="채울 금액" hint="원 · 알면">
          <input value={amount} onChange={event => setAmount(event.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="12000000" className={inputClass} />
        </Field>
        <Field label="집행 기한">
          <input type="date" min={today} value={deadline} onChange={event => setDeadline(event.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="구매하려는 품목 분야" hint="줄마다 하나">
        <textarea value={fields} onChange={event => setFields(event.target.value)} rows={4} placeholder={'사무용품·복사용지\n청소 용역\n행사 기념품'} className={inputClass} />
      </Field>
      <Field label="메모" hint="선택">
        <textarea value={memo} onChange={event => setMemo(event.target.value)} rows={3} placeholder="필요한 증빙(인증서 사본, 확인서), 분할 집행 여부" className={inputClass} />
      </Field>
    </RequestFormFrame>
  )
}
