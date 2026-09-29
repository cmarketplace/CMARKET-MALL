/**
 * 데모 신원(SHOP_DEMO_MEMBER)을 쓸지 — **Vercel 운영 배포에서는 값이 있어도 끈다.**
 *
 * 데모 신원이 켜지면 SSO 문을 통째로 건너뛰고 익명 방문자를 데모 회원으로 친다. 공급기업 데모 회원 id
 * (SHOP_DEMO_SUPPLIER_MEMBER)는 실제 카드·포인트가 있는 회원을 가리킬 수 있어, 운영에 값이 실수로
 * 들어가면 누구나 그 회원 이름으로 결제까지 닿는다. 예전에는 README 의 «운영에 넣지 말 것» 문구만
 * 막고 있었다(2026-09-16 검수). 미리보기(preview)·로컬은 그대로 쓸 수 있다.
 *
 * 미들웨어(proxy)에서도 부르므로 next/headers 같은 요청 API 를 import 하지 않는다.
 */
export function isDemoMode(): boolean {
  if (process.env.VERCEL_ENV === 'production') return false
  return Boolean(process.env.SHOP_DEMO_MEMBER?.trim())
}
