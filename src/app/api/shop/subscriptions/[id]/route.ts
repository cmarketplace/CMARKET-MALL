import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/lib/api-errors'
import { semoGetSubscription, semoUpdateSubscription } from '@/lib/semo-subscriptions'
import { getShopMember } from '@/lib/shop-member'

type Params = { params: Promise<{ id: string }> }

/** 구독 1건(주기별 결제 기록 포함). 남의 구독은 세모가 404 로 답한다. */
export async function GET(_request: Request, { params }: Params) {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }
  const { id } = await params
  try {
    return NextResponse.json({ subscription: await semoGetSubscription(member.memberKey, id) })
  } catch (error) {
    return toErrorResponse(error, '구독을 불러오지 못했습니다.')
  }
}

/** 인원·주기 변경 — 다음 주기부터. */
export async function PATCH(request: Request, { params }: Params) {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }
  const { id } = await params

  let body: { people?: unknown; frequencyIndex?: unknown }
  try {
    body = (await request.json()) as { people?: unknown; frequencyIndex?: unknown }
  } catch {
    return NextResponse.json({ message: '요청 본문을 읽지 못했습니다.' }, { status: 400 })
  }

  const patch: { people?: number; frequencyIndex?: number } = {}
  if (body.people !== undefined) {
    const people = Number(body.people)
    if (!Number.isInteger(people) || people < 1) {
      return NextResponse.json({ message: '인원을 확인해 주세요.' }, { status: 400 })
    }
    patch.people = people
  }
  if (body.frequencyIndex !== undefined) {
    const index = Number(body.frequencyIndex)
    if (!Number.isInteger(index) || index < 0) {
      return NextResponse.json({ message: '주기를 확인해 주세요.' }, { status: 400 })
    }
    patch.frequencyIndex = index
  }
  if (patch.people === undefined && patch.frequencyIndex === undefined) {
    return NextResponse.json({ message: '바꿀 값이 없습니다.' }, { status: 400 })
  }

  try {
    return NextResponse.json({ subscription: await semoUpdateSubscription(member.memberKey, id, patch) })
  } catch (error) {
    return toErrorResponse(error, '구독을 변경하지 못했습니다.')
  }
}
