import { NextResponse } from "next/server";

import {
  fetchProductsByIds,
  fetchStorefrontPage,
  maskForViewer,
  SemoFeedError,
  type StorefrontSort,
} from "@/lib/catalog";
import { reactionsEnabled } from "@/config/reactions";
import { attachSocialProof, reorderRanking } from "@/lib/reactions-server";
import { getShopMember } from "@/lib/shop-member";

const SORTS: StorefrontSort[] = ["recommended", "price_asc", "price_desc", "name"];

/**
 * 목록 조회 창구.
 *
 * **피드를 브라우저가 직접 부를 수는 없다** — 파트너 API 키는 서버 전용이고, 그 키는 이
 * 쇼핑몰만 쓰는 것도 아니다. 그래서 필터·정렬·페이지를 이 라우트가 받아 서버에서 대신 부른다.
 *
 * 상품이 18,000건이 된 뒤로 «전부 받아서 클라이언트가 거르기» 가 성립하지 않는다.
 * 걸러진 결과만 넘어오게 하는 것이 이 라우트의 존재 이유다.
 *
 * `ids=` 모드는 **공급사별 값까지** 준다(장바구니·북마크). 비로그인이면 실명은 가린다 —
 * 가리는 자리는 서버다(`catalog.ts` 의 `maskForViewer`).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  try {
    // 등급은 요청마다 세션에서 — 목록에도 낙찰가 기준값·«N곳» 이 실리므로 목록도 접는다.
    const member = await getShopMember();
    const tier = member?.tier ?? null;

    const ids = params.get("ids");
    if (ids) {
      const items = await fetchProductsByIds(ids.split(",").filter(Boolean));
      // 반응 스위치가 꺼져 있으면 attachSocialProof 는 받은 그대로 돌려준다.
      const masked = await attachSocialProof(items.map(item => maskForViewer(item, tier)), member);
      return NextResponse.json({ items: masked, total: masked.length });
    }

    const sortParam = params.get("sort") as StorefrontSort | null;
    const query = {
      q: params.get("q") ?? undefined,
      categoryId: params.get("categoryId") ?? undefined,
      rootCategoryId: params.get("rootCategoryId") ?? undefined,
      sort: sortParam && SORTS.includes(sortParam) ? sortParam : undefined,
      limit: Math.min(Number(params.get("limit")) || 120, 500),
      offset: Math.max(Number(params.get("offset")) || 0, 0),
    };

    // «기관 재구매순» 은 반응 스위치가 켜졌을 때만 있는 정렬이다(꺼져 있으면 위에서 추천순으로 떨어진다).
    if (params.get("sort") === "reorder" && reactionsEnabled()) {
      const items = await reorderFirst(query);
      const masked = await attachSocialProof(items.items.map(item => maskForViewer(item, tier)), member);
      return NextResponse.json({ items: masked, total: items.total });
    }

    const page = await fetchStorefrontPage(query);
    const masked = await attachSocialProof(page.items.map(item => maskForViewer(item, tier)), member);
    return NextResponse.json({ ...page, items: masked });
  } catch (error) {
    // 피드 장애를 빈 목록으로 삼키면 화면에서 품절과 구분되지 않는다.
    const message =
      error instanceof SemoFeedError ? error.message : "상품을 불러오지 못했습니다";
    console.error("[shop/api]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

/**
 * «기관 재구매순» — 사회적 증거가 있는 상품(실제 발주기관 재구매·구매 2곳 이상)을 앞에, 나머지는 추천순.
 *
 * 분류·검색이 걸려 있으면 그 쪽 안에서만 앞으로 당긴다(다른 분류 상품을 끼워 넣지 않는다).
 * «전체» 첫 쪽이면 순위 상품을 맨 앞에 싣고, 다음 쪽들에서는 이미 실은 것을 뺀다 — 합계는 그대로다.
 */
async function reorderFirst(query: Parameters<typeof fetchStorefrontPage>[0] & { offset: number }) {
  const [ranked, page] = await Promise.all([
    reorderRanking(),
    fetchStorefrontPage({ ...query, sort: undefined }),
  ]);
  if (ranked.length === 0) return page;

  const rank = new Map(ranked.map((id, index) => [id, index]));
  const filtered = Boolean(query.q || query.categoryId || query.rootCategoryId);
  if (filtered) {
    const front = page.items
      .filter(item => rank.has(item.id))
      .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    return { items: [...front, ...page.items.filter(item => !rank.has(item.id))], total: page.total };
  }

  const rest = page.items.filter(item => !rank.has(item.id));
  if (query.offset > 0) return { items: rest, total: page.total };
  const rankedProducts = await fetchProductsByIds(ranked);
  return { items: [...rankedProducts, ...rest], total: page.total };
}
