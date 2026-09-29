'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'

import { Field, inputClass, RequestFormFrame, RequestReceived, useContactDraft, useRequestSubmit } from '../../Requests/RequestKit'

/**
 * 구해드림 — 몰에 없는 물건·급한 물건. `급해요` 를 켜면 필요일이 필수가 되고 제목이 «긴급 조달» 로
 * 바뀌어 운영자가 목록에서 먼저 알아본다(refKey `urgent` 로도 거를 수 있다).
 */
export default function SourcingForm({
  today,
  initialUrgent,
  initialItem,
  stub,
}: {
  today: string
  initialUrgent: boolean
  initialItem: string
  stub: boolean
}) {
  const [name, setName] = useState(initialItem)
  const [spec, setSpec] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('개')
  const [urgent, setUrgent] = useState(initialUrgent)
  const [neededBy, setNeededBy] = useState('')
  const [link, setLink] = useState('')
  const [budget, setBudget] = useState('')
  const [address, setAddress] = useState('')
  const [memo, setMemo] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const { contact, set } = useContactDraft()
  const { submit, busy, error, needsLogin, created, reset } = useRequestSubmit()

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!name.trim()) return setFormError('찾는 물건의 이름을 적어 주세요.')
    if (!(Number(quantity) > 0)) return setFormError('필요한 수량을 적어 주세요.')
    if (urgent && !neededBy) return setFormError('급한 요청은 꼭 필요한 날짜를 적어 주세요.')
    if (!address.trim()) return setFormError('받을 주소(지역)를 적어 주세요.')

    const ok = await submit(contact, [
      {
        type: 'SOURCING',
        refKey: urgent ? 'urgent' : null,
        title: `${urgent ? '긴급 조달' : '구해드림'} · ${name.trim()}`,
        quantity: Number(quantity),
        details: [
          { label: '품명', value: name },
          { label: '규격·모델', value: spec },
          { label: '수량', value: `${Number(quantity).toLocaleString('ko-KR')}${unit}` },
          { label: '필요일', value: neededBy },
          { label: '참고 링크', value: link },
          { label: '예산', value: budget ? `${Number(budget).toLocaleString('ko-KR')}원` : '' },
          { label: '주소', value: address },
          { label: '메모', value: memo },
        ],
      },
    ])
    if (ok) {
      setName('')
      setSpec('')
      setQuantity('')
      setLink('')
      setMemo('')
    }
  }

  if (created) return <RequestReceived requests={created} stub={stub} onAnother={reset} anotherLabel="다른 물건 찾기" />

  return (
    <RequestFormFrame
      onSubmit={send}
      contact={contact}
      setContact={set}
      error={formError ?? error}
      needsLogin={needsLogin}
      busy={busy}
      next="/shop/request?type=sourcing"
      submitLabel={urgent ? '긴급 조달 요청하기' : '구해 달라고 요청하기'}
      footnote="견적이 오기 전에는 아무것도 주문되지 않습니다. 견적을 보고 확정하시면 몰 주문으로 이어집니다."
    >
      <button
        type="button"
        onClick={() => setUrgent(value => !value)}
        aria-pressed={urgent}
        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
          urgent ? 'bg-navy text-white' : 'bg-light-soft text-text hover:bg-bg'
        }`}
      >
        <Zap size={18} aria-hidden="true" className={urgent ? 'text-mint' : 'text-primary'} />
        <span className="flex-1">
          <span className="block text-sm font-semibold">급해요 — 오늘·내일 받아야 합니다</span>
          <span className={`block text-xs ${urgent ? 'text-on-dark-muted' : 'text-muted'}`}>
            켜면 필요일에 맞출 수 있는 공급사부터 찾습니다
          </span>
        </span>
        <span className={`text-xs font-semibold ${urgent ? 'text-mint' : 'text-muted'}`}>{urgent ? '켜짐' : '꺼짐'}</span>
      </button>

      <Field label="품명">
        <input value={name} onChange={event => setName(event.target.value)} placeholder="예: 실험실용 흄후드 필터" className={inputClass} />
      </Field>
      <Field label="규격·모델" hint="알면">
        <input value={spec} onChange={event => setSpec(event.target.value)} placeholder="제조사, 모델명, Cat. No, 사이즈" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="수량">
          <input value={quantity} onChange={event => setQuantity(event.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="10" className={inputClass} />
        </Field>
        <Field label="단위">
          <select value={unit} onChange={event => setUnit(event.target.value)} className={inputClass}>
            {['개', '박스', '세트', '팩', '롤', 'kg', 'L', '식'].map(option => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="필요일" hint={urgent ? '필수' : '선택'}>
          <input type="date" min={today} value={neededBy} onChange={event => setNeededBy(event.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="참고 링크" hint="사진·상품 페이지 주소">
        <input value={link} onChange={event => setLink(event.target.value)} placeholder="https://" inputMode="url" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="예산" hint="선택 · 원">
          <input value={budget} onChange={event => setBudget(event.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="500000" className={inputClass} />
        </Field>
        <Field label="받을 주소">
          <input value={address} onChange={event => setAddress(event.target.value)} placeholder="부산 남구 문현금융로 40" className={inputClass} />
        </Field>
      </div>
      <Field label="메모" hint="선택">
        <textarea value={memo} onChange={event => setMemo(event.target.value)} rows={3} placeholder="대체품 가능 여부, 필요한 서류(시험성적서 등)" className={inputClass} />
      </Field>
    </RequestFormFrame>
  )
}
