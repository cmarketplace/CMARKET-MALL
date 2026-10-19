import { NextResponse } from 'next/server'

import { REPORT_REASONS } from '@/lib/reaction-types'
import { reactionErrorResponse, requireReactionMember } from '@/lib/reactions-server'
import { semoReviewAction, type ReviewAction } from '@/lib/semo-reactions'

const ACTIONS: ReviewAction[] = ['helpful', 'report', 'delete']

/**
 * 후기 «도움돼요»(켜기/끄기) · 신고 · 내 후기 지우기 — 반응 스위치가 켜졌을 때만.
 * 내 후기에 도움돼요·신고는 세모가 거절한다(422).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string; action: string }> },
) {
  const gate = await requireReactionMember()
  if (gate.response) return gate.response

  const { reviewId, action } = await params
  const known = ACTIONS.find(candidate => candidate === action)
  if (!known) return NextResponse.json({ message: '없는 동작입니다.' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as { on?: unknown; reason?: unknown }
  const reason = typeof body.reason === 'string' ? body.reason : 'OTHER'
  if (known === 'report' && !REPORT_REASONS.some(option => option.value === reason)) {
    return NextResponse.json({ message: '신고 사유를 골라 주세요.' }, { status: 400 })
  }

  try {
    const result = await semoReviewAction(gate.member.memberKey, reviewId, known, {
      on: body.on !== false,
      reason,
    })
    return NextResponse.json(result)
  } catch (error) {
    return reactionErrorResponse(error, '처리하지 못했습니다.')
  }
}
