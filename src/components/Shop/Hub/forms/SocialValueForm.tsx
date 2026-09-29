'use client'

import { useState } from 'react'

import { Field, inputClass, RequestFormFrame, RequestReceived, useContactDraft, useRequestSubmit } from '../../Requests/RequestKit'

/**
 * 장애인표준사업장 연계구매 — 살 품목과 연간 규모를 받아 표준사업장 생산품으로 견적을 모은다.
 * 감면액은 화면에서 계산하지 않는다(부담금 산식은 회사마다 달라 추정치가 약속처럼 읽힌다).
 */
export default function SocialValueForm({ stub }: { stub: boolean }) {
  const [items, setItems] = useState('')
  const [annualBudget, setAnnualBudget] = useState('')
  const [employees, setEmployees] = useState('')
  const [memo, setMemo] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const { contact, set } = useContactDraft()
  const { submit, busy, error, needsLogin, created, reset } = useRequestSubmit()

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!items.trim()) return setFormError('구매하려는 품목·서비스를 적어 주세요.')

    const ok = await submit(contact, [
      {
        type: 'SOCIAL_VALUE',
        refKey: null,
        title: `연계구매 · ${items.trim().split(/[,\n]/)[0].slice(0, 40)}`,
        quantity: null,
        details: [
          { label: '구매 품목·서비스', value: items },
          { label: '연간 구매 규모', value: annualBudget ? `${Number(annualBudget).toLocaleString('ko-KR')}원` : '' },
          { label: '상시 근로자 수', value: employees ? `${employees}명` : '' },
          { label: '메모', value: memo },
        ],
      },
    ])
    if (ok) {
      setItems('')
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
      next="/shop/request?type=social"
      submitLabel="표준사업장 견적 받기"
      footnote="연계고용 감면은 1년 이상 도급계약이 필요하고, 감면 총액은 그 해 부담금의 90% 이내·지급한 도급액의 50% 이하입니다(고용노동부 고시). 신청은 부담금 납부 연도 1월 10일까지 한국장애인고용공단 지사에 합니다."
    >
      <Field label="구매하려는 품목·서비스" hint="줄마다 하나">
        <textarea value={items} onChange={event => setItems(event.target.value)} rows={5} placeholder={'복사용지\n사무실 청소\n명절 선물세트'} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="연간 구매 규모" hint="선택 · 원">
          <input value={annualBudget} onChange={event => setAnnualBudget(event.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputClass} />
        </Field>
        <Field label="상시 근로자 수" hint="선택 · 명">
          <input value={employees} onChange={event => setEmployees(event.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputClass} />
        </Field>
      </div>
      <Field label="메모" hint="선택">
        <textarea value={memo} onChange={event => setMemo(event.target.value)} rows={3} placeholder="지금 거래 중인 표준사업장, 필요한 증빙" className={inputClass} />
      </Field>
    </RequestFormFrame>
  )
}
