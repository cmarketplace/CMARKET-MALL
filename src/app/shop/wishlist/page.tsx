import { notFound } from "next/navigation";

import ShopNav from "@/components/Shop/ShopNav";
import WishlistView from "@/components/Shop/Wishlist/WishlistView";
import { reactionsEnabled } from "@/config/reactions";

// 스위치는 배포 환경변수라 요청마다 읽는다.
export const dynamic = "force-dynamic";

/**
 * 내 찜 — 반응 스위치(`SHOP_REACTIONS`)가 켜졌을 때만 있는 화면(꺼져 있으면 404).
 * 찜한 상품의 지금 값과 찜할 때 값, 가격 내림·재입고·후기 도움돼요 알림을 한곳에 모은다.
 */
export default function WishlistPage() {
  if (!reactionsEnabled()) notFound();

  return (
    <main className="min-h-screen bg-white">
      <ShopNav />
      <div className="container-shop pb-24 pt-6">
        <WishlistView />
      </div>
    </main>
  );
}
