import { NextResponse } from 'next/server'

import { OrderError } from '@/lib/orders'

/**
 * 원장 쪽 실패를 화면이 읽을 수 있는 모양으로 옮긴다.
 *
 * 4xx 는 **담당자가 고칠 수 있는 것**이라 문구를 그대로 전한다(취소 불가 사유·카드 거절·
 * 잔액 부족 등). 503 도 그대로 전한다 — 세모가 «씨마켓 결제 연동이 설정되지 않았다» 를
 * 503 으로 말하는데, 그 문구가 있어야 담당자가 «내 잘못이 아니라 설정» 임을 알고 운영자를
 * 부른다. 나머지 5xx 는 담당자가 할 수 있는 게 없으므로 일반 문구로 접고 서버에 남긴다.
 *
 * route.ts 안에 두지 않는 이유: Next 는 라우트 파일의 export 를 HTTP 메서드로
 * 검증해서, 헬퍼를 export 하면 빌드가 깨진다.
 */
export function toErrorResponse(error: unknown, fallback: string) {
  if (error instanceof OrderError) {
    if ((error.status >= 400 && error.status < 500) || error.status === 503) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error('[shop/api]', error.status, error.message)
    return NextResponse.json({ message: fallback }, { status: 502 })
  }

  console.error('[shop/api]', error)
  return NextResponse.json({ message: fallback }, { status: 500 })
}
