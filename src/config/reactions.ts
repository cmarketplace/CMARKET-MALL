/**
 * «반응» 스위치 — 찜(하트)·내 찜·사회적 증거 배지·기관 재구매순·납품 사진 후기·도움돼요 (2026-10-19).
 *
 * **기본은 꺼짐**이다. 이 몰은 main 머지가 곧 Vercel 운영 배포라, 꺼져 있으면 화면이 지금과 완전히 같아야 한다:
 * 하트 대신 원래 북마크(브라우저 저장), 배지·후기·내 찜 메뉴 없음, `/shop/wishlist`·`/api/shop/reactions/*` 는 404.
 *
 * 켜는 법: Vercel 환경변수 `SHOP_REACTIONS=1` → 재배포. **세모 쪽 반응 API(세모 PR #1473)가 운영에 나간 뒤** 켠다 —
 * 먼저 켜면 찜·후기 호출이 세모 404 로 실패한다(화면은 «저장하지 못했습니다» 로 접힌다).
 *
 * 서버 전용 값이다(`NEXT_PUBLIC_` 아님). 클라이언트는 레이아웃이 내려 주는 값(ShopProvider)으로만 안다.
 */
export function reactionsEnabled(): boolean {
  return process.env.SHOP_REACTIONS?.trim() === '1'
}
