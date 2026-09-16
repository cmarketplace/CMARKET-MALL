'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, CalendarClock, Check, Plus, Scale, X } from 'lucide-react'

import {
  OFFICE_SERVICES,
  SERVICE_GROUPS,
  SIZING_LABEL,
  type OfficeService,
  type ServiceGroupKey,
} from '@/config/office-services'
import type { MallRequestField } from '@/lib/request-types'
import { object } from '@/lib/korean'

import {
  ContactFieldset,
  Field,
  inputClass,
  RequestReceived,
  SubmitError,
  useContactDraft,
  useRequestSubmit,
} from '../Requests/RequestKit'
import { serviceIcon } from './serviceIcons'

interface ServicesHubProps {
  /** KST 오늘 — 선예약 배지의 달을 서버와 같게 센다 */
  today: string
  preselected: string | null
  /** 세모에 살아 있는 구독 상품 key — «바로 구독» 문을 여는 기준 */
  livePlanKeys: string[]
  stub: boolean
}

interface Selection {
  size: string
  cycle: string
}

/**
 * 사무실 관리 허브 — 왼쪽은 서비스 카드, 오른쪽(모바일은 아래)은 쌓이는 견적 요청서.
 *
 * 카드를 누르면 요청서에 한 줄이 생기고, 줄마다 인원·면적·대수와 주기를 적는다. 다 적으면 한 번에
 * 보낸다 — 서비스가 셋이어도 요청은 한 건(`SERVICE_QUOTE`, refKey = 서비스 key 목록)이다.
 * 운영자는 그 한 건에 견적서 한 장을 붙인다.
 */
export default function ServicesHub({ today, preselected, livePlanKeys, stub }: ServicesHubProps) {
  const month = Number(today.slice(5, 7))
  const [group, setGroup] = useState<ServiceGroupKey | 'all'>('all')
  const [selected, setSelected] = useState<Record<string, Selection>>(() => {
    const service = OFFICE_SERVICES.find(entry => entry.key === preselected)
    return service ? { [service.key]: { size: '', cycle: service.cycles[0] } } : {}
  })
  const [address, setAddress] = useState('')
  const [startDate, setStartDate] = useState('')
  const [memo, setMemo] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const { contact, set } = useContactDraft()
  const { submit, busy, error, needsLogin, created, reset } = useRequestSubmit()

  const visible = group === 'all' ? OFFICE_SERVICES : OFFICE_SERVICES.filter(service => service.group === group)
  const chosen = OFFICE_SERVICES.filter(service => selected[service.key])

  const toggle = (service: OfficeService) => {
    setSelected(current => {
      if (current[service.key]) {
        const next = { ...current }
        delete next[service.key]
        return next
      }
      return { ...current, [service.key]: { size: '', cycle: service.cycles[0] } }
    })
  }

  const update = (key: string, patch: Partial<Selection>) =>
    setSelected(current => ({ ...current, [key]: { ...current[key], ...patch } }))

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (chosen.length === 0) return setFormError('견적 받을 서비스를 하나 이상 골라 주세요.')
    const missing = chosen.find(service => !(Number(selected[service.key].size) > 0))
    if (missing) {
      return setFormError(`${missing.name}의 ${object(SIZING_LABEL[missing.sizing].label)} 적어 주세요.`)
    }
    if (!address.trim()) return setFormError('서비스 받을 주소(지역)를 적어 주세요.')

    const details: MallRequestField[] = [
      ...chosen.map(service => {
        const pick = selected[service.key]
        const sizing = SIZING_LABEL[service.sizing]
        return { label: service.name, value: `${sizing.label} ${pick.size}${sizing.unit} · ${pick.cycle}` }
      }),
      { label: '주소', value: address },
      { label: '희망 시작일', value: startDate },
      { label: '메모', value: memo },
    ]

    const title =
      chosen.length === 1 ? `${chosen[0].name} 견적` : `${chosen[0].name} 외 ${chosen.length - 1}건 견적`

    const ok = await submit(contact, [
      {
        type: 'SERVICE_QUOTE',
        refKey: chosen.map(service => service.key).join(','),
        title,
        quantity: null,
        details,
      },
    ])
    if (ok) {
      setSelected({})
      setMemo('')
    }
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div>
        <div role="tablist" aria-label="서비스 분류" className="flex flex-wrap gap-2">
          {[{ key: 'all' as const, label: '전체' }, ...SERVICE_GROUPS].map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={group === tab.key}
              onClick={() => setGroup(tab.key)}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm transition-colors ${
                group === tab.key ? 'bg-text font-semibold text-white' : 'bg-bg text-muted-strong hover:bg-bg-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {visible.map(service => {
            const Icon = serviceIcon(service.key)
            const isSelected = Boolean(selected[service.key])
            const preorder = service.preorderMonths?.includes(month)
            const live = service.planKey !== null && livePlanKeys.includes(service.planKey)

            return (
              <li
                key={service.key}
                className={`flex flex-col rounded-2xl border p-5 transition-colors ${
                  isSelected ? 'border-primary bg-blue-tint' : 'border-border bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="bg-blue-tint-2 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-text text-base font-semibold">{service.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {preorder && (
                        <span className="bg-highlight-soft text-highlight-strong inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                          <CalendarClock size={11} aria-hidden="true" /> 지금 선예약
                        </span>
                      )}
                      {service.legalKey && (
                        <span className="bg-bg text-muted-strong inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                          <Scale size={11} aria-hidden="true" /> 법정 점검
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-muted mt-3 text-sm leading-6">{service.summary}</p>
                <ul className="mt-3 space-y-1">
                  {service.includes.map(line => (
                    <li key={line} className="text-muted-strong flex items-center gap-1.5 text-[13px]">
                      <Check size={13} className="text-highlight shrink-0" aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>

                <p className="mt-4 flex items-center gap-1.5 text-xs">
                  <BadgeCheck size={14} className={service.vendor ? 'text-highlight' : 'text-muted'} aria-hidden="true" />
                  {service.vendor ? (
                    <span className="text-text">
                      씨마켓 지정 업체 <strong className="font-semibold">{service.vendor.name}</strong>
                    </span>
                  ) : (
                    <span className="text-muted">지정 업체 선정 중 · 견적은 지금 받습니다</span>
                  )}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => toggle(service)}
                    aria-pressed={isSelected}
                    className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-control px-4 text-sm font-semibold transition-colors ${
                      isSelected
                        ? 'bg-primary hover:bg-primary-dark text-white'
                        : 'bg-blue-tint-2 text-primary hover:bg-accent'
                    }`}
                  >
                    {isSelected ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
                    {isSelected ? '요청서에 담김' : '견적 요청서에 담기'}
                  </button>
                  {live && (
                    <Link
                      href="/shop#subscribe"
                      className="text-primary rounded-control px-3 py-2 text-sm font-semibold hover:underline"
                    >
                      바로 구독
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* 요청서가 화면보다 길어지면(서비스를 여럿 담으면) 고정된 채 안에서 굴러야 «보내기» 에 손이 닿는다 */}
      <aside className="lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
        {created ? (
          <RequestReceived requests={created} stub={stub} onAnother={reset} anotherLabel="다른 서비스 견적 받기" />
        ) : (
          <form onSubmit={send} className="border-border space-y-5 rounded-2xl border bg-white p-5 shadow-[0_12px_40px_rgba(1,35,80,0.06)]">
            <div>
              <h2 className="text-text text-lg font-semibold">견적 요청서</h2>
              <p className="text-muted mt-0.5 text-xs">
                담은 서비스 {chosen.length}건 · 한 번에 보내고 견적서 한 장으로 받습니다
              </p>
            </div>

            {chosen.length === 0 ? (
              <p className="bg-light-soft text-muted rounded-xl px-4 py-6 text-center text-sm">
                왼쪽에서 서비스를 담아 주세요.
              </p>
            ) : (
              <ul className="space-y-3">
                {chosen.map(service => {
                  const pick = selected[service.key]
                  const sizing = SIZING_LABEL[service.sizing]
                  return (
                    <li key={service.key} className="bg-light-soft rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text text-sm font-semibold">{service.name}</span>
                        <button
                          type="button"
                          onClick={() => toggle(service)}
                          aria-label={`${service.name} 빼기`}
                          className="text-muted hover:bg-bg-secondary flex h-7 w-7 cursor-pointer items-center justify-center rounded-full"
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <label className="relative w-28 shrink-0">
                          <span className="sr-only">{sizing.label}</span>
                          <input
                            value={pick.size}
                            onChange={event => update(service.key, { size: event.target.value.replace(/\D/g, '') })}
                            placeholder={sizing.placeholder}
                            inputMode="numeric"
                            className={`${inputClass} pr-8`}
                          />
                          <span className="text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                            {sizing.unit}
                          </span>
                        </label>
                        <label className="min-w-0 flex-1">
                          <span className="sr-only">주기</span>
                          <select
                            value={pick.cycle}
                            onChange={event => update(service.key, { cycle: event.target.value })}
                            className={inputClass}
                          >
                            {service.cycles.map(cycle => (
                              <option key={cycle}>{cycle}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <Field label="주소" hint="시·구까지만 적어도 됩니다">
              <input value={address} onChange={event => setAddress(event.target.value)} placeholder="서울 중구 세종대로 110" className={inputClass} />
            </Field>
            <Field label="희망 시작일" hint="선택">
              <input type="date" value={startDate} min={today} onChange={event => setStartDate(event.target.value)} className={inputClass} />
            </Field>
            <Field label="메모" hint="선택">
              <textarea
                value={memo}
                onChange={event => setMemo(event.target.value)}
                rows={3}
                placeholder="출입 시간, 지금 쓰는 업체, 요청 사항"
                className={inputClass}
              />
            </Field>

            <ContactFieldset contact={contact} set={set} />

            <SubmitError error={formError ?? error} needsLogin={needsLogin} next="/shop/services" />

            <button
              type="submit"
              disabled={busy}
              className="bg-primary hover:bg-primary-dark h-12 w-full cursor-pointer rounded-control text-sm font-semibold text-white transition-colors disabled:opacity-60"
            >
              {busy ? '보내는 중…' : `견적 요청 보내기${chosen.length > 0 ? ` (${chosen.length}건)` : ''}`}
            </button>
          </form>
        )}
      </aside>
    </div>
  )
}
