import { PostpaidMallError } from '@/lib/postpaid-mall-stub'
import { isSemoConfigured, resolveSemoApi, storefrontUrl } from '@/lib/semo-api'
import { paymentOptionsPath } from '@/lib/semo-payment-options'
import type {
  Subscription,
  SubscriptionAction,
  SubscriptionPlan,
  SubscribeResult,
} from '@/lib/subscription-types'

/**
 * 세모 정기구독 클라이언트 — **서버 전용**(파트너 키가 여기서만 산다).
 *
 * 세모 쪽 실체: `/external/storefronts/{slug}/subscription-plans` · `/subscriptions[...]`.
 * 구독의 정본·채번·결제일 산술·포인트 결제 전부 세모다. 몰이 보내는 것은 «누가(ownerKey =
 * 세션의 memberKey) · 어느 상품 · 몇 명 · 어느 주기 · 어디로» 뿐이고, 단가는 보내지 않는다.
 *
 * 응답은 `{success, data, message}` 봉투다. 4xx 의 message 는 담당자가 고칠 수 있는 말(인원 범위,
 * 포인트 부족)이라 그대로 전달한다(`semo-quotes.ts` 와 같은 규칙).
 *
 * 스텁은 없다 — 세모 키가 없는 환경에서는 상품 목록이 비고, 화면은 자체 예상 산식(미리보기)으로
 * 돌아간다. 돈이 오가는 기능을 가짜 원장으로 흉내 내지 않는다.
 */

const UPSTREAM_TIMEOUT_MS = 30_000
const LIST_LIMIT = 50

interface SemoEnvelope<T> {
  success?: boolean
  data?: T
  message?: string | string[]
}

async function semoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const config = resolveSemoApi()

  const response = await fetch(storefrontUrl(config, path), {
    ...init,
    headers: {
      'X-API-Key': config.apiKey,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => null)) as SemoEnvelope<T> | null

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

function requireSemo(): void {
  if (!isSemoConfigured()) {
    throw new PostpaidMallError(503, '정기구독은 세모 연동이 설정된 환경에서만 신청할 수 있습니다.')
  }
}

/** 몰에 등록된 구독 상품. 세모 미설정이면 빈 목록(화면은 예상 산식으로 돌아간다). */
export async function semoListSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (!isSemoConfigured()) return []
  const page = await semoFetch<{ plans: SubscriptionPlan[] }>('/subscription-plans')
  return page.plans
}

/**
 * 포인트 잔액 힌트 — 결제수단 조회(`payment-options`)의 포인트 합만 뽑는다. 결제창 전체는 S6 몫이라
 * 여기서는 «구독 첫 결제가 들어갈 만큼 있는가» 만 본다. 못 읽으면 null(화면은 힌트를 접는다).
 * 직원은 소속 회원의 잔액이다(`payerMemberId`, 회원은 null).
 */
export async function semoPointBalance(
  memberKey: string,
  payerMemberId: string | null,
): Promise<number | null> {
  if (!isSemoConfigured()) return null
  try {
    const options = await semoFetch<{ points?: { balance?: number } }>(
      paymentOptionsPath(memberKey, payerMemberId),
    )
    const balance = options.points?.balance
    return typeof balance === 'number' ? balance : null
  } catch (error) {
    console.error('[semo-subscriptions] point balance', error instanceof Error ? error.message : error)
    return null
  }
}

export async function semoCreateSubscription(input: {
  memberKey: string
  /** 포인트의 주인(소속 회원 id) — 직원만 채운다. 세모가 직원 구독에 요구한다(없으면 400). */
  payerMemberId: string | null
  planKey: string
  people: number
  frequencyIndex: number
  shipTo: { name: string; zip: string; address: string; tel: string | null }
}): Promise<SubscribeResult> {
  requireSemo()
  return semoFetch<SubscribeResult>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      ownerKey: input.memberKey,
      ...(input.payerMemberId ? { payerMemberId: input.payerMemberId } : {}),
      planKey: input.planKey,
      people: input.people,
      frequencyIndex: input.frequencyIndex,
      shipTo: {
        name: input.shipTo.name,
        zip: input.shipTo.zip,
        address: input.shipTo.address,
        ...(input.shipTo.tel ? { tel: input.shipTo.tel } : {}),
      },
    }),
  })
}

export async function semoListSubscriptions(memberKey: string): Promise<Subscription[]> {
  if (!isSemoConfigured()) return []
  const page = await semoFetch<{ subscriptions: Subscription[]; total: number }>(
    `/subscriptions?ownerKey=${encodeURIComponent(memberKey)}&limit=${LIST_LIMIT}`,
  )
  return page.subscriptions
}

/** 구독 1건(주기 기록 포함). 세모가 신원 키까지 맞춰 찾으므로 남의 구독은 404 로 온다. */
export async function semoGetSubscription(memberKey: string, id: string): Promise<Subscription> {
  requireSemo()
  return semoFetch<Subscription>(
    `/subscriptions/${encodeURIComponent(id)}?ownerKey=${encodeURIComponent(memberKey)}`,
  )
}

export async function semoSubscriptionAction(
  memberKey: string,
  id: string,
  action: SubscriptionAction,
  reason?: string,
): Promise<Subscription> {
  requireSemo()
  return semoFetch<Subscription>(`/subscriptions/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ ownerKey: memberKey, ...(action === 'cancel' && reason ? { reason } : {}) }),
  })
}

export async function semoUpdateSubscription(
  memberKey: string,
  id: string,
  patch: { people?: number; frequencyIndex?: number },
): Promise<Subscription> {
  requireSemo()
  return semoFetch<Subscription>(`/subscriptions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ ownerKey: memberKey, ...patch }),
  })
}
