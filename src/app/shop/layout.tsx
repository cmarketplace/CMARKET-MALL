import { SessionProvider } from "next-auth/react";

import { auth } from "@/auth";
import { linkBuyEnabled } from "@/config/link-buy";
import { reactionsEnabled } from "@/config/reactions";
import { IS_SSO_CONFIGURED } from "@/lib/shop-auth";

import { ShopProvider } from "../providers/ShopProvider";

/**
 * 쇼핑몰 공통 껍데기.
 *
 * 입장 판정은 여기가 아니라 `src/proxy.ts` 가 한다 — `/shop` 전 경로를 한 곳에서 막는다.
 * 이 레이아웃이 하는 일은 그 결과(세션)를 화면으로 내려보내는 것뿐이다.
 *
 * 세션을 **서버에서** 읽어 넘긴다. SessionProvider 에 값을 주지 않으면 클라이언트가
 * `/api/auth/session` 을 따로 왕복하고, 그동안 헤더의 사용자 이름이 비어 깜빡인다.
 *
 * SSO 설정이 없는 로컬에서는 `auth()` 를 부르지 않는다 — AUTH_SECRET 이 없으면 던지고,
 * 그러면 쇼핑몰 전 화면이 500 이 된다(게이트도 같은 이유로 로컬에서는 통과시킨다).
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  // Provider 는 **항상** 세운다. 빼면 `useSession()` 이 컨텍스트 없이 불려 헤더가 터진다
  // (개발은 throw, 운영 빌드는 undefined 구조분해 → prerender 실패).
  //
  // 대신 미설정일 때 `null` 을 «이미 확인했고 비어 있다» 로 넘긴다. `undefined` 로 두면
  // 클라이언트가 `/api/auth/session` 을 부르는데, 설정이 없는 그 경로는 MissingSecret 으로
  // 떨어져 콘솔이 빨갛게 된다. `null` 이면 그 왕복 자체가 일어나지 않는다.
  const session = IS_SSO_CONFIGURED ? await auth() : null;

  return (
    <SessionProvider session={session}>
      {/* 반응 스위치(SHOP_REACTIONS)는 서버 값이라 여기서 읽어 내려보낸다 — 기본 꺼짐 */}
      <ShopProvider reactionsEnabled={reactionsEnabled()} linkBuyEnabled={linkBuyEnabled()}>{children}</ShopProvider>
    </SessionProvider>
  );
}
