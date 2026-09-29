'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

import { groupBuyRefKey, type GroupBuyCampaign, type GroupBuyStage } from '@/config/group-buys'
import { formatKDate } from '@/lib/kdate'
import { topic } from '@/lib/korean'
import type { MallRequestTally } from '@/lib/request-types'

import {
  ContactFieldset,
  Field,
  inputClass,
  RequestReceived,
  SubmitError,
  useContactDraft,
  useRequestSubmit,
} from '../Requests/RequestKit'
import GroupBuyProgress from './GroupBuyProgress'

interface GroupBuyHubProps {
  campaign: GroupBuyCampaign
  stage: GroupBuyStage
  tallies: MallRequestTally[]
  /** 내가 이미 참여한 품목 */
  mine: { refKey: string; quantity: number | null; requestNo: string }[]
  stub: boolean
}

const num = (n: number) => n.toLocaleString('ko-KR')

/**
 * 공동구매 참여 — 품목마다 필요 수량을 적고 한 번에 보낸다(품목 하나 = 요청 하나).
 *
 * 품목별로 나누는 이유: 막대 집계가 refKey(`캠페인:품목`) 단위다. 한 요청에 세 품목을 넣으면
 * 세모가 details 를 해석해야 집계할 수 있다 — 세모는 details 를 해석하지 않는다.
 */
export default function GroupBuyHub({ campaign, stage, tallies, mine, stub }: GroupBuyHubProps) {
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [region, setRegion] = useState('')
  const [memo, setMemo] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const { contact, set } = useContactDraft()
  const { submit, busy, error, needsLogin, created, reset } = useRequestSubmit()

  const open = stage === 'survey'
  const steps = [
    { label: '수요조사', detail: `${formatKDate(campaign.surveyClosesAt)}까지` },
    { label: '공급사 입찰', detail: campaign.biddingPeriod },
    { label: '최종가 공개·참여 확정', detail: campaign.confirmPeriod },
    { label: '납품', detail: campaign.deliveryFrom },
  ]

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const picks = campaign.items
      .map(item => ({ item, quantity: Number(quantities[item.key] || 0) }))
      .filter(pick => pick.quantity > 0)

    if (picks.length === 0) return setFormError('참여할 품목의 수량을 하나 이상 적어 주세요.')
    const short = picks.find(pick => pick.quantity < pick.item.minQuantity)
    if (short) {
      return setFormError(`${topic(short.item.name)} ${num(short.item.minQuantity)}${short.item.unit}부터 참여할 수 있습니다.`)
    }
    if (!region.trim()) return setFormError('납품 받을 지역을 적어 주세요.')

    const ok = await submit(
      contact,
      picks.map(({ item, quantity }) => ({
        type: 'GROUP_BUY_PLEDGE' as const,
        refKey: groupBuyRefKey(campaign.key, item.key),
        title: `${campaign.title} · ${item.name} ${num(quantity)}${item.unit}`,
        quantity,
        details: [
          { label: '품목', value: `${item.name} (${item.spec})` },
          { label: '필요 수량', value: `${num(quantity)}${item.unit}` },
          { label: '납품 지역', value: region },
          { label: '메모', value: memo },
        ],
      })),
    )
    if (ok) {
      setQuantities({})
      setMemo('')
    }
  }

  return (
    <div className="space-y-8">
      <ol className="grid gap-2 sm:grid-cols-4">
        {steps.map((step, index) => {
          const active = open ? index === 0 : index === 1
          return (
            <li
              key={step.label}
              className={`rounded-xl px-4 py-3 ${active ? 'bg-primary text-white' : 'bg-light-soft text-text'}`}
            >
              <span className={`text-[11px] font-semibold ${active ? 'text-white/80' : 'text-muted'}`}>{index + 1}단계</span>
              <span className="block text-sm font-semibold">{step.label}</span>
              <span className={`block text-xs ${active ? 'text-white/85' : 'text-muted'}`}>{step.detail}</span>
            </li>
          )
        })}
      </ol>

      <p className="text-muted text-xs">{campaign.basis}</p>

      {created ? (
        <RequestReceived requests={created} stub={stub} onAnother={reset} anotherLabel="다른 품목도 참여하기" />
      ) : (
        <form onSubmit={send} className="space-y-6">
          <ul className="grid gap-4 lg:grid-cols-3">
            {campaign.items.map(item => {
              const refKey = groupBuyRefKey(campaign.key, item.key)
              const tally = tallies.find(entry => entry.refKey === refKey) ?? null
              const joined = mine.filter(entry => entry.refKey === refKey)
              return (
                <li key={item.key} className="border-border flex flex-col rounded-2xl border bg-white p-5">
                  <h3 className="text-text text-lg font-semibold">{item.name}</h3>
                  <p className="text-muted mt-0.5 text-sm">{item.spec}</p>

                  <div className="mt-5">
                    <GroupBuyProgress item={item} tally={tally} />
                  </div>

                  {joined.length > 0 && (
                    <p className="bg-highlight-soft text-highlight-strong mt-4 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold">
                      <CheckCircle2 size={13} aria-hidden="true" />
                      참여함 ·{' '}
                      {joined.map(entry => `${num(entry.quantity ?? 0)}${item.unit}`).join(' + ')}
                    </p>
                  )}

                  <div className="mt-auto pt-5">
                    <Field label="필요 수량" hint={`${num(item.minQuantity)}${item.unit}부터`}>
                      <span className="relative block">
                        <input
                          value={quantities[item.key] ?? ''}
                          onChange={event =>
                            setQuantities(current => ({ ...current, [item.key]: event.target.value.replace(/\D/g, '') }))
                          }
                          inputMode="numeric"
                          placeholder="0"
                          disabled={!open}
                          className={`${inputClass} pr-10 tabular-nums disabled:opacity-50`}
                        />
                        <span className="text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                          {item.unit}
                        </span>
                      </span>
                    </Field>
                    <Link
                      href={`/shop/products?q=${encodeURIComponent(item.keyword)}`}
                      className="text-primary mt-2 inline-block text-xs font-semibold hover:underline"
                    >
                      지금 몰 판매가 보기
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>

          {open ? (
            <div className="border-border grid gap-5 rounded-2xl border p-5 lg:grid-cols-2">
              <div className="space-y-4">
                <Field label="납품 지역" hint="시·군·구">
                  <input value={region} onChange={event => setRegion(event.target.value)} placeholder="대전 유성구" className={inputClass} />
                </Field>
                <Field label="메모" hint="선택">
                  <textarea
                    value={memo}
                    onChange={event => setMemo(event.target.value)}
                    rows={3}
                    placeholder="분할 납품, 희망 규격 등"
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="space-y-4">
                <ContactFieldset contact={contact} set={set} />
                <SubmitError error={formError ?? error} needsLogin={needsLogin} next="/shop/group-buy" />
                <button
                  type="submit"
                  disabled={busy}
                  className="bg-primary hover:bg-primary-dark h-12 w-full cursor-pointer rounded-control text-sm font-semibold text-white transition-colors disabled:opacity-60"
                >
                  {busy ? '보내는 중…' : '수요조사 참여하기'}
                </button>
                <p className="text-muted text-xs leading-5">
                  참여는 구매 약속이 아닙니다. 최종가가 공개되면 담당자 연락처로 알려 드리고, 확정 기간 안에 확정한 곳만
                  주문이 섭니다.
                </p>
              </div>
            </div>
          ) : (
            <p className="bg-light-soft text-muted rounded-2xl px-5 py-4 text-sm">
              수요조사가 마감되어 공급사 입찰이 진행 중입니다. 최종가는 참여하신 담당자께 먼저 알려 드립니다.
            </p>
          )}
        </form>
      )}
    </div>
  )
}
