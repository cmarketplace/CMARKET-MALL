import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { IS_SSO_CONFIGURED, isAllowedGroup } from '@/lib/shop-auth'
import { isDemoMode } from '@/lib/demo-mode'

/**
 * 몰의 문 — «/shop 전체와 /api/shop 전체» 를 지킨다 (2026-09-07 결정. 그 전엔 «내 기록» 두
 * 화면만 지키고 열람은 공개였다).
 *
 * 비로그인 열람을 막는 이유: 공급사도 고객으로 사는 몰이라, 공급사가 로그아웃하고 보면
 * 경쟁사 단가가 보이는 구멍이 생긴다. 랜딩(`/`)은 matcher 밖이라 계속 공개다.
 * 화면은 씨마켓 로그인으로 보내고, API 는 401 JSON 을 준다(브라우저 fetch 에 302 를 주면
 * HTML 이 JSON 자리에 들어와 «상품을 불러오지 못했습니다» 로 잘못 읽힌다).
 * 주문·견적 API 는 이 게이트와 별개로 스스로 401 을 낸다(문이 둘이어야 한쪽 설정이
 * 넓어져도 남의 주문이 새지 않는다).
 *
 * 세션 검증은 이 도메인이 직접 발급한 서명 세션(Auth.js JWT)이다. 씨마켓 쿠키를 읽는
 * 방식이 아니다 — 씨마켓과 이 몰은 다른 등록 도메인이라 그 쿠키가 여기로 전송될 경로가
 * 애초에 없다.
 */
const gate = auth((request) => {
  const session = request.auth

  if (!session?.user) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
    }
    // 몰 안의 로그인 안내 화면을 먼저 세운다(2026-09-08 결정). 곧장 씨마켓 authorize 로 보내면
    // 링크를 타고 온 사람이 «왜 갑자기 씨마켓 로그인이 뜨나» 를 모른다 — 씨마켓 회원만 이용할 수
    // 있다는 말과 회원가입 문이 한 화면에 있어야 한다. 씨마켓 사이드바에서 오는 무클릭 진입은
    // `/api/auth/start` 를 직접 가리키므로 그대로 화면 전환만으로 들어온다.
    const loginUrl = new URL('/login', request.nextUrl.origin)
    loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  if (!isAllowedGroup(session.user.groupCode)) {
    // 씨마켓은 열어 줬는데 이 몰이 `CMARKET_GROUP_CODES` 로 더 좁혀 둔 경우다(선택값).
    // 로그인 반복으로 몰지 않고 사유를 보여준다.
    return NextResponse.redirect(new URL('/login?error=not_allowed', request.nextUrl.origin))
  }

  return NextResponse.next()
})

/**
 * SSO 설정이 비어 있을 때의 처신.
 *
 * - **데모 신원(SHOP_DEMO_MEMBER)이 켜져 있으면** 통과(Vercel 운영 배포에서는 값이 있어도 꺼진다) — 파트너 키 발급 전에 주문
 *   화면을 눌러 보는 임시 통로다(`shop-member.ts`). 운영 환경변수에는 절대 넣지 않는다.
 * - **운영**: 내 기록 화면만 닫는다(열람은 애초에 matcher 밖이라 계속 열려 있다).
 * - **로컬**: 통과 — `auth()` 는 AUTH_SECRET 없이는 요청 자체를 던져 화면이 500 이 된다.
 */
export default function proxy(...args: Parameters<typeof gate>) {
  // 데모 신원 — 문을 연다. «누가» 는 shop-member.ts 가 채우고, 실세션이 있으면
  // 언제나 실세션이 이긴다.
  if (isDemoMode()) {
    return NextResponse.next()
  }

  if (!IS_SSO_CONFIGURED) {
    const [request] = args
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.redirect(new URL('/login?error=not_configured', request.nextUrl.origin))
    }
    return NextResponse.next()
  }

  return gate(...args)
}

export const config = {
  // 몰 전체 + 몰 API (shop-auth.ts 의 SHOP_PROTECTED_PATHS 와 같은 범위.
  // matcher 는 정적 문자열만 받아 여기 다시 적는다). `/shop/:path*` 는 `/shop` 자체도 잡는다.
  matcher: ['/shop/:path*', '/api/shop/:path*'],
}
