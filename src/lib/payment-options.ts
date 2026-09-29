import type { PaymentOptions } from '@/lib/order-types'
import { stubPaymentOptions } from '@/lib/postpaid-mall-stub'
import { isSemoConfigured } from '@/lib/semo-api'
import { semoGetPaymentOptions } from '@/lib/semo-payment-options'

/**
 * 결제수단 — **세모 → 씨마켓으로 가는 이음새.** (`orders.ts`·`quotes.ts` 와 같은 모양)
 *
 * `SEMO_API_BASE`/`SEMO_API_KEY` 가 채워진 환경에서는 세모가 씨마켓의 저장카드·포인트 잔액을
 * 옮겨 준다(`semo-payment-options.ts`). 키가 없으면 로컬 스텁이 예시 카드 두 장과 잔액을
 * 준다(개발·데모) — 결제창 화면을 키 없이도 눌러 볼 수 있어야 한다.
 *
 * `payerMemberId` 는 직원의 소속 회원 id(직원만, 회원은 null) — 카드·포인트의 주인이다(`shop-member.ts`).
 */
export async function getPaymentOptions(
  memberKey: string,
  payerMemberId: string | null,
): Promise<PaymentOptions> {
  if (isSemoConfigured()) return semoGetPaymentOptions(memberKey, payerMemberId)
  return stubPaymentOptions(memberKey, payerMemberId)
}
