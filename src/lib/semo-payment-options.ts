import type { PaymentOptions } from '@/lib/order-types'
import { PostpaidMallError } from '@/lib/postpaid-mall-stub'
import { resolveSemoApi, storefrontUrl } from '@/lib/semo-api'

/**
 * 세모 결제수단 클라이언트 — `payment-options.ts` 가 세모 모드에서 위임하는 곳.
 *
 * 세모 쪽 실체: `GET /external/storefronts/{slug}/payment-options?ownerKey=[&payerMemberId=]` — 그 주문자
 * (씨마켓 sub)가 안전결제에 쓸 수 있는 **씨마켓 저장카드**(빌키가 살아 있는 것만)와
 * **포인트 잔액**. 돈의 정본은 씨마켓이고 세모는 씨마켓 내부 API 를 옮겨 줄 뿐이다.
 *
 * 파트너 API 키 전용이다 — 신원 확인은 몰 서버가 하고, ownerKey 는 세션의 memberKey 로만
 * 채운다(본문·질의로 받으면 남의 카드 목록을 읽는다).
 *
 * 직원(EMPLOYEE)은 카드·포인트가 자기 것이 아니라 **소속 회원**의 것이다(씨마켓이 회원 단위로만 둔다) —
 * `payerMemberId` 에 세션의 소속 회원 id 를 싣는다. 세모는 직원에게 이 값을 요구하고, 회원에게는 안 받는다.
 *
 * 실패는 세모 문구 그대로: 씨마켓 연동 미설정 503, 씨마켓몰이 아닌 몰 409.
 */

const UPSTREAM_TIMEOUT_MS = 10_000

interface SemoEnvelope<T> {
  success?: boolean
  data?: T
  message?: string | string[]
}

/** `payment-options` 질의 — 구독의 포인트 잔액 힌트(`semo-subscriptions.ts`)도 같은 모양으로 부른다. */
export function paymentOptionsPath(memberKey: string, payerMemberId: string | null): string {
  const payer = payerMemberId ? `&payerMemberId=${encodeURIComponent(payerMemberId)}` : ''
  return `/payment-options?ownerKey=${encodeURIComponent(memberKey)}${payer}`
}

export async function semoGetPaymentOptions(
  memberKey: string,
  payerMemberId: string | null,
): Promise<PaymentOptions> {
  const config = resolveSemoApi()

  const response = await fetch(
    storefrontUrl(config, paymentOptionsPath(memberKey, payerMemberId)),
    {
      headers: { 'X-API-Key': config.apiKey },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: 'no-store',
    },
  )

  const payload = (await response.json().catch(() => null)) as SemoEnvelope<PaymentOptions> | null

  if (!response.ok || payload?.success === false || payload?.data === undefined) {
    const raw = payload?.message
    const message = Array.isArray(raw) ? raw.join(' ') : raw
    throw new PostpaidMallError(
      response.status >= 400 ? response.status : 502,
      message || `세모 응답 오류 (${response.status})`,
    )
  }

  const data = payload.data
  return {
    cards: (data.cards ?? []).map(card => ({
      id: Number(card.id),
      cardNickname: card.cardNickname ?? '',
      maskedCardNumber: card.maskedCardNumber ?? '',
      requiresPassword: Boolean(card.requiresPassword),
    })),
    points: {
      balance: Number(data.points?.balance) || 0,
      bonusBalance: Number(data.points?.bonusBalance) || 0,
      paidBalance: Number(data.points?.paidBalance) || 0,
      settlementBalance: Number(data.points?.settlementBalance) || 0,
    },
  }
}
