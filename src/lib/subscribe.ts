/**
 * 브라우저에서 정기구독을 신청·조작한다 — `/api/shop/subscriptions*` 로만 간다.
 *
 * 원장을 직접 부르지 않는 이유는 신원이다(`place-order.ts` 와 같은 규칙): 「누가」는 서버 세션이
 * 정하고, 세모 파트너 키도 서버에만 있다.
 */

import { LoginRequiredError } from '@/lib/place-order'
import type {
  Subscription,
  SubscriptionAction,
  SubscriptionShipTo,
  SubscribeResult,
} from '@/lib/subscription-types'

async function readPayload<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null
}

export async function subscribe(input: {
  planKey: string
  people: number
  frequencyIndex: number
  shipTo: SubscriptionShipTo
}): Promise<SubscribeResult> {
  const response = await fetch('/api/shop/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (response.status === 401) throw new LoginRequiredError()

  const payload = await readPayload<{ result?: SubscribeResult; message?: string }>(response)
  if (!response.ok || !payload?.result) {
    throw new Error(payload?.message ?? '구독을 신청하지 못했습니다.')
  }
  return payload.result
}

export async function fetchSubscription(id: string): Promise<Subscription> {
  const response = await fetch(`/api/shop/subscriptions/${encodeURIComponent(id)}`)
  const payload = await readPayload<{ subscription?: Subscription; message?: string }>(response)
  if (!response.ok || !payload?.subscription) {
    throw new Error(payload?.message ?? '구독을 불러오지 못했습니다.')
  }
  return payload.subscription
}

export async function subscriptionAction(
  id: string,
  action: SubscriptionAction,
  reason?: string,
): Promise<Subscription> {
  const response = await fetch(`/api/shop/subscriptions/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reason ? { reason } : {}),
  })
  const payload = await readPayload<{ subscription?: Subscription; message?: string }>(response)
  if (!response.ok || !payload?.subscription) {
    throw new Error(payload?.message ?? '구독을 변경하지 못했습니다.')
  }
  return payload.subscription
}

export async function updateSubscription(
  id: string,
  patch: { people?: number; frequencyIndex?: number },
): Promise<Subscription> {
  const response = await fetch(`/api/shop/subscriptions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const payload = await readPayload<{ subscription?: Subscription; message?: string }>(response)
  if (!response.ok || !payload?.subscription) {
    throw new Error(payload?.message ?? '구독을 변경하지 못했습니다.')
  }
  return payload.subscription
}
