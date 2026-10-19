import { NextResponse } from 'next/server'

import { REVIEW_LIMITS } from '@/lib/reaction-types'
import { reactionErrorResponse, requireReactionMember } from '@/lib/reactions-server'
import { semoCreateReview, semoListReviews } from '@/lib/semo-reactions'

/**
 * 상품 후기 — 목록(누구나, 로그인 몰이라 로그인한 사람) · 쓰기(구매확정한 사람만, 세모가 주문 원장으로 판정).
 * 반응 스위치가 꺼져 있으면 404.
 */
export async function GET(request: Request) {
  const gate = await requireReactionMember()
  if (gate.response) return gate.response

  const params = new URL(request.url).searchParams
  const itemId = params.get('itemId')?.trim() ?? ''
  if (!itemId) return NextResponse.json({ message: '상품을 확인할 수 없습니다.' }, { status: 400 })
  const page = Math.max(Number(params.get('page')) || 1, 1)

  try {
    return NextResponse.json(await semoListReviews(gate.member.memberKey, itemId, page, 10))
  } catch (error) {
    return reactionErrorResponse(error, '후기를 불러오지 못했습니다.')
  }
}

export async function POST(request: Request) {
  const gate = await requireReactionMember()
  if (gate.response) return gate.response

  const form = await request.formData().catch(() => null)
  if (!form) return NextResponse.json({ message: '후기 내용을 읽지 못했습니다.' }, { status: 400 })

  const itemId = String(form.get('itemId') ?? '').trim()
  const orderNo = String(form.get('orderNo') ?? '').trim()
  const body = String(form.get('body') ?? '').trim()
  const photos = form.getAll('photos').filter((entry): entry is File => entry instanceof File && entry.size > 0)

  if (!itemId || !orderNo) {
    return NextResponse.json({ message: '어느 주문의 상품인지 골라 주세요.' }, { status: 400 })
  }
  if (body.length < REVIEW_LIMITS.bodyMin || body.length > REVIEW_LIMITS.bodyMax) {
    return NextResponse.json(
      { message: `후기는 ${REVIEW_LIMITS.bodyMin}자 이상 ${REVIEW_LIMITS.bodyMax}자 이하로 적어 주세요.` },
      { status: 400 },
    )
  }
  if (photos.length > REVIEW_LIMITS.photosMax) {
    return NextResponse.json({ message: `사진은 ${REVIEW_LIMITS.photosMax}장까지 올릴 수 있습니다.` }, { status: 400 })
  }
  if (photos.some(photo => !photo.type.startsWith('image/') || photo.size > REVIEW_LIMITS.photoMaxBytes)) {
    return NextResponse.json({ message: '사진은 장당 5MB 이하 이미지로 올려 주세요.' }, { status: 400 })
  }

  try {
    const review = await semoCreateReview({ ownerKey: gate.member.memberKey, itemId, orderNo, body, photos })
    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    return reactionErrorResponse(error, '후기를 저장하지 못했습니다.')
  }
}
