import CartView from "@/components/Shop/Cart/CartView";
import type { Product } from "@/components/Shop/product.data";
import { fetchStorefrontPage, isStubCatalog, maskProducts, SemoFeedError } from "@/lib/catalog";
import { getShopMember } from "@/lib/shop-member";

export const dynamic = "force-dynamic";

/**
 * 추천 캐러셀에 태울 후보 수.
 *
 * 캐러셀은 12개만 그리는데, 장바구니에 든 것은 빼고 고르므로 여유를 둔다. 예전에는
 * 이 캐러셀 하나 때문에 **카탈로그를 전량** 받았다 — 승인 품목이 18,000건이 된 뒤로는
 * 장바구니를 열 때마다 피드를 50번 순차 호출했고, 빌드에서는 60초를 넘겨 배포를 죽였다.
 */
const RECOMMENDED_POOL = 40;

export default async function CartPage() {
  // 장바구니 하단에 띄울 추천 상품. 피드가 죽어도 장바구니 자체는 떠야 하므로
  // 실패는 빈 목록으로 흡수하고 캐러셀만 빠진다 (shop/page.tsx 와 달리 안내 배너 없음).
  let products: Product[] = [];
  // 보는 사람은 피드와 따로 읽는다 — 피드가 죽어도 조합 규칙(발주기관/공급기업)은 맞아야 한다.
  const member = await getShopMember();

  try {
    const page = await fetchStorefrontPage({ limit: RECOMMENDED_POOL });
    products = maskProducts(page.items, member?.tier ?? null);
  } catch (error) {
    if (!(error instanceof SemoFeedError)) throw error;
    console.error("[cart]", error.message);
  }

  // 조합 규칙은 보기 등급(tier)이 아니라 고객 유형이다 — 실명이 보이는 직원도 업체는 고르지 않는다.
  return (
    <CartView products={products} isStub={isStubCatalog()} customerType={member?.customerType ?? "COMPANY"} />
  );
}
