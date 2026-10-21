import { Suspense } from "react";

import Shop from "@/components/Shop/Shop";
import type { Product } from "@/components/Shop/product.data";
import {
  fetchMandatoryPrograms,
  fetchStorefrontCategories,
  fetchStorefrontPage,
  maskProducts,
  SemoFeedError,
  type StorefrontCategoryGroup,
} from "@/lib/catalog";
import type { MandatoryProgramIndex } from "@/lib/mandatory";
import { attachSocialProof } from "@/lib/reactions-server";
import { getShopMember } from "@/lib/shop-member";

// 보는 사람 등급에 따라 목록의 기준값이 빠진다 — 요청마다 그린다.
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  let categories: StorefrontCategoryGroup[] | null = null;
  let mandatory: MandatoryProgramIndex | null = null;
  let initialItems: Product[] = [];
  let initialTotal = 0;
  let loadFailed = false;

  // try/catch 는 가져오기만 감싼다. JSX 까지 감싸면 렌더 도중의 오류까지 삼켜서
  // «피드 장애» 로 잘못 보고한다.
  try {
    // 화면은 «전체» 로 열린다. 그 칸은 분류를 걸지 않은 목록이라 여기서도 필터 없이
    // 첫 쪽을 그린다 — 조건이 다르면 브라우저가 첫 렌더 직후 다시 불러 같은 화면을 두 번 그린다.
    const [index, page, member, programs] = await Promise.all([
      fetchStorefrontCategories(),
      fetchStorefrontPage({ limit: 120 }),
      getShopMember(),
      // 법적 구매 칩은 덤이다 — 이 조회가 실패해도 목록은 그린다(탭만 감춘다)
      fetchMandatoryPrograms().catch(() => null),
    ]);
    categories = index;
    mandatory = programs;
    // 반응 스위치가 꺼져 있으면 받은 그대로 돌려준다(배지 없음).
    initialItems = await attachSocialProof(maskProducts(page.items, member?.tier ?? null), member);
    initialTotal = page.total;
  } catch (error) {
    // 피드가 죽은 것과 «상품이 없는 쇼핑몰» 은 손님에게 다르게 보여야 한다.
    // 빈 목록으로 삼키면 품절과 구분되지 않는다.
    if (!(error instanceof SemoFeedError)) throw error;
    console.error("[shop]", error.message);
    loadFailed = true;
  }

  /**
   * `?q=` 는 **서버에서 읽지 않는다.**
   *
   * 페이지가 `searchParams` 를 받는 순간 이 라우트는 통째로 요청마다 렌더된다. 검색어는
   * 첫 상태를 정할 뿐이라 그 대가를 치를 이유가 없어, 클라이언트에서 읽고 정적 렌더를
   * 지킨다. `useSearchParams` 는 Suspense 경계를 요구한다.
   */
  return (
    <Suspense fallback={null}>
      <Shop
        categories={categories}
        initialItems={initialItems}
        initialTotal={initialTotal}
        loadFailed={loadFailed}
        mandatory={mandatory}
      />
    </Suspense>
  );
}
