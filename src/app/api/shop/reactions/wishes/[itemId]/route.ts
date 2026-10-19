import { NextResponse } from 'next/server'

import { reactionErrorResponse, requireReactionMember } from '@/lib/reactions-server'
import { semoRemoveWish } from '@/lib/semo-reactions'

/** 찜 해제 — 반응 스위치가 켜졌을 때만. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const gate = await requireReactionMember()
  if (gate.response) return gate.response

  const { itemId } = await params
  try {
    await semoRemoveWish(gate.member.memberKey, itemId)
    return NextResponse.json({ itemId, wished: false })
  } catch (error) {
    return reactionErrorResponse(error, '찜을 해제하지 못했습니다.')
  }
}
