import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/lib/api-errors'
import { createMallRequest, listMallRequests } from '@/lib/mall-requests'
import { validateRequestBody } from '@/lib/request-validate'
import { getShopMember } from '@/lib/shop-member'

/**
 * 몰 요청 접수·목록 — 견적 먼저인 서비스, 공동구매 수요조사, 연간 단가계약, 구해드림 등.
 *
 * 명의는 세션에서만 온다(로그인 없으면 401) — 본문으로 받으면 남의 이름으로 수요조사에 참여한다.
 * 칸 검증은 `request-validate.ts` 가 하고, 원장은 세모다(`mall-requests.ts`).
 */

export async function POST(request: Request) {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '요청을 보내려면 씨마켓 계정으로 로그인해 주세요.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: '요청 본문을 읽지 못했습니다.' }, { status: 400 })
  }

  const validated = validateRequestBody(body)
  if (!validated.ok) {
    return NextResponse.json({ message: validated.message }, { status: 400 })
  }

  try {
    const created = await createMallRequest(member, validated.value)
    return NextResponse.json({ request: created }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error, '요청을 접수하지 못했습니다.')
  }
}

/** 내 요청 목록. */
export async function GET() {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }
  try {
    return NextResponse.json({ requests: await listMallRequests(member.memberKey) })
  } catch (error) {
    return toErrorResponse(error, '요청 목록을 불러오지 못했습니다.')
  }
}
