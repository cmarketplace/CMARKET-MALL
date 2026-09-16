import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { PostpaidMallError } from '@/lib/postpaid-mall-stub'
import {
  CANCELABLE_REQUEST_STATUSES,
  type CreateMallRequestInput,
  type MallRequest,
  type MallRequestTally,
  type MallRequestType,
} from '@/lib/request-types'
import { isSemoConfigured, resolveSemoApi, storefrontUrl } from '@/lib/semo-api'

/**
 * 몰 요청 원장 클라이언트 — **서버 전용**(파트너 키가 여기서만 산다).
 *
 * 세모 실체: `/external/storefronts/{slug}/requests` · `/requests/{id}/cancel` · `/requests/tally`.
 * 채번·상태·운영자 회신(견적서 번호)은 전부 세모다. 몰이 보내는 것은 «누가(ownerKey = 세션의
 * memberKey) · 무엇을 · 어떤 칸으로» 뿐이다.
 *
 * ## 세모 키가 없는 환경
 *
 * 주문 스텁(`postpaid-mall-stub.ts`)과 같은 뼈대로 `var/mall-requests-stub.json` 에 남긴다.
 * 요청은 돈이 오가지 않고, 화면(접수 → 내 요청 → 공동구매 막대)을 키 없이 끝까지 눌러 봐야
 * 해서다. 스텁이 받은 요청은 **아무에게도 전달되지 않는다** — 화면이 그 사실을 적는다.
 *
 * ## 세모에 아직 경로가 없을 때(404)
 *
 * 몰과 세모는 배포가 따로다. 404 는 «이 기능이 세모에 아직 안 올라갔다» 는 뜻이라 503 과
 * 운영자가 알아볼 문구로 바꾼다 — 담당자에게 «찾을 수 없음» 을 보여 주면 자기 잘못으로 읽는다.
 */

const UPSTREAM_TIMEOUT_MS = 30_000
const LIST_LIMIT = 100

interface SemoEnvelope<T> {
  success?: boolean
  data?: T
  message?: string | string[]
}

async function semoFetch<T>(pathname: string, init?: RequestInit, timeoutMs = UPSTREAM_TIMEOUT_MS): Promise<T> {
  const config = resolveSemoApi()

  const response = await fetch(storefrontUrl(config, pathname), {
    ...init,
    headers: {
      'X-API-Key': config.apiKey,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as SemoEnvelope<T> | null

  // Nest 는 없는 경로에도 404 와 «Cannot POST /…» 를 준다 — 그 문구를 담당자에게 보이지 않는다.
  const rawMessage = Array.isArray(payload?.message) ? payload?.message.join(' ') : payload?.message
  if (response.status === 404 && (!rawMessage || /^Cannot (GET|POST|PUT|PATCH|DELETE) /.test(rawMessage))) {
    throw new PostpaidMallError(503, '요청 접수 기능이 아직 세모에 연결되지 않았습니다. 씨마켓몰 운영팀에 알려 주세요.')
  }

  if (!response.ok || payload?.success === false || payload?.data === undefined) {
    const raw = payload?.message
    const message = Array.isArray(raw) ? raw.join(' ') : raw
    throw new PostpaidMallError(
      response.status >= 400 ? response.status : 502,
      message || `세모 응답 오류 (${response.status})`,
    )
  }

  return payload.data
}

/** 세모가 아니라 로컬 스텁에 남는 환경인가 — 화면이 «전달되지 않습니다» 를 붙이는 기준. */
export function isRequestStub(): boolean {
  return !isSemoConfigured()
}

export async function createMallRequest(
  owner: { memberKey: string; displayName: string },
  input: CreateMallRequestInput,
): Promise<MallRequest> {
  if (isRequestStub()) return stubCreate(owner, input)

  return semoFetch<MallRequest>('/requests', {
    method: 'POST',
    body: JSON.stringify({
      ownerKey: owner.memberKey,
      ownerName: owner.displayName,
      ...input,
    }),
  })
}

export async function listMallRequests(memberKey: string): Promise<MallRequest[]> {
  if (isRequestStub()) return stubList(memberKey)

  const page = await semoFetch<{ requests: MallRequest[]; total: number }>(
    `/requests?ownerKey=${encodeURIComponent(memberKey)}&limit=${LIST_LIMIT}`,
  )
  return page.requests
}

export async function cancelMallRequest(memberKey: string, id: string): Promise<MallRequest> {
  if (isRequestStub()) return stubCancel(memberKey, id)

  return semoFetch<MallRequest>(`/requests/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ ownerKey: memberKey }),
  })
}

/**
 * refKey 별 참여 집계. 공개 화면(랜딩)도 부르므로 **실패를 던지지 않는다** — 못 읽으면 빈
 * 배열이고, 화면은 숫자 없이 막대를 접는다. 0 을 그려 «아무도 안 했다» 로 읽히게 하지 않는다.
 * 랜딩은 `timeoutMs` 를 짧게 준다 — 세모가 느려도 첫 화면이 기다리지 않게.
 */
export async function tallyMallRequests(
  type: MallRequestType,
  refKeys: string[],
  options: { timeoutMs?: number } = {},
): Promise<MallRequestTally[]> {
  if (refKeys.length === 0) return []
  if (isRequestStub()) return stubTally(type, refKeys)

  try {
    const result = await semoFetch<{ tallies: MallRequestTally[] }>(
      `/requests/tally?type=${encodeURIComponent(type)}&refKeys=${refKeys.map(encodeURIComponent).join(',')}`,
      undefined,
      options.timeoutMs,
    )
    return result.tallies
  } catch (error) {
    console.error('[mall-requests] tally', error instanceof Error ? error.message : error)
    return []
  }
}

/* ── 로컬 스텁 원장 ───────────────────────────────────────────────── */

interface StubState {
  version: 1
  requests: (MallRequest & { ownerKey: string; ownerName: string })[]
  /** clientRequestKey → id */
  requestKeys: Record<string, string>
  seq: number
}

const STORE_PATH = path.join(process.cwd(), 'var', 'mall-requests-stub.json')
const globalStore = globalThis as unknown as { __mallRequestsStub?: StubState }

function loadState(): StubState {
  if (globalStore.__mallRequestsStub) return globalStore.__mallRequestsStub

  let state: StubState = { version: 1, requests: [], requestKeys: {}, seq: 0 }
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, 'utf8')) as StubState
    if (parsed?.version === 1) state = parsed
  } catch {
    // 첫 실행이거나 파일이 깨졌다 — 빈 원장에서 시작한다.
  }
  globalStore.__mallRequestsStub = state
  return state
}

function saveState(state: StubState): void {
  globalStore.__mallRequestsStub = state
  try {
    mkdirSync(path.dirname(STORE_PATH), { recursive: true })
    writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf8')
  } catch {
    // 파일을 못 쓰는 환경에서는 메모리로만.
  }
}

function kstDateStamp(): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replace(/\D/g, '')
}

function publicView(row: StubState['requests'][number]): MallRequest {
  // 명의 키는 원장 안에만 둔다 — 화면으로 나가는 모양은 세모 응답과 같게.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ownerKey, ownerName, ...rest } = row
  return rest
}

function stubCreate(owner: { memberKey: string; displayName: string }, input: CreateMallRequestInput): MallRequest {
  const state = loadState()

  const existingId = state.requestKeys[`${owner.memberKey}|${input.clientRequestKey}`]
  const existing = existingId ? state.requests.find(row => row.id === existingId) : null
  if (existing) return publicView(existing)

  const seq = state.seq + 1
  const now = new Date().toISOString()
  const row: StubState['requests'][number] = {
    id: `stub-${seq}`,
    requestNo: `MR-${kstDateStamp()}-${String(seq).padStart(4, '0')}`,
    type: input.type,
    status: 'RECEIVED',
    refKey: input.refKey,
    title: input.title,
    quantity: input.quantity,
    details: input.details,
    contact: input.contact,
    quoteNo: null,
    replyNote: null,
    createdAt: now,
    updatedAt: now,
    ownerKey: owner.memberKey,
    ownerName: owner.displayName,
  }

  saveState({
    ...state,
    seq,
    requests: [row, ...state.requests],
    requestKeys: { ...state.requestKeys, [`${owner.memberKey}|${input.clientRequestKey}`]: row.id },
  })
  return publicView(row)
}

function stubList(memberKey: string): MallRequest[] {
  return loadState()
    .requests.filter(row => row.ownerKey === memberKey)
    .slice(0, LIST_LIMIT)
    .map(publicView)
}

function stubCancel(memberKey: string, id: string): MallRequest {
  const state = loadState()
  const row = state.requests.find(entry => entry.id === id && entry.ownerKey === memberKey)
  // 남의 요청은 «없음» 으로 답한다 — «권한 없음» 은 그 id 가 있다는 사실을 흘린다.
  if (!row) throw new PostpaidMallError(404, '요청을 찾을 수 없습니다.')
  // 이미 취소된 요청의 재시도는 그대로 돌려준다(세모와 같은 규칙 — 재시도에 «진행 중» 문구가 뜨지 않게).
  if (row.status === 'CANCELED') return publicView(row)
  if (!CANCELABLE_REQUEST_STATUSES.includes(row.status)) {
    throw new PostpaidMallError(409, '이미 진행 중인 요청이라 취소할 수 없습니다. 씨마켓몰 담당자에게 연락해 주세요.')
  }

  const updated = { ...row, status: 'CANCELED' as const, updatedAt: new Date().toISOString() }
  saveState({ ...state, requests: state.requests.map(entry => (entry.id === id ? updated : entry)) })
  return publicView(updated)
}

function stubTally(type: MallRequestType, refKeys: string[]): MallRequestTally[] {
  const rows = loadState().requests.filter(
    row => row.type === type && row.status !== 'CANCELED' && row.refKey && refKeys.includes(row.refKey),
  )
  return refKeys.map(refKey => {
    const matched = rows.filter(row => row.refKey === refKey)
    return {
      refKey,
      participants: new Set(matched.map(row => row.ownerKey)).size,
      quantity: matched.reduce((sum, row) => sum + (row.quantity ?? 0), 0),
    }
  })
}
