'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'

import {
  CANCELABLE_REQUEST_STATUSES,
  MALL_REQUEST_STATUS_HINT,
  MALL_REQUEST_STATUS_LABEL,
  MALL_REQUEST_TYPE_LABEL,
  type MallRequest,
} from '@/lib/request-types'
import { formatKDateTime } from '@/lib/kdate'
import { cancelMallRequest } from '@/lib/send-request'

const STATUS_TONE: Record<MallRequest['status'], string> = {
  RECEIVED: 'bg-blue-tint-2 text-primary',
  IN_REVIEW: 'bg-blue-tint-2 text-primary',
  QUOTED: 'bg-highlight-soft text-highlight-strong',
  CONFIRMED: 'bg-highlight-soft text-highlight-strong',
  CLOSED: 'bg-bg text-muted',
  CANCELED: 'bg-bg text-muted',
}


/** 내 요청 목록 — 카드마다 상태·견적 번호·운영자 회신, 펼치면 보낸 칸 그대로. */
export default function RequestList({ requests }: { requests: MallRequest[] }) {
  return (
    <ol className="mt-6 space-y-3">
      {requests.map(request => (
        <RequestCard key={request.id} request={request} />
      ))}
    </ol>
  )
}

function RequestCard({ request }: { request: MallRequest }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelable = CANCELABLE_REQUEST_STATUSES.includes(request.status)

  const cancel = async () => {
    if (!window.confirm('이 요청을 취소할까요?')) return
    setBusy(true)
    setError(null)
    try {
      await cancelMallRequest(request.id)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '취소하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="border-border rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[request.status]}`}>
          {MALL_REQUEST_STATUS_LABEL[request.status]}
        </span>
        <span className="text-muted text-xs">{MALL_REQUEST_TYPE_LABEL[request.type]}</span>
        <span className="text-muted ml-auto text-xs tabular-nums">{request.requestNo}</span>
      </div>
      <p className="text-text mt-2 text-base font-semibold">{request.title}</p>
      <p className="text-muted mt-0.5 text-xs">{formatKDateTime(request.createdAt)} 접수</p>
      <p className="text-muted mt-2 text-sm leading-6">{MALL_REQUEST_STATUS_HINT[request.status]}</p>

      {request.quoteNo && (
        <p className="bg-highlight-soft text-highlight-strong mt-3 rounded-lg px-3 py-2 text-sm font-semibold">
          견적서 {request.quoteNo}
        </p>
      )}
      {request.replyNote && (
        <p className="bg-light-soft text-text mt-3 rounded-lg px-3 py-2 text-sm leading-6 whitespace-pre-line">
          <span className="text-muted block text-xs font-semibold">씨마켓몰 담당자</span>
          {request.replyNote}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-expanded={open}
          className="text-muted-strong hover:bg-bg inline-flex cursor-pointer items-center gap-1 rounded-control px-2.5 py-1.5 text-xs font-semibold"
        >
          보낸 내용 {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </button>
        {cancelable && (
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="ml-auto cursor-pointer rounded-control px-2.5 py-1.5 text-xs font-semibold text-[#B3261E] hover:bg-[#FDECEC] disabled:opacity-60"
          >
            {busy ? '취소하는 중…' : '요청 취소'}
          </button>
        )}
      </div>

      {open && (
        <dl className="bg-light-soft mt-2 grid gap-x-4 gap-y-1.5 rounded-xl p-4 text-sm sm:grid-cols-[120px_1fr]">
          {request.details.map((field, index) => (
            <div key={`${field.label}-${index}`} className="contents">
              <dt className="text-muted">{field.label}</dt>
              <dd className="text-text break-words whitespace-pre-line">{field.value}</dd>
            </div>
          ))}
          <dt className="text-muted">담당자</dt>
          <dd className="text-text">
            {request.contact.organization} · {request.contact.name} · {request.contact.tel}
          </dd>
        </dl>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-5 text-[#B3261E]">
          {error}
        </p>
      )}
    </li>
  )
}
