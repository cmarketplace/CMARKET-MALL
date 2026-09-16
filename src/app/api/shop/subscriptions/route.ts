import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/lib/api-errors'
import { semoCreateSubscription, semoListSubscriptions } from '@/lib/semo-subscriptions'
import {
  getShopMember,
  PAYER_MISSING_MESSAGE,
  payerMissing,
  semoPayerMemberId,
} from '@/lib/shop-member'

/**
 * 정기구독 신청·목록.
 *
 * 명의는 세션에서만 온다(로그인 없으면 401) — 본문으로 받으면 남의 포인트로 구독한다.
 * 직원은 소속 회원의 포인트로 결제한다(`payerMemberId`, 소속이 비었으면 403).
 * 첫 주기는 세모가 이 요청 안에서 포인트 결제까지 끝내므로, 응답의 `result.firstCycle` 이
 * 성패를 말한다(FAILED 여도 구독은 남고 내일 아침 다시 시도한다).
 */

interface SubscribeBody {
  planKey?: unknown
  people?: unknown
  frequencyIndex?: unknown
  shipTo?: { name?: unknown; zip?: unknown; address?: unknown; tel?: unknown }
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: Request) {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json(
      { message: '정기구독을 신청하려면 씨마켓 계정으로 로그인해 주세요.' },
      { status: 401 },
    )
  }
  if (payerMissing(member)) {
    return NextResponse.json({ message: PAYER_MISSING_MESSAGE }, { status: 403 })
  }

  let body: SubscribeBody
  try {
    body = (await request.json()) as SubscribeBody
  } catch {
    return NextResponse.json({ message: '요청 본문을 읽지 못했습니다.' }, { status: 400 })
  }

  const planKey = text(body.planKey, 50)
  const people = Number(body.people)
  const frequencyIndex = Number.isInteger(Number(body.frequencyIndex)) ? Number(body.frequencyIndex) : 0
  const shipTo = {
    name: text(body.shipTo?.name, 60),
    zip: text(body.shipTo?.zip, 10),
    address: text(body.shipTo?.address, 1000),
    tel: text(body.shipTo?.tel, 30) || null,
  }

  if (!planKey || !Number.isInteger(people) || people < 1) {
    return NextResponse.json({ message: '구독 상품과 인원을 확인해 주세요.' }, { status: 400 })
  }
  if (!shipTo.name || !shipTo.zip || !shipTo.address) {
    return NextResponse.json(
      { message: '배송지(받는 곳·우편번호·주소)를 모두 적어 주세요.' },
      { status: 400 },
    )
  }

  try {
    const result = await semoCreateSubscription({
      memberKey: member.memberKey,
      payerMemberId: semoPayerMemberId(member),
      planKey,
      people,
      frequencyIndex,
      shipTo,
    })
    return NextResponse.json({ result }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error, '구독을 신청하지 못했습니다.')
  }
}

/** 내 구독 목록. */
export async function GET() {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }
  try {
    return NextResponse.json({ subscriptions: await semoListSubscriptions(member.memberKey) })
  } catch (error) {
    return toErrorResponse(error, '구독 목록을 불러오지 못했습니다.')
  }
}
