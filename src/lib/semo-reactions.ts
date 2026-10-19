import type { ReactionAlert, ReviewPage, ShopReview, SocialProof } from '@/lib/reaction-types'
import { isSemoConfigured, resolveSemoApi, storefrontUrl } from '@/lib/semo-api'

/**
 * 세모 «반응» API 창구 — 찜·열람·신호·기관 재구매순·후기·내 알림 (세모 PR #1473, 2026-10-19).
 *
 * **서버에서만 부른다.** 파트너 키는 씨마켓 연동 전체가 쓰는 키다. 사람(`ownerKey`)은 언제나 **세션의
 * memberKey**(씨마켓 sub)로 채운다 — 브라우저가 보낸 값을 쓰면 남의 찜·후기를 건드린다.
 *
 * 세모 키가 없는 로컬은 이 프로세스 메모리의 스텁이 찜만 기억한다. 사회적 증거·후기·알림은 **지어내지 않는다**
 * (가짜 숫자 금지) — 스텁에서는 비어 있다.
 */

const UPSTREAM_TIMEOUT_MS = 10_000

export class ReactionApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ReactionApiError'
  }
}

interface SemoEnvelope<T> {
  success?: boolean
  data?: T
  message?: string | string[]
  error?: { message?: string; code?: string } | string
}

function errorMessage(payload: SemoEnvelope<unknown> | null, status: number): string {
  const raw = payload?.message
  if (Array.isArray(raw)) return raw.join(' ')
  if (typeof raw === 'string' && raw) return raw
  const error = payload?.error
  if (typeof error === 'string' && error) return error
  if (error && typeof error === 'object' && error.message) return error.message
  return `세모 응답 오류 (${status})`
}

async function semo<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | number | undefined> } = {},
): Promise<T | null> {
  const config = resolveSemoApi()
  const url = new URL(storefrontUrl(config, `/reactions${path}`))
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData
  const { query: _query, ...rest } = init
  void _query

  const response = await fetch(url, {
    ...rest,
    headers: {
      'X-API-Key': config.apiKey,
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(rest.headers ?? {}),
    },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cache: 'no-store',
  })

  if (response.status === 204) return null
  const payload = (await response.json().catch(() => null)) as SemoEnvelope<T> | null
  if (!response.ok || payload?.success === false) {
    throw new ReactionApiError(response.status >= 400 ? response.status : 502, errorMessage(payload, response.status))
  }
  return (payload?.data ?? (payload as T | null)) ?? null
}

/* ── 로컬 스텁(세모 키 없음) ─────────────────────────────────────────────── */

interface StubWish {
  createdAt: string
  priceAtWish: number | null
}

const stubKey = Symbol.for('cpoint.reactions.stub')
type StubStore = Map<string, Map<string, StubWish>>

function stubStore(): StubStore {
  const holder = globalThis as unknown as Record<symbol, StubStore | undefined>
  holder[stubKey] ??= new Map()
  return holder[stubKey]
}

function stubWishes(ownerKey: string): Map<string, StubWish> {
  const store = stubStore()
  const mine = store.get(ownerKey) ?? new Map<string, StubWish>()
  store.set(ownerKey, mine)
  return mine
}

/* ── 찜 ──────────────────────────────────────────────────────────────── */

export interface SemoWish {
  itemId: string
  createdAt: string
  priceAtWish: number | null
}

export async function semoListWishes(ownerKey: string): Promise<SemoWish[]> {
  if (!isSemoConfigured()) {
    return [...stubWishes(ownerKey).entries()]
      .map(([itemId, wish]) => ({ itemId, ...wish }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const data = await semo<{ items?: SemoWish[] }>('/wishes', { query: { ownerKey } })
  return (data?.items ?? []).map(item => ({
    itemId: item.itemId,
    createdAt: item.createdAt,
    priceAtWish: typeof item.priceAtWish === 'number' ? item.priceAtWish : null,
  }))
}

export async function semoAddWish(ownerKey: string, itemId: string, stubPrice: number | null): Promise<void> {
  if (!isSemoConfigured()) {
    const mine = stubWishes(ownerKey)
    if (!mine.has(itemId)) mine.set(itemId, { createdAt: new Date().toISOString(), priceAtWish: stubPrice })
    return
  }
  await semo(`/wishes/${encodeURIComponent(itemId)}`, { method: 'PUT', body: JSON.stringify({ ownerKey }) })
}

export async function semoRemoveWish(ownerKey: string, itemId: string): Promise<void> {
  if (!isSemoConfigured()) {
    stubWishes(ownerKey).delete(itemId)
    return
  }
  await semo(`/wishes/${encodeURIComponent(itemId)}`, { method: 'DELETE', query: { ownerKey } })
}

/**
 * 상세 열람 — 판매자 카드 «기관 N곳이 다시 봤어요» 의 원천. 화면을 막지 않는다: 실패는 로그만 남긴다.
 */
export async function semoRecordView(ownerKey: string, itemId: string): Promise<void> {
  if (!isSemoConfigured()) return
  try {
    await semo('/views', { method: 'POST', body: JSON.stringify({ ownerKey, itemId }) })
  } catch (error) {
    console.error('[reactions/view]', error instanceof Error ? error.message : error)
  }
}

/* ── 신호·순위 ──────────────────────────────────────────────────────────── */

export interface ItemSignal {
  wished: boolean
  socialProof: SocialProof | null
}

export async function semoSignals(ownerKey: string | null, itemIds: string[]): Promise<Map<string, ItemSignal>> {
  const ids = [...new Set(itemIds)].filter(Boolean).slice(0, 200)
  const result = new Map<string, ItemSignal>()
  if (ids.length === 0) return result
  if (!isSemoConfigured()) {
    const mine = ownerKey ? stubWishes(ownerKey) : new Map<string, StubWish>()
    for (const id of ids) result.set(id, { wished: mine.has(id), socialProof: null })
    return result
  }
  const data = await semo<{ items?: Array<{ itemId: string; wished: boolean; socialProof: SocialProof | null }> }>(
    '/signals',
    { method: 'POST', body: JSON.stringify({ ownerKey: ownerKey ?? undefined, itemIds: ids }) },
  )
  for (const item of data?.items ?? []) {
    result.set(item.itemId, { wished: item.wished === true, socialProof: item.socialProof ?? null })
  }
  return result
}

export async function semoRanking(limit = 24): Promise<Array<{ itemId: string; socialProof: SocialProof }>> {
  if (!isSemoConfigured()) return []
  const data = await semo<{ items?: Array<{ itemId: string; socialProof: SocialProof }> }>('/ranking', {
    query: { limit },
  })
  return data?.items ?? []
}

/* ── 내 알림 ────────────────────────────────────────────────────────────── */

export async function semoAlerts(ownerKey: string): Promise<ReactionAlert[]> {
  if (!isSemoConfigured()) return []
  const data = await semo<{ items?: ReactionAlert[] }>('/alerts', { query: { ownerKey } })
  return (data?.items ?? []).map(({ id, kind, title, body, createdAt }) => ({ id, kind, title, body, createdAt }))
}

/* ── 후기 ──────────────────────────────────────────────────────────────── */

interface SemoReviewPage {
  items?: ShopReview[]
  total?: number
  reviewableOrders?: Array<{ orderNo: string; confirmedAt: string | null }>
}

export async function semoListReviews(
  ownerKey: string | null,
  itemId: string,
  page = 1,
  limit = 10,
): Promise<ReviewPage> {
  if (!isSemoConfigured()) return { items: [], total: 0, reviewableOrders: [] }
  const data = await semo<SemoReviewPage>(`/items/${encodeURIComponent(itemId)}/reviews`, {
    query: { ownerKey: ownerKey ?? undefined, page, limit },
  })
  return {
    items: (data?.items ?? []).map(review => ({
      id: review.id,
      authorLabel: review.authorLabel,
      body: review.body,
      photoUrls: review.photoUrls ?? [],
      helpfulCount: review.helpfulCount ?? 0,
      createdAt: review.createdAt,
      helpedByMe: review.helpedByMe === true,
      mine: review.mine === true,
    })),
    total: data?.total ?? 0,
    // 주문 id 는 몰이 쓸 일이 없어 번호·확정일만 넘긴다
    reviewableOrders: (data?.reviewableOrders ?? []).map(order => ({
      orderNo: order.orderNo,
      confirmedAt: order.confirmedAt ?? null,
    })),
  }
}

export async function semoCreateReview(input: {
  ownerKey: string
  itemId: string
  orderNo: string
  body: string
  photos: File[]
}): Promise<ShopReview> {
  if (!isSemoConfigured()) {
    throw new ReactionApiError(503, '세모 연결이 없는 환경이라 후기를 저장할 수 없습니다.')
  }
  const form = new FormData()
  form.set('ownerKey', input.ownerKey)
  form.set('orderNo', input.orderNo)
  form.set('body', input.body)
  for (const photo of input.photos) form.append('photos', photo, photo.name)
  const review = await semo<ShopReview>(`/items/${encodeURIComponent(input.itemId)}/reviews`, {
    method: 'POST',
    body: form,
  })
  if (!review) throw new ReactionApiError(502, '세모가 후기를 돌려주지 않았습니다.')
  return review
}

export type ReviewAction = 'helpful' | 'report' | 'delete'

export async function semoReviewAction(
  ownerKey: string,
  reviewId: string,
  action: ReviewAction,
  extra: { on?: boolean; reason?: string } = {},
): Promise<Record<string, unknown>> {
  if (!isSemoConfigured()) {
    throw new ReactionApiError(503, '세모 연결이 없는 환경이라 저장할 수 없습니다.')
  }
  const body =
    action === 'helpful'
      ? { ownerKey, on: extra.on !== false }
      : action === 'report'
        ? { ownerKey, reason: extra.reason ?? 'OTHER' }
        : { ownerKey }
  const data = await semo<Record<string, unknown>>(`/reviews/${encodeURIComponent(reviewId)}/${action}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return data ?? {}
}
