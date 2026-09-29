import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/lib/api-errors'
import { cancelMallRequest } from '@/lib/mall-requests'
import { getShopMember } from '@/lib/shop-member'

/** 내 요청 취소 — 접수·검토 중일 때만. 그 뒤는 세모가 409 와 사유를 준다. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { id } = await context.params
  try {
    return NextResponse.json({ request: await cancelMallRequest(member.memberKey, id) })
  } catch (error) {
    return toErrorResponse(error, '요청을 취소하지 못했습니다.')
  }
}
