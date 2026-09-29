import { LoginRequiredError } from '@/lib/place-order'
import type { CreateMallRequestInput, MallRequest, MallRequestContact } from '@/lib/request-types'

/**
 * 브라우저 쪽 요청 보내기 — `/api/shop/requests` 로만 간다(파트너 키는 서버에만 있다).
 *
 * 담당자 연락처는 기억해 둔다. 공동구매·꾸러미·구해드림을 연달아 보내는 사람이 매번 같은 네 칸을
 * 다시 적게 하지 않으려는 것 — 배송지 기억(`place-order.ts`)과 같은 외부 스토어다.
 */

export function newRequestKey(prefix = 'req'): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `${prefix}-${Date.now().toString(36)}-${random}`
}

async function readPayload<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null
}

export async function sendMallRequest(input: CreateMallRequestInput): Promise<MallRequest> {
  const response = await fetch('/api/shop/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (response.status === 401) throw new LoginRequiredError()

  const payload = await readPayload<{ request?: MallRequest; message?: string }>(response)
  if (!response.ok || !payload?.request) {
    throw new Error(payload?.message ?? '요청을 보내지 못했습니다.')
  }
  return payload.request
}

export async function cancelMallRequest(id: string): Promise<MallRequest> {
  const response = await fetch(`/api/shop/requests/${encodeURIComponent(id)}/cancel`, { method: 'POST' })
  const payload = await readPayload<{ request?: MallRequest; message?: string }>(response)
  if (!response.ok || !payload?.request) {
    throw new Error(payload?.message ?? '요청을 취소하지 못했습니다.')
  }
  return payload.request
}

/* ── 담당자 연락처 기억 ─────────────────────────────────────────────── */

const CONTACT_KEY = 'cpoint.requestContact'

export const EMPTY_CONTACT: MallRequestContact = { name: '', organization: '', tel: '', email: null }

let contactSnapshot: MallRequestContact = EMPTY_CONTACT
let contactLoaded = false
const contactListeners = new Set<() => void>()

function readContactStorage(): MallRequestContact {
  try {
    const raw = window.localStorage.getItem(CONTACT_KEY)
    const parsed = raw ? (JSON.parse(raw) as MallRequestContact) : null
    if (!parsed || typeof parsed.name !== 'string') return EMPTY_CONTACT
    return {
      name: parsed.name,
      organization: typeof parsed.organization === 'string' ? parsed.organization : '',
      tel: typeof parsed.tel === 'string' ? parsed.tel : '',
      email: typeof parsed.email === 'string' && parsed.email ? parsed.email : null,
    }
  } catch {
    return EMPTY_CONTACT
  }
}

export function subscribeContact(listener: () => void): () => void {
  contactListeners.add(listener)
  return () => contactListeners.delete(listener)
}

export function getContactSnapshot(): MallRequestContact {
  if (!contactLoaded) {
    contactSnapshot = readContactStorage()
    contactLoaded = true
  }
  return contactSnapshot
}

/** 서버 스냅샷은 매번 같은 참조여야 한다(새 객체면 무한 렌더). */
export function getContactServerSnapshot(): MallRequestContact {
  return EMPTY_CONTACT
}

export function rememberContact(next: MallRequestContact): void {
  contactSnapshot = next
  contactLoaded = true
  try {
    window.localStorage.setItem(CONTACT_KEY, JSON.stringify(next))
  } catch {
    // 저장 실패는 요청에 영향이 없다.
  }
  contactListeners.forEach(notify => notify())
}
