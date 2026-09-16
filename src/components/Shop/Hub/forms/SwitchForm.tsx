'use client'

import { useState } from 'react'

import { OFFICE_SERVICES, SIZING_LABEL, findService } from '@/config/office-services'

import { Field, inputClass, RequestFormFrame, RequestReceived, useContactDraft, useRequestSubmit } from '../../Requests/RequestKit'

/**
 * 갈아타기 — 지금 계약 조건(월 요금·대수·만기·위약금)을 받아 같은 조건의 비교 견적을 뽑는다.
 *
 * 절감액을 화면에서 미리 계산하지 않는다. 비교 대상 단가가 견적 전에는 없다 — 여기서 «월 ○원 절약»
 * 을 그리면 그건 지어낸 숫자다.
 */
export default function SwitchForm({ initialService, stub }: { initialService: string | null; stub: boolean }) {
  const [serviceKey, setServiceKey] = useState(initialService ?? OFFICE_SERVICES.find(service => service.group === 'rental')?.key ?? '')
  const [vendor, setVendor] = useState('')
  const [fee, setFee] = useState('')
  const [size, setSize] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [penalty, setPenalty] = useState('')
  const [pain, setPain] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const { contact, set } = useContactDraft()
  const { submit, busy, error, needsLogin, created, reset } = useRequestSubmit()

  const service = findService(serviceKey)
  const sizing = service ? SIZING_LABEL[service.sizing] : SIZING_LABEL.units

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!service) return setFormError('갈아탈 서비스를 골라 주세요.')
    if (!(Number(fee) > 0)) return setFormError('지금 내는 월 요금을 적어 주세요.')

    const ok = await submit(contact, [
      {
        type: 'SWITCH',
        refKey: service.key,
        title: `갈아타기 · ${service.name}`,
        quantity: null,
        details: [
          { label: '서비스', value: service.name },
          { label: '지금 업체', value: vendor },
          { label: '월 요금', value: `${Number(fee).toLocaleString('ko-KR')}원` },
          { label: sizing.label, value: size ? `${size}${sizing.unit}` : '' },
          { label: '약정 만기', value: expiresAt },
          { label: '위약금', value: penalty ? `${Number(penalty).toLocaleString('ko-KR')}원` : '' },
          { label: '불편한 점', value: pain },
        ],
      },
    ])
    if (ok) {
      setVendor('')
      setFee('')
      setPain('')
    }
  }

  if (created) return <RequestReceived requests={created} stub={stub} onAnother={reset} anotherLabel="다른 계약도 비교하기" />

  return (
    <RequestFormFrame
      onSubmit={send}
      contact={contact}
      setContact={set}
      error={formError ?? error}
      needsLogin={needsLogin}
      busy={busy}
      next="/shop/request?type=switch"
      submitLabel="비교 견적 받기"
      footnote="비교 견적을 받아도 지금 계약은 그대로입니다. 갈아탈지는 견적을 보고 정하시면 됩니다."
    >
      <Field label="어떤 계약인가요">
        <select value={serviceKey} onChange={event => setServiceKey(event.target.value)} className={inputClass}>
          {OFFICE_SERVICES.map(option => (
            <option key={option.key} value={option.key}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="지금 월 요금" hint="부가세 포함 · 원">
          <input value={fee} onChange={event => setFee(event.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="89000" className={inputClass} />
        </Field>
        <Field label={sizing.label} hint={sizing.unit}>
          <input value={size} onChange={event => setSize(event.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder={sizing.placeholder} className={inputClass} />
        </Field>
        <Field label="지금 업체" hint="선택">
          <input value={vendor} onChange={event => setVendor(event.target.value)} className={inputClass} />
        </Field>
        <Field label="약정 만기일" hint="선택">
          <input type="date" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} className={inputClass} />
        </Field>
        <Field label="위약금" hint="알면 · 원">
          <input value={penalty} onChange={event => setPenalty(event.target.value.replace(/\D/g, ''))} inputMode="numeric" className={inputClass} />
        </Field>
      </div>
      <Field label="불편한 점" hint="선택">
        <textarea value={pain} onChange={event => setPain(event.target.value)} rows={3} placeholder="관리 방문이 늦다, 요금이 올랐다 등" className={inputClass} />
      </Field>
    </RequestFormFrame>
  )
}
