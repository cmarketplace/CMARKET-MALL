import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/lib/api-errors'
import { getPaymentOptions } from '@/lib/payment-options'
import {
  getShopMember,
  PAYER_MISSING_MESSAGE,
  payerMissing,
  semoPayerMemberId,
} from '@/lib/shop-member'

// 카드 목록·잔액은 그 순간의 값이다. 캐시되면 방금 등록한 카드가 안 보인다.
export const dynamic = 'force-dynamic'

/**
 * 결제창 재료 — 로그인한 주문자의 씨마켓 저장카드와 포인트 잔액.
 *
 * 「누구의」 는 본문·질의가 아니라 **세션**에서만 온다. ownerKey 를 받기 시작하면 남의 카드
 * 목록을 읽는 문이 생긴다. 파트너 키는 서버에만 있고 브라우저는 이 라우트만 부른다.
 *
 * 직원(EMPLOYEE)은 **소속 회원**의 카드·포인트다 — 씨마켓이 회원 단위로만 둔다(2026-09-16 결정).
 * 소속 회원도 세션(씨마켓 userinfo `companyMemberId`)에서만 오고, 비어 있으면 403 으로 사유를 준다.
 *
 * 실패 문구는 그대로 전한다 — 씨마켓 연동 미설정(503)은 «설정을 채우면 되는 일» 이고,
 * 그 말이 화면에 있어야 담당자가 운영자를 부른다.
 */
export async function GET() {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }
  if (payerMissing(member)) {
    return NextResponse.json({ message: PAYER_MISSING_MESSAGE }, { status: 403 })
  }

  try {
    const options = await getPaymentOptions(member.memberKey, semoPayerMemberId(member))
    return NextResponse.json(options)
  } catch (error) {
    return toErrorResponse(error, '결제수단을 불러오지 못했습니다.')
  }
}
