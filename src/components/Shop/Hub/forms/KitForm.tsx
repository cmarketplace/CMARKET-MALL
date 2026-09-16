'use client'

import { useState } from 'react'
import Link from 'next/link'

import { KITS, findKit, type Kit } from '@/config/kits'
import { object } from '@/lib/korean'

import { Field, inputClass, RequestFormFrame, RequestReceived, useContactDraft, useRequestSubmit } from '../../Requests/RequestKit'

/** 명단 한 줄 = 한 사람. 엑셀에서 복사하면 칸이 탭으로 온다. */
function countRecipients(raw: string): number {
  return raw.split('\n').filter(line => line.trim()).length
}

/**
 * 꾸러미 견적 — 꾸러미를 고르면 기본 품목이 체크된 채로 나오고, 빼거나 더해서 보낸다.
 * 명절 선물처럼 한 사람씩 보내는 꾸러미는 받는 사람 명단을 붙여 넣는다(엑셀 복사 그대로).
 */
export default function KitForm({ today, initialKit, stub }: { today: string; initialKit: string | null; stub: boolean }) {
  const [kitKey, setKitKey] = useState(initialKit ?? KITS[0].key)
  const kit = findKit(kitKey) as Kit
  const [checked, setChecked] = useState<Record<string, boolean>>(() => essentials(kit))
  const [people, setPeople] = useState('')
  const [date, setDate] = useState('')
  const [region, setRegion] = useState('')
  const [budget, setBudget] = useState('')
  const [extra, setExtra] = useState('')
  const [recipients, setRecipients] = useState('')
  const [memo, setMemo] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const { contact, set } = useContactDraft()
  const { submit, busy, error, needsLogin, created, reset } = useRequestSubmit()

  const chooseKit = (key: string) => {
    setKitKey(key)
    setChecked(essentials(findKit(key) as Kit))
  }

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    const lines = kit.lines.filter(line => checked[line.name])
    if (lines.length === 0 && !extra.trim()) return setFormError('필요한 품목을 하나 이상 골라 주세요.')
    if (!(Number(people) > 0)) return setFormError(kit.recipientList ? '보낼 인원(수량)을 적어 주세요.' : '인원을 적어 주세요.')
    if (!date) return setFormError(`${object(kit.dateLabel)} 적어 주세요.`)
    if (kit.recipientList && countRecipients(recipients) === 0 && !region.trim()) {
      return setFormError('받는 사람 명단을 붙여 넣거나 한 곳으로 받을 주소를 적어 주세요.')
    }

    const ok = await submit(contact, [
      {
        type: 'KIT',
        refKey: kit.key,
        title: `${kit.label} 꾸러미 · ${Number(people).toLocaleString('ko-KR')}명`,
        quantity: Number(people),
        details: [
          { label: '꾸러미', value: kit.label },
          { label: '인원', value: `${people}명` },
          { label: kit.dateLabel, value: date },
          { label: '지역·주소', value: region },
          { label: '예산', value: budget ? `${Number(budget).toLocaleString('ko-KR')}원` : '' },
          { label: '고른 품목', value: lines.map(line => line.name).join(', ') },
          { label: '더할 품목', value: extra },
          { label: '받는 사람 명단', value: kit.recipientList ? recipients : '' },
          { label: '메모', value: memo },
        ],
      },
    ])
    if (ok) {
      setRecipients('')
      setMemo('')
      setExtra('')
    }
  }

  if (created) return <RequestReceived requests={created} stub={stub} onAnother={reset} anotherLabel="다른 꾸러미 견적 받기" />

  return (
    <RequestFormFrame
      onSubmit={send}
      contact={contact}
      setContact={set}
      error={formError ?? error}
      needsLogin={needsLogin}
      busy={busy}
      next={`/shop/request?type=kit&kit=${kit.key}`}
      submitLabel={`${kit.label} 견적 받기`}
    >
      <div role="radiogroup" aria-label="꾸러미" className="flex flex-wrap gap-2">
        {KITS.map(option => (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={option.key === kit.key}
            onClick={() => chooseKit(option.key)}
            className={`cursor-pointer rounded-control px-3.5 py-2 text-sm transition-colors ${
              option.key === kit.key ? 'bg-primary font-semibold text-white' : 'bg-blue-tint-2 text-primary hover:bg-accent'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div>
        <p className="text-text text-base font-semibold">{kit.headline}</p>
        <p className="text-muted mt-1 text-sm">{kit.description}</p>
      </div>

      <fieldset>
        <legend className="text-text text-sm font-semibold">담을 품목</legend>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {kit.lines.map(line => (
            <li key={line.name} className="bg-light-soft flex items-center justify-between gap-2 rounded-xl px-3 py-2.5">
              <label className="text-text flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(checked[line.name])}
                  onChange={event => setChecked(current => ({ ...current, [line.name]: event.target.checked }))}
                  className="accent-primary h-4 w-4"
                />
                {line.name}
              </label>
              <Link href={`/shop/products?q=${encodeURIComponent(line.keyword)}`} className="text-primary shrink-0 text-xs font-semibold hover:underline">
                직접 담기
              </Link>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={kit.recipientList ? '보낼 인원' : '인원'} hint="명">
          <input value={people} onChange={event => setPeople(event.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="40" className={inputClass} />
        </Field>
        <Field label={kit.dateLabel}>
          <input type="date" min={today} value={date} onChange={event => setDate(event.target.value)} className={inputClass} />
        </Field>
        <Field label="예산" hint="선택 · 원">
          <input value={budget} onChange={event => setBudget(event.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputClass} />
        </Field>
      </div>
      <Field label={kit.recipientList ? '한 곳으로 받을 주소' : '지역·주소'} hint={kit.recipientList ? '명단이 없으면' : undefined}>
        <input value={region} onChange={event => setRegion(event.target.value)} placeholder="광주 서구 내방로 111" className={inputClass} />
      </Field>
      {kit.recipientList && (
        <Field label="받는 사람 명단" hint={`엑셀에서 이름·연락처·주소 칸을 복사해 붙여 넣기 · ${countRecipients(recipients)}명`}>
          <textarea
            value={recipients}
            onChange={event => setRecipients(event.target.value)}
            rows={6}
            placeholder={'홍길동\t010-1234-5678\t서울 종로구 ...\n김철수\t010-2345-6789\t경기 성남시 ...'}
            className={`${inputClass} font-mono text-xs`}
          />
        </Field>
      )}
      <Field label="더할 품목" hint="선택">
        <input value={extra} onChange={event => setExtra(event.target.value)} placeholder="목록에 없는 품목" className={inputClass} />
      </Field>
      <Field label="메모" hint="선택">
        <textarea value={memo} onChange={event => setMemo(event.target.value)} rows={3} placeholder="로고 인쇄 파일, 포장 요청, 배송 시간" className={inputClass} />
      </Field>
    </RequestFormFrame>
  )
}

function essentials(kit: Kit): Record<string, boolean> {
  return Object.fromEntries(kit.lines.map(line => [line.name, line.essential]))
}
