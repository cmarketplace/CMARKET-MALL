'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, PauseCircle, PlayCircle, XCircle } from 'lucide-react'

import { fetchSubscription, subscriptionAction, updateSubscription } from '@/lib/subscribe'
import {
  CYCLE_STATUS_LABEL,
  SUBSCRIPTION_STATUS_HINT,
  SUBSCRIPTION_STATUS_LABEL,
  type Subscription,
  type SubscriptionCycle,
} from '@/lib/subscription-types'

const won = (n: number) => n.toLocaleString('ko-KR')

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(
    new Date(iso),
  )
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(iso))

const STATUS_TONE: Record<Subscription['status'], string> = {
  ACTIVE: 'bg-highlight-soft text-highlight-strong',
  PAYMENT_FAILED: 'bg-[#FDECEC] text-[#B3261E]',
  PAUSED: 'bg-bg text-muted-strong',
  CANCELED: 'bg-bg text-muted',
}

/**
 * 내 구독 목록 — 상태·다음 결제일·마지막 주문과 일시정지/재개/해지/인원 변경.
 *
 * 조작은 전부 서버 라우트를 거쳐 세모에서 일어나고, 끝나면 `router.refresh()` 로 서버 렌더를 다시
 * 받는다 — 화면 상태를 손으로 맞추다 어긋나는 것보다 정본을 다시 읽는 편이 낫다.
 */
export default function SubscriptionList({ subscriptions }: { subscriptions: Subscription[] }) {
  return (
    <ol className="mt-6 space-y-4">
      {subscriptions.map(subscription => (
        <SubscriptionCard key={subscription.id} subscription={subscription} />
      ))}
    </ol>
  )
}

function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cycles, setCycles] = useState<SubscriptionCycle[] | null>(null)
  const [open, setOpen] = useState(false)
  const [editingPeople, setEditingPeople] = useState(false)
  const [peopleDraft, setPeopleDraft] = useState(String(subscription.people))

  const isCanceled = subscription.status === 'CANCELED'
  const canPause = subscription.status === 'ACTIVE' || subscription.status === 'PAYMENT_FAILED'
  const canResume = subscription.status === 'PAUSED'

  const run = async (label: string, work: () => Promise<unknown>) => {
    setBusy(label)
    setError(null)
    try {
      await work()
      setCycles(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '변경하지 못했습니다.')
    } finally {
      setBusy(null)
    }
  }

  const toggleCycles = async () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (cycles === null) {
      try {
        const detail = await fetchSubscription(subscription.id)
        setCycles(detail.cycles ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '결제 기록을 불러오지 못했습니다.')
      }
    }
  }

  const savePeople = () =>
    run('people', async () => {
      const people = Number.parseInt(peopleDraft, 10)
      if (!Number.isInteger(people) || people < 1) throw new Error('인원을 확인해 주세요.')
      await updateSubscription(subscription.id, { people })
      setEditingPeople(false)
    })

  const { estimate } = subscription

  return (
    <li className="bg-light-soft rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-text text-base font-semibold">
            {subscription.plan.name}
            <span className="text-muted ml-2 text-sm font-normal">
              {subscription.people}명 · {subscription.frequency.label}
            </span>
          </h2>
          <p className="text-muted mt-0.5 text-xs">
            신청 {formatDate(subscription.createdAt)} · {subscription.shipTo.name}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_TONE[subscription.status]}`}>
          {SUBSCRIPTION_STATUS_LABEL[subscription.status]}
        </span>
      </div>

      <p className="text-muted mt-3 text-xs leading-5">{SUBSCRIPTION_STATUS_HINT[subscription.status]}</p>
      {subscription.status === 'PAUSED' && subscription.pauseReason && (
        <p className="text-muted mt-1 text-xs leading-5">사유: {subscription.pauseReason}</p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted text-xs">다음 결제일</dt>
          <dd className="text-text font-medium">
            {subscription.nextBillingAt ? formatDate(subscription.nextBillingAt) : '-'}
          </dd>
        </div>
        <div>
          <dt className="text-muted text-xs">1회 결제 예상(포인트)</dt>
          <dd className="text-text font-medium tabular-nums">
            {estimate.cyclePayable !== null ? `${won(estimate.cyclePayable)}원` : '-'}
          </dd>
        </div>
        <div>
          <dt className="text-muted text-xs">월 예상(공급가액)</dt>
          <dd className="text-text font-medium tabular-nums">
            {estimate.monthlySupply !== null ? `${won(estimate.monthlySupply)}원` : '-'}
          </dd>
        </div>
        <div>
          <dt className="text-muted text-xs">마지막 주문</dt>
          <dd className="text-text font-medium">
            {subscription.lastOrderNo ? (
              <Link
                href={`/shop/order-complete?orderNo=${encodeURIComponent(subscription.lastOrderNo)}`}
                className="font-mono hover:underline"
              >
                {subscription.lastOrderNo}
              </Link>
            ) : (
              '-'
            )}
          </dd>
        </div>
      </dl>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-5 text-[#B3261E]">
          {error}
        </p>
      )}

      <div className="border-bg mt-4 flex flex-wrap items-center gap-2 border-t border-dashed pt-3">
        {!isCanceled &&
          (editingPeople ? (
            <span className="flex items-center gap-2 text-sm">
              <input
                inputMode="numeric"
                value={peopleDraft}
                onChange={event => setPeopleDraft(event.target.value.replace(/[^0-9]/g, ''))}
                aria-label="인원"
                className="text-text w-16 rounded-control border border-border bg-white px-2 py-1.5 text-right text-sm font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <span className="text-muted">명</span>
              <button
                type="button"
                onClick={savePeople}
                disabled={busy !== null}
                className="bg-primary hover:bg-primary-dark cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-60"
              >
                {busy === 'people' ? '저장 중…' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingPeople(false)
                  setPeopleDraft(String(subscription.people))
                }}
                className="text-muted hover:text-text cursor-pointer px-2 py-1.5 text-xs"
              >
                취소
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setEditingPeople(true)}
              className="text-primary hover:bg-blue-tint-2 cursor-pointer rounded-full border border-primary/40 px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              인원 변경
            </button>
          ))}

        {canPause && (
          <button
            type="button"
            onClick={() => run('pause', () => subscriptionAction(subscription.id, 'pause'))}
            disabled={busy !== null}
            className="text-muted-strong hover:bg-bg flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
          >
            <PauseCircle size={14} strokeWidth={1.8} />
            {busy === 'pause' ? '정지 중…' : '일시정지'}
          </button>
        )}
        {canResume && (
          <button
            type="button"
            onClick={() => run('resume', () => subscriptionAction(subscription.id, 'resume'))}
            disabled={busy !== null}
            className="text-highlight-strong hover:bg-highlight-soft flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
          >
            <PlayCircle size={14} strokeWidth={1.8} />
            {busy === 'resume' ? '재개 중…' : '재개'}
          </button>
        )}
        {!isCanceled && (
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('구독을 해지할까요? 이미 선 주문은 그대로 진행됩니다.')) return
              void run('cancel', () => subscriptionAction(subscription.id, 'cancel', '내 구독에서 해지'))
            }}
            disabled={busy !== null}
            className="text-muted hover:bg-bg flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
          >
            <XCircle size={14} strokeWidth={1.8} />
            {busy === 'cancel' ? '해지 중…' : '해지'}
          </button>
        )}

        <button
          type="button"
          onClick={toggleCycles}
          aria-expanded={open}
          className="text-muted hover:text-text ml-auto flex cursor-pointer items-center gap-1 px-2 py-1.5 text-xs"
        >
          결제 기록
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {open && (
        <div className="mt-3 overflow-x-auto rounded-xl bg-white">
          {cycles === null ? (
            <p className="text-muted px-4 py-3 text-xs">불러오는 중…</p>
          ) : cycles.length === 0 ? (
            <p className="text-muted px-4 py-3 text-xs">아직 결제 기록이 없습니다.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-muted">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">회차</th>
                  <th className="px-2 py-2 font-medium">결제 예정</th>
                  <th className="px-2 py-2 font-medium">상태</th>
                  <th className="px-2 py-2 font-medium">주문번호</th>
                  <th className="px-2 py-2 font-medium">비고</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map(cycle => (
                  <tr key={cycle.cycleNo} className="border-bg border-t">
                    <td className="text-text px-4 py-2 tabular-nums">{cycle.cycleNo}</td>
                    <td className="text-text px-2 py-2 whitespace-nowrap">{formatDateTime(cycle.billingAt)}</td>
                    <td className="px-2 py-2">
                      <span className={cycle.status === 'FAILED' ? 'font-semibold text-[#B3261E]' : 'text-text'}>
                        {CYCLE_STATUS_LABEL[cycle.status]}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      {cycle.orderNo ? (
                        <Link
                          href={`/shop/order-complete?orderNo=${encodeURIComponent(cycle.orderNo)}`}
                          className="text-text font-mono hover:underline"
                        >
                          {cycle.orderNo}
                        </Link>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="text-muted max-w-[280px] truncate px-2 py-2" title={cycle.failureReason ?? undefined}>
                      {cycle.attempts > 1 && `${cycle.attempts}회 시도 · `}
                      {cycle.failureReason ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </li>
  )
}
