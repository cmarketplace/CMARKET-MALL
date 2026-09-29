import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/lib/api-errors'
import { semoSubscriptionAction } from '@/lib/semo-subscriptions'
import { getShopMember } from '@/lib/shop-member'
import type { SubscriptionAction } from '@/lib/subscription-types'

type Params = { params: Promise<{ id: string; action: string }> }

const ACTIONS: readonly SubscriptionAction[] = ['pause', 'resume', 'cancel']

/** 일시정지·재개·해지. 세모가 소유(세션 memberKey)까지 맞춰 처리한다. */
export async function POST(request: Request, { params }: Params) {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }
  const { id, action } = await params
  if (!ACTIONS.includes(action as SubscriptionAction)) {
    return NextResponse.json({ message: '알 수 없는 동작입니다.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => ({}))) as { reason?: unknown }
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : undefined

  try {
    const subscription = await semoSubscriptionAction(
      member.memberKey,
      id,
      action as SubscriptionAction,
      reason,
    )
    return NextResponse.json({ subscription })
  } catch (error) {
    return toErrorResponse(error, '구독을 변경하지 못했습니다.')
  }
}
