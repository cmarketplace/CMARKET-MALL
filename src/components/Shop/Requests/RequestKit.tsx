'use client'

import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

import { LoginRequiredError } from '@/lib/place-order'
import type { CreateMallRequestInput, MallRequest, MallRequestContact } from '@/lib/request-types'
import {
  getContactServerSnapshot,
  getContactSnapshot,
  newRequestKey,
  rememberContact,
  sendMallRequest,
  subscribeContact,
} from '@/lib/send-request'

/**
 * 요청 폼의 공용 부품 — 서비스 견적·공동구매·연간 계약·구해드림·꾸러미가 같은 칸, 같은 리듬으로
 * 접수된다. 화면마다 다른 것은 «무엇을 묻는가» 뿐이고, 연락처·보내기·결과 판은 여기 하나다.
 */

export const inputClass =
  'text-text w-full rounded-control border border-border bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-text text-sm font-semibold">{label}</span>
      {hint && <span className="text-muted ml-1.5 text-xs">{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}

/**
 * 담당자 연락처. 한 번 적으면 다음 요청부터 채워져 있다(`cpoint.requestContact`).
 *
 * 기억값은 하이드레이션 뒤에야 읽히므로 «고친 값(draft)» 을 따로 두고, 안 고쳤으면 기억값을 그린다 —
 * 초기값으로 복사해 두면 서버 스냅샷(빈 값)이 박제된다.
 */
export function useContactDraft() {
  const remembered = useSyncExternalStore(subscribeContact, getContactSnapshot, getContactServerSnapshot)
  const [draft, setDraft] = useState<MallRequestContact | null>(null)
  const contact = draft ?? remembered

  const set = (key: keyof MallRequestContact) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setDraft({ ...contact, [key]: key === 'email' ? value || null : value })
  }

  return { contact, set }
}

export function ContactFieldset({
  contact,
  set,
}: {
  contact: MallRequestContact
  set: (key: keyof MallRequestContact) => (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="text-text mb-2 text-sm font-semibold">연락받을 담당자</legend>
      <input
        value={contact.organization}
        onChange={set('organization')}
        placeholder="기관·회사명"
        aria-label="기관·회사명"
        autoComplete="organization"
        className={inputClass}
      />
      <input
        value={contact.name}
        onChange={set('name')}
        placeholder="담당자 이름"
        aria-label="담당자 이름"
        autoComplete="name"
        className={inputClass}
      />
      <input
        value={contact.tel}
        onChange={set('tel')}
        placeholder="연락처 (예: 02-1234-5678)"
        aria-label="연락처"
        inputMode="tel"
        autoComplete="tel"
        className={inputClass}
      />
      <input
        value={contact.email ?? ''}
        onChange={set('email')}
        placeholder="이메일 (선택)"
        aria-label="이메일"
        type="email"
        autoComplete="email"
        className={inputClass}
      />
    </fieldset>
  )
}

/**
 * 보내기 — 같은 화면에서 난 실패를 다시 보내면 **같은 키**로 간다(요청이 두 건 생기지 않는다).
 * 성공하면 키를 새로 뽑는다: 그다음 요청은 다른 요청이다.
 *
 * 여러 건(공동구매 품목별)을 한 번에 보낼 때는 품목마다 키 뒤에 refKey 를 붙인다.
 */
export function useRequestSubmit() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [created, setCreated] = useState<MallRequest[] | null>(null)
  const keyRef = useRef<string | null>(null)

  async function submit(
    contact: MallRequestContact,
    build: Omit<CreateMallRequestInput, 'clientRequestKey' | 'contact'>[],
  ): Promise<boolean> {
    if (busy || build.length === 0) return false
    keyRef.current ??= newRequestKey()
    setBusy(true)
    setError(null)
    setNeedsLogin(false)

    const done: MallRequest[] = []
    try {
      for (const input of build) {
        const suffix = build.length > 1 ? `-${input.refKey ?? done.length}` : ''
        done.push(await sendMallRequest({ ...input, contact, clientRequestKey: `${keyRef.current}${suffix}` }))
      }
      rememberContact(contact)
      keyRef.current = null
      setCreated(done)
      return true
    } catch (caught) {
      if (caught instanceof LoginRequiredError) setNeedsLogin(true)
      setError(caught instanceof Error ? caught.message : '요청을 보내지 못했습니다.')
      if (done.length > 0) setCreated(done)
      return false
    } finally {
      setBusy(false)
    }
  }

  return { submit, busy, error, needsLogin, created, reset: () => setCreated(null) }
}

export function SubmitError({ error, needsLogin, next }: { error: string | null; needsLogin: boolean; next: string }) {
  if (!error) return null
  return (
    <p role="alert" className="rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-5 text-[#B3261E]">
      {error}
      {needsLogin && (
        <>
          {' '}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold underline">
            로그인하기
          </Link>
        </>
      )}
    </p>
  )
}

/** 접수 결과 판 — 번호를 크게, 다음에 무슨 일이 일어나는지를 한 줄로. */
export function RequestReceived({
  requests,
  stub,
  onAnother,
  anotherLabel = '다른 요청 보내기',
}: {
  requests: MallRequest[]
  stub: boolean
  onAnother?: () => void
  anotherLabel?: string
}) {
  return (
    <div className="bg-highlight-soft rounded-2xl px-6 py-6" role="status">
      <p className="text-highlight-strong flex items-center gap-2 text-base font-semibold">
        <CheckCircle2 size={20} aria-hidden="true" />
        요청이 접수되었습니다
      </p>
      <ul className="mt-3 space-y-1">
        {requests.map(request => (
          <li key={request.id} className="text-text text-sm">
            <span className="font-semibold tabular-nums">{request.requestNo}</span>
            <span className="text-muted"> · {request.title}</span>
          </li>
        ))}
      </ul>
      <p className="text-muted mt-3 text-sm leading-6">
        씨마켓몰 담당자가 영업일 기준 하루 안에 연락드리고, 견적서가 준비되면 내 요청에서 바로 볼 수 있습니다.
      </p>
      {stub && (
        <p className="text-highlight-strong mt-2 text-xs font-semibold">
          세모 연동이 없는 환경이라 이 요청은 로컬에만 남고 담당자에게 전달되지 않습니다.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/shop/requests"
          className="bg-primary hover:bg-primary-dark rounded-control px-4 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          내 요청 보기
        </Link>
        {onAnother && (
          <button
            type="button"
            onClick={onAnother}
            className="text-primary hover:bg-white/70 cursor-pointer rounded-control px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            {anotherLabel}
          </button>
        )}
      </div>
    </div>
  )
}

/** 몰 안 허브 화면의 머리 — 제목·설명·(선택) 오른쪽 칩. */
export function HubHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string
  title: string
  description: ReactNode
  aside?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-primary text-xs font-semibold">{eyebrow}</p>
        <h1 className="text-text mt-1.5 text-2xl font-semibold sm:text-[28px]">{title}</h1>
        <div className="text-muted mt-2 text-sm leading-6">{description}</div>
      </div>
      {aside}
    </header>
  )
}

/**
 * 요청 폼의 틀 — 왼쪽은 그 요청만의 칸, 오른쪽은 연락처·오류·보내기. 접수되면 결과 판으로 바뀐다.
 * 모바일에서는 한 줄로 쌓인다.
 */
export function RequestFormFrame({
  onSubmit,
  children,
  contact,
  setContact,
  error,
  needsLogin,
  busy,
  next,
  submitLabel,
  footnote,
}: {
  onSubmit: (event: React.FormEvent) => void
  children: ReactNode
  contact: MallRequestContact
  setContact: (key: keyof MallRequestContact) => (event: React.ChangeEvent<HTMLInputElement>) => void
  error: string | null
  needsLogin: boolean
  busy: boolean
  next: string
  submitLabel: string
  footnote?: ReactNode
}) {
  return (
    <form onSubmit={onSubmit} className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="border-border space-y-5 rounded-2xl border bg-white p-5 sm:p-6">{children}</div>
      <div className="border-border space-y-4 rounded-2xl border bg-white p-5 lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
        <ContactFieldset contact={contact} set={setContact} />
        <SubmitError error={error} needsLogin={needsLogin} next={next} />
        <button
          type="submit"
          disabled={busy}
          className="bg-primary hover:bg-primary-dark h-12 w-full cursor-pointer rounded-control text-sm font-semibold text-white transition-colors disabled:opacity-60"
        >
          {busy ? '보내는 중…' : submitLabel}
        </button>
        {footnote && <p className="text-muted text-xs leading-5">{footnote}</p>}
      </div>
    </form>
  )
}
