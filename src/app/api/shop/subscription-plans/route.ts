import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/lib/api-errors'
import { semoListSubscriptionPlans, semoPointBalance } from '@/lib/semo-subscriptions'
import { getShopMember, payerMissing, semoPayerMemberId } from '@/lib/shop-member'

/**
 * 구독 상품 + (로그인했으면) 포인트 잔액 힌트. 홈은 서버에서 직접 읽지만, 화면이 새로고침 없이
 * 잔액을 다시 볼 때(충전 뒤) 이 라우트를 쓴다.
 */
export async function GET() {
  try {
    const member = await getShopMember()
    const [plans, pointBalance] = await Promise.all([
      semoListSubscriptionPlans(),
      member && !payerMissing(member)
        ? semoPointBalance(member.memberKey, semoPayerMemberId(member))
        : Promise.resolve(null),
    ])
    return NextResponse.json({ plans, pointBalance })
  } catch (error) {
    return toErrorResponse(error, '구독 상품을 불러오지 못했습니다.')
  }
}
