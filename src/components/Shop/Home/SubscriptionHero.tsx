'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Cookie, Package, SprayCan, FileText, Coins, CheckCircle2, AlertCircle } from 'lucide-react'

import {
  BUNDLE_DISCOUNT_RATE,
  clampPeople,
  estimateMonthly,
  MAX_PEOPLE,
  MIN_PEOPLE,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan as PreviewPlan,
} from '@/config/subscriptions'
import {
  getShipToServerSnapshot,
  getShipToSnapshot,
  LoginRequiredError,
  requestQuote,
  setShipTo,
  subscribeShipTo,
} from '@/lib/place-order'
import type { OrderShipTo } from '@/lib/order-types'
import type { StorefrontQuote } from '@/lib/quote-types'
import { subscribe } from '@/lib/subscribe'
import {
  clampPlanPeople,
  previewSubscription,
  type SubscribeResult,
  type SubscriptionPlan,
} from '@/lib/subscription-types'

interface SubscriptionHeroProps {
  loggedIn: boolean
  /** 세모에 등록된 구독 상품. 비어 있으면 몰 자체 예상 산식(미리보기)으로 그린다. */
  plans: SubscriptionPlan[]
  /** 씨마켓 포인트 잔액 힌트. 못 읽었으면 null. */
  pointBalance: number | null
}

const won = (n: number) => n.toLocaleString('ko-KR')

const ICONS: Record<string, typeof Cookie> = {
  clean: SprayCan,
  snack: Cookie,
  supply: Package,
}

const iconFor = (key: string) => ICONS[key] ?? Package

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(new Date(iso))

/**
 * 정기구독 히어로 — 인원수 하나로 세 구독의 월 예산이 나온다.
 *
 * 세모에 구독 상품이 등록돼 있으면(`plans`) **진짜 신청**이다: 인원·주기·배송지를 정하면 첫 주기가
 * 그 자리에서 씨마켓 포인트로 결제되고 주문이 선다. 이후는 결제일 아침마다 자동이다(대표 결정 D4).
 * 단가는 세모가 준 지금 오퍼 단가라 «예상» 이 아니라 «지금 값» 이지만, 실제 청구는 주기마다 서는
 * 주문이 정하므로 문구는 여전히 «예상» 을 붙인다.
 *
 * 세모에 상품이 없으면 예전 그대로 몰 설정의 예상 산식(`config/subscriptions.ts`)으로 그리고
 * 견적서만 낸다 — 미리보기라는 사실을 화면이 숨기지 않는다.
 */
export default function SubscriptionHero({ loggedIn, plans, pointBalance }: SubscriptionHeroProps) {
  if (plans.length > 0) {
    return <LivePlans loggedIn={loggedIn} plans={plans} pointBalance={pointBalance} />
  }
  return <PreviewPlans loggedIn={loggedIn} />
}

/* ── 세모 상품 = 진짜 신청 ─────────────────────────────────────────────── */

function LivePlans({ loggedIn, plans, pointBalance }: SubscriptionHeroProps) {
  const [peopleDraft, setPeopleDraft] = useState('30')
  const [frequency, setFrequency] = useState<Record<string, number>>(
    Object.fromEntries(plans.map(plan => [plan.key, plan.defaultFrequency])),
  )
  const [applying, setApplying] = useState<SubscriptionPlan | null>(null)
  const [results, setResults] = useState<Record<string, SubscribeResult>>({})

  const rawPeople = Number.parseInt(peopleDraft, 10)
  const rows = plans.map(plan => {
    const people = clampPlanPeople(plan, rawPeople)
    const frequencyIndex = frequency[plan.key] ?? plan.defaultFrequency
    return { plan, people, frequencyIndex, preview: previewSubscription(plan, people, frequencyIndex) }
  })
  const total = rows.reduce((sum, row) => sum + (row.preview?.monthlySupply ?? 0), 0)
  const minPeople = Math.min(...plans.map(plan => plan.minPeople))
  const maxPeople = Math.max(...plans.map(plan => plan.maxPeople))

  return (
    <section
      id="subscribe"
      className="scroll-mt-28 rounded-3xl bg-[linear-gradient(160deg,#f4f9fd_0%,#e5f2fa_60%,#dceefb_100%)] p-6 sm:p-8 lg:p-10"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.6fr)] lg:gap-12">
        <div>
          <span className="text-primary ring-primary/35 inline-flex h-8 items-center rounded-full px-4 text-[13px] font-medium ring-1">
            정기구독
          </span>
          <h1 className="text-navy mt-5 break-keep text-[28px] leading-[1.25] font-semibold tracking-tight sm:text-[34px]">
            사무실 운영, 매달 챙기지 말고
            <br />
            <span className="text-primary">한 번만</span> 정하세요
          </h1>
          <p className="text-muted mt-4 text-[15px] leading-[1.8]">
            인원수만 넣으면 월 예산이 바로 나옵니다. 신청하면 첫 회는 지금 씨마켓 포인트로 결제되고,
            이후는 결제일 아침 9시에 자동으로 주문이 섭니다.
          </p>

          <label className="mt-6 flex items-center gap-3 text-sm">
            <span className="text-text font-semibold">우리 사무실 인원</span>
            <input
              inputMode="numeric"
              value={peopleDraft}
              onChange={event => setPeopleDraft(event.target.value.replace(/[^0-9]/g, ''))}
              onBlur={() => setPeopleDraft(String(Number.isFinite(rawPeople) ? rawPeople : minPeople))}
              aria-label="사무실 인원"
              className="text-text w-20 rounded-control border border-border bg-white px-3 py-2 text-right font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <span className="text-muted">명</span>
          </label>
          <p className="text-muted mt-2 text-xs">
            {minPeople}~{maxPeople}명 · 세모 승인 오퍼의 지금 단가 기준 예상 금액
          </p>

          {loggedIn && pointBalance !== null && (
            <p className="bg-white/80 text-text mt-5 inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm">
              <Coins size={16} className="text-primary" strokeWidth={1.7} />
              씨마켓 포인트 <strong className="font-semibold tabular-nums">{won(pointBalance)}원</strong>
              <span className="text-muted text-xs">· 결제는 여기서 빠집니다</span>
            </p>
          )}
        </div>

        <div>
          <div className="grid gap-3 sm:grid-cols-3">
            {rows.map(({ plan, people, frequencyIndex, preview }) => {
              const Icon = iconFor(plan.key)
              const result = results[plan.key]
              const taxNote = plan.perPerson.priceTaxType === 'INCLUSIVE' ? '부가세 포함' : '부가세 별도'
              return (
                <article key={plan.key} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-[0_8px_24px_-12px_rgba(1,35,80,0.25)]">
                  <span className="bg-blue-tint-2 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                    <Icon size={18} strokeWidth={1.7} />
                  </span>
                  <div>
                    <h2 className="text-text text-base font-semibold">{plan.name}</h2>
                    <p className="text-muted mt-1 min-h-[36px] text-xs leading-[1.6]">{plan.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${plan.name} 주기`}>
                    {plan.frequencies.map((item, index) => {
                      const active = frequencyIndex === index
                      return (
                        <button
                          key={item.label}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setFrequency(current => ({ ...current, [plan.key]: index }))}
                          className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                            active
                              ? 'border-primary bg-blue-tint-2 text-primary font-semibold'
                              : 'border-border text-muted hover:text-text'
                          }`}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="border-bg mt-auto border-t border-dashed pt-3">
                    <p className="text-muted text-[11px]">
                      {people}명 기준 월 예상 · {taxNote}
                    </p>
                    {preview ? (
                      <>
                        <p className="text-text mt-0.5 text-xl font-semibold tabular-nums">{won(preview.monthlySupply)}원</p>
                        <p className="text-muted text-[11px]">
                          1회 {won(preview.cycleSupply)}원 · {plan.frequencies[frequencyIndex]?.label}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted mt-0.5 text-sm">지금은 신청할 수 없는 품목이 있습니다</p>
                    )}
                  </div>

                  {result ? (
                    <SubscribeOutcome result={result} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setApplying(plan)}
                      disabled={!plan.available || !preview}
                      className="bg-primary hover:bg-primary-dark h-10 cursor-pointer rounded-control text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      신청하기
                    </button>
                  )}
                </article>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm">
            <span className="bg-highlight-soft text-highlight-strong rounded-full px-2.5 py-0.5 text-xs font-semibold">
              전체
            </span>
            <span className="text-text">
              세 가지를 모두 구독하면 월{' '}
              <strong className="font-semibold tabular-nums">{won(total)}원</strong> · 씨마켓 안전결제라 계산서는 씨마켓 발행
            </span>
            {loggedIn ? (
              <Link href="/shop/subscriptions" className="text-primary ml-auto text-xs font-semibold hover:underline">
                내 구독 보기
              </Link>
            ) : (
              <Link href="/login?next=/shop" className="text-primary ml-auto text-xs font-semibold hover:underline">
                로그인하고 신청하기
              </Link>
            )}
          </div>
        </div>
      </div>

      {applying && (
        <SubscribeDialog
          plan={applying}
          people={rows.find(row => row.plan.key === applying.key)?.people ?? applying.minPeople}
          frequencyIndex={frequency[applying.key] ?? applying.defaultFrequency}
          pointBalance={pointBalance}
          onClose={() => setApplying(null)}
          onDone={result => {
            setResults(current => ({ ...current, [applying.key]: result }))
            setApplying(null)
          }}
        />
      )}
    </section>
  )
}

function SubscribeOutcome({ result }: { result: SubscribeResult }) {
  const { firstCycle, subscription } = result
  if (firstCycle.status === 'ORDERED') {
    return (
      <p className="bg-highlight-soft text-highlight-strong rounded-lg px-3 py-2 text-[11px] leading-4">
        <CheckCircle2 size={12} className="mr-1 inline-block" />
        첫 회 결제 완료 · 주문 {firstCycle.orderNo}
        {subscription.nextBillingAt && ` · 다음 결제 ${formatDate(subscription.nextBillingAt)}`}
        {' · '}
        <Link href="/shop/subscriptions" className="font-semibold underline">
          내 구독
        </Link>
      </p>
    )
  }
  return (
    <p className="rounded-lg bg-[#FDECEC] px-3 py-2 text-[11px] leading-4 text-[#B3261E]">
      <AlertCircle size={12} className="mr-1 inline-block" />
      {firstCycle.failureReason ?? '첫 결제에 실패했습니다.'} 구독은 남아 있고, 충전하시면 내일 아침 9시에 다시 시도합니다.{' '}
      <Link href="/shop/subscriptions" className="font-semibold underline">
        내 구독
      </Link>
    </p>
  )
}

/**
 * 신청 확인 — 배송지를 적고 첫 결제 금액을 보고 누른다. 배송지는 주문과 같은 자리(`cpoint.shipTo`)를
 * 기억한다: 구독과 장바구니 주문이 같은 사무실로 가는 게 보통이다.
 */
function SubscribeDialog({
  plan,
  people,
  frequencyIndex,
  pointBalance,
  onClose,
  onDone,
}: {
  plan: SubscriptionPlan
  people: number
  frequencyIndex: number
  pointBalance: number | null
  onClose: () => void
  onDone: (result: SubscribeResult) => void
}) {
  const remembered = useSyncExternalStore(subscribeShipTo, getShipToSnapshot, getShipToServerSnapshot)
  const [shipTo, setShipToDraft] = useState<OrderShipTo>(remembered)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = previewSubscription(plan, people, frequencyIndex)
  const frequency = plan.frequencies[frequencyIndex]
  // 첫 회 결제액 미리보기 — 부가세는 세모가 과세 합계에서 한 번 뽑지만, 여기서는 10% 로 어림한다.
  const firstPayable = preview
    ? plan.perPerson.priceTaxType === 'INCLUSIVE'
      ? preview.cycleSupply
      : Math.round(preview.cycleSupply * 1.1)
    : null
  const short = pointBalance !== null && firstPayable !== null && pointBalance < firstPayable

  const field = (key: keyof OrderShipTo) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setShipToDraft(current => ({ ...current, [key]: event.target.value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const cleaned: OrderShipTo = {
        name: shipTo.name.trim(),
        zip: shipTo.zip.trim(),
        address: shipTo.address.trim(),
        tel: shipTo.tel?.trim() || null,
      }
      if (!cleaned.name || !cleaned.zip || !cleaned.address) {
        setError('받는 곳·우편번호·주소를 모두 적어 주세요.')
        return
      }
      setShipTo(cleaned)
      const result = await subscribe({ planKey: plan.key, people, frequencyIndex, shipTo: cleaned })
      onDone(result)
    } catch (err) {
      setError(
        err instanceof LoginRequiredError
          ? '정기구독은 씨마켓 계정으로 로그인해야 신청할 수 있습니다.'
          : err instanceof Error
            ? err.message
            : '구독을 신청하지 못했습니다.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscribe-dialog-title"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={event => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_24px_64px_rgba(1,35,80,0.3)]"
      >
        <h2 id="subscribe-dialog-title" className="text-text text-lg font-semibold">
          {plan.name} 구독 신청
        </h2>
        <p className="text-muted mt-1 text-sm">
          {people}명 · {frequency?.label}
          {preview && ` · 1회 ${won(preview.cycleSupply)}원`}
        </p>

        <fieldset className="mt-5 space-y-3">
          <legend className="text-text text-sm font-semibold">배송지</legend>
          <input
            value={shipTo.name}
            onChange={field('name')}
            placeholder="받는 곳 (예: 본원 총무팀)"
            aria-label="받는 곳"
            className="text-text w-full rounded-control border border-border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <div className="flex gap-2">
            <input
              value={shipTo.zip}
              onChange={field('zip')}
              placeholder="우편번호"
              aria-label="우편번호"
              inputMode="numeric"
              className="text-text w-28 rounded-control border border-border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <input
              value={shipTo.tel ?? ''}
              onChange={field('tel')}
              placeholder="연락처 (선택)"
              aria-label="연락처"
              className="text-text min-w-0 flex-1 rounded-control border border-border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <input
            value={shipTo.address}
            onChange={field('address')}
            placeholder="주소"
            aria-label="주소"
            className="text-text w-full rounded-control border border-border px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </fieldset>

        <div className="bg-light-soft mt-5 rounded-xl px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">첫 회 결제(포인트)</span>
            <strong className="text-text font-semibold tabular-nums">
              {firstPayable !== null ? `${won(firstPayable)}원` : '-'}
            </strong>
          </div>
          {pointBalance !== null && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted">씨마켓 포인트 잔액</span>
              <span className={`tabular-nums ${short ? 'font-semibold text-[#B3261E]' : 'text-text'}`}>
                {won(pointBalance)}원
              </span>
            </div>
          )}
          <p className="text-muted mt-2 text-xs leading-5">
            지금 첫 회가 결제되고 주문이 섭니다. 이후는 결제일 아침 9시마다 자동이며, 내 구독에서 언제든
            일시정지·해지할 수 있습니다.
            {short && ' 잔액이 부족하면 신청은 되지만 첫 결제가 실패로 남고, 충전 후 내일 아침 다시 시도합니다.'}
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-5 text-[#B3261E]">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-muted hover:bg-bg h-10 cursor-pointer rounded-control px-4 text-sm font-semibold transition-colors"
          >
            닫기
          </button>
          <button
            type="submit"
            disabled={busy || !preview}
            className="bg-primary hover:bg-primary-dark h-10 cursor-pointer rounded-control px-5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
          >
            {busy ? '결제 중…' : '신청하고 첫 회 결제'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── 세모 상품 없음 = 예상 산식 미리보기 + 견적서 ───────────────────────── */

function PreviewPlans({ loggedIn }: { loggedIn: boolean }) {
  const [peopleDraft, setPeopleDraft] = useState('30')
  const [frequency, setFrequency] = useState<Record<string, number>>(
    Object.fromEntries(SUBSCRIPTION_PLANS.map(plan => [plan.key, plan.defaultFrequency])),
  )
  const [quotes, setQuotes] = useState<Record<string, StorefrontQuote>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const people = clampPeople(Number.parseInt(peopleDraft, 10))
  const estimates = SUBSCRIPTION_PLANS.map(plan => ({
    plan,
    monthly: estimateMonthly(plan, people, frequency[plan.key] ?? plan.defaultFrequency),
  }))
  const total = estimates.reduce((sum, row) => sum + row.monthly, 0)
  const bundleSave = Math.round((total * BUNDLE_DISCOUNT_RATE) / 1000) * 1000

  const handleQuote = async (plan: PreviewPlan) => {
    setBusy(plan.key)
    setError(null)
    try {
      const quote = await requestQuote({
        kind: 'SUBSCRIPTION',
        planKey: plan.key,
        people,
        frequencyIndex: frequency[plan.key] ?? plan.defaultFrequency,
      })
      setQuotes(current => ({ ...current, [plan.key]: quote }))
    } catch (err) {
      setError(
        err instanceof LoginRequiredError
          ? '구독 견적서에는 기관·담당자가 실립니다. 씨마켓 계정으로 로그인해 주세요.'
          : err instanceof Error
            ? err.message
            : '견적서를 발급하지 못했습니다.',
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <section
      id="subscribe"
      className="scroll-mt-28 rounded-3xl bg-[linear-gradient(160deg,#f4f9fd_0%,#e5f2fa_60%,#dceefb_100%)] p-6 sm:p-8 lg:p-10"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.6fr)] lg:gap-12">
        <div>
          <span className="text-primary ring-primary/35 inline-flex h-8 items-center rounded-full px-4 text-[13px] font-medium ring-1">
            정기구독
          </span>
          <h1 className="text-navy mt-5 break-keep text-[28px] leading-[1.25] font-semibold tracking-tight sm:text-[34px]">
            사무실 운영, 매달 챙기지 말고
            <br />
            <span className="text-primary">한 번만</span> 정하세요
          </h1>
          <p className="text-muted mt-4 text-[15px] leading-[1.8]">
            인원수만 넣으면 청소·간식·소모품 월 예산이 바로 나옵니다. 결재는 첫 달 한 번,
            이후는 자동 발주입니다.
          </p>

          <label className="mt-6 flex items-center gap-3 text-sm">
            <span className="text-text font-semibold">우리 사무실 인원</span>
            <input
              inputMode="numeric"
              value={peopleDraft}
              onChange={event => setPeopleDraft(event.target.value.replace(/[^0-9]/g, ''))}
              onBlur={() => setPeopleDraft(String(people))}
              aria-label="사무실 인원"
              className="text-text w-20 rounded-control border border-border bg-white px-3 py-2 text-right font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <span className="text-muted">명</span>
          </label>
          <p className="text-muted mt-2 text-xs">
            {MIN_PEOPLE}~{MAX_PEOPLE}명 · 예상 금액이며 견적 확정 시 달라질 수 있습니다
          </p>
          <p className="bg-white/80 text-muted mt-4 rounded-xl px-3.5 py-2.5 text-xs leading-5">
            구독 상품이 아직 등록되지 않아 예상 산식으로 보여 드립니다. 신청은 상품이 등록되면 이 자리에서 바로 됩니다.
          </p>
        </div>

        <div>
          <div className="grid gap-3 sm:grid-cols-3">
            {estimates.map(({ plan, monthly }) => {
              const Icon = iconFor(plan.key)
              const quote = quotes[plan.key]
              return (
                <article key={plan.key} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-[0_8px_24px_-12px_rgba(1,35,80,0.25)]">
                  <span className="bg-blue-tint-2 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                    <Icon size={18} strokeWidth={1.7} />
                  </span>
                  <div>
                    <h2 className="text-text text-base font-semibold">{plan.name}</h2>
                    <p className="text-muted mt-1 min-h-[36px] text-xs leading-[1.6]">{plan.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${plan.name} 주기`}>
                    {plan.frequencies.map((item, index) => {
                      const active = (frequency[plan.key] ?? plan.defaultFrequency) === index
                      return (
                        <button
                          key={item.label}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setFrequency(current => ({ ...current, [plan.key]: index }))}
                          className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                            active
                              ? 'border-primary bg-blue-tint-2 text-primary font-semibold'
                              : 'border-border text-muted hover:text-text'
                          }`}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="border-bg mt-auto border-t border-dashed pt-3">
                    <p className="text-muted text-[11px]">{people}명 기준 월 예상 · 부가세 별도</p>
                    <p className="text-text mt-0.5 text-xl font-semibold tabular-nums">{won(monthly)}원</p>
                  </div>
                  {quote ? (
                    <p className="bg-highlight-soft text-highlight-strong rounded-lg px-3 py-2 text-[11px] leading-4">
                      <FileText size={12} className="mr-1 inline-block" />
                      견적서 {quote.quoteNo} 발급 · 결재 후 연락 주시면 첫 배송을 잡습니다
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleQuote(plan)}
                      disabled={busy === plan.key}
                      className="text-primary hover:bg-blue-tint-2 h-10 cursor-pointer rounded-control border border-primary/40 text-sm font-semibold transition-colors disabled:opacity-60"
                    >
                      {busy === plan.key ? '발급 중…' : '구독 견적서 받기'}
                    </button>
                  )}
                </article>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm">
            <span className="bg-highlight-soft text-highlight-strong rounded-full px-2.5 py-0.5 text-xs font-semibold">
              묶음 혜택
            </span>
            <span className="text-text">
              세 가지를 함께 구독하면 월{' '}
              <strong className="font-semibold tabular-nums">{won(bundleSave)}원</strong> 절감, 계산서는 한 장
            </span>
            {!loggedIn && (
              <Link href="/login?next=/shop" className="text-primary ml-auto text-xs font-semibold hover:underline">
                로그인하고 견적서 받기
              </Link>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-5 text-[#B3261E]">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
