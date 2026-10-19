import { NextResponse } from 'next/server'

import { reactionErrorResponse, requireReactionMember } from '@/lib/reactions-server'
import { semoAlerts } from '@/lib/semo-reactions'

/**
 * 내 반응 알림(찜 가격 내림·재입고·후기 도움돼요) — 세모 앱 벨과 같은 장부다. 세모 계정이 없는
 * 회원(씨마켓 직원 등)은 벨이 없어 이 목록으로만 본다.
 */
export async function GET() {
  const gate = await requireReactionMember()
  if (gate.response) return gate.response
  try {
    return NextResponse.json({ items: await semoAlerts(gate.member.memberKey) })
  } catch (error) {
    return reactionErrorResponse(error, '알림을 불러오지 못했습니다.')
  }
}
