"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useShop } from "@/app/providers/ShopProvider";
import { getSnapshot as readBookmarkIds } from "@/lib/bookmarks";
import type { StorefrontCategoryGroup } from "@/lib/semo-feed";
import { getWishSnapshot } from "@/lib/wishes";
import type { Product } from "./product.data";
import ShopNav from "./ShopNav";
import ShopCategoryFilter from "./ShopCategoryFilter";
import ProductGrid, { type SortOrder } from "./ProductGrid";

/**
 * 분류 축은 **세모가 준 것을 그대로 쓴다.**
 *
 * KCL 몰은 여기서 세모 계층을 자기 언어 네 칸으로 접었다(시약류·초자류·특별공급·사무용품).
 * 그 표는 실제로 들어온 18,000건을 보고 정한 것이라, 품목이 무엇일지 모르는 몰에 그대로
 * 옮기면 «표에 없는 분류» 가 조용히 사라진다. 그래서 이 몰은 접지 않는다 —
 * 뎁스1 은 세모의 최상단, 뎁스2 는 그 아래 소분류다.
 *
 * C-POINT 의 품목이 채워지고 «이 몰의 언어» 가 정해지면 그때 매핑 층을 여기에 끼운다.
 */
export type MajorCategory = string;

interface ShopProps {
  /** 세모 카테고리 인덱스. 대분류·소분류 칩이 전부 여기서 나온다 */
  categories?: StorefrontCategoryGroup[] | null;
  /** 서버가 미리 그려 준 첫 쪽 */
  initialItems?: Product[];
  initialTotal?: number;
  /** 피드를 못 불러왔다. «상품 0건» 과는 다른 안내를 띄운다. */
  loadFailed?: boolean;
}

/** 한 번에 받는 상품 수 */
const PAGE_SIZE = 120;
const ALL = "전체";
const OTHER = "기타";

export default function Shop({
  categories,
  initialItems = [],
  initialTotal = 0,
  loadFailed = false,
}: ShopProps) {
  /**
   * 랜딩 검색이 `?q=` 로 실어 보낸 질의를 **첫 상태로만** 읽는다(구독하지 않는다).
   * 이후 검색창의 주인은 이 화면이다 — 글자마다 URL 을 고쳐 쓰면 뒤로가기가 타자 수만큼 쌓인다.
   */
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q")?.trim() ?? "";

  const groups = useMemo(() => categories ?? [], [categories]);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [sortOrder, setSortOrder] = useState<SortOrder>("recommended");
  // 반응 스위치가 켜지면 찜은 세모에 있다(`wishes.ts`), 꺼져 있으면 예전처럼 브라우저 북마크다.
  const { reactionsEnabled } = useShop();
  const [bookmarksOnly, setBookmarksOnly] = useState(false);

  /** 뎁스1 — 세모 최상단 분류. `전체` 면 필터를 걸지 않는다 */
  const [activeRoot, setActiveRoot] = useState<MajorCategory>(ALL);
  /** 뎁스2 — 고른 대분류의 소분류. 대분류가 `전체` 일 때는 칩이 곧 대분류다 */
  const [activeLeaf, setActiveLeaf] = useState(ALL);

  const rootNames = useMemo(
    () => groups.map(group => group.rootCategoryName?.trim() || OTHER),
    [groups],
  );
  const majorCategories = useMemo(() => [ALL, ...rootNames], [rootNames]);

  const activeGroup = useMemo(
    () => groups.find(group => (group.rootCategoryName?.trim() || OTHER) === activeRoot),
    [groups, activeRoot],
  );

  /**
   * 칩 줄은 언제나 «지금 칸의 한 단계 아래» 다.
   *
   * 대분류가 `전체` 면 아래 단계가 곧 대분류들이라 칩이 그것을 보여 주고, 누르면 그 칸으로
   * 들어간다. 칩과 드롭다운이 서로 다른 축을 가리키면 손님이 지금 어디에 있는지 잃는다.
   */
  const leafCategories = useMemo(() => {
    if (activeRoot === ALL) return rootNames;
    return (activeGroup?.children ?? [])
      .map(child => child.categoryName?.trim() || "")
      .filter(Boolean);
  }, [activeRoot, rootNames, activeGroup]);

  const [items, setItems] = useState<Product[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  /**
   * 목록을 처음부터 다시 받는 중.
   *
   * 「더 보기」로 이어받는 중(`isLoading`)과 구분한다 — 그때는 이미 있는 목록을 지우면
   * 안 되지만, 분류를 바꾼 직후에는 **직전 분류의 상품이 남아 있는 것 자체가 틀린 화면**이다.
   */
  const [isReloading, setIsReloading] = useState(false);
  const [failed, setFailed] = useState(loadFailed);
  const requestId = useRef(0);

  /** 지금 조건으로 서버에서 한 쪽 받아온다. 늦게 온 응답이 최신 결과를 덮지 않게 번호를 단다. */
  const load = useCallback(
    async (offset: number, append: boolean) => {
      const mine = ++requestId.current;
      setIsLoading(true);
      if (!append) setIsReloading(true);

      try {
        const params = new URLSearchParams();

        if (bookmarksOnly) {
          // 북마크는 목록이 아니라 «이 id 들» 이라 조건이 통째로 다르다.
          const ids = reactionsEnabled ? getWishSnapshot() : readBookmarkIds();
          if (ids.length === 0) {
            if (mine === requestId.current) {
              setItems([]);
              setTotal(0);
            }
            return;
          }
          params.set("ids", ids.join(","));
        } else {
          if (searchQuery.trim()) params.set("q", searchQuery.trim());
          if (sortOrder !== "recommended") params.set("sort", sortOrder);

          // 소분류가 정해졌으면 그것이 가장 좁은 축이다. 아니면 대분류로 거른다.
          const leaf =
            activeRoot !== ALL && activeLeaf !== ALL
              ? activeGroup?.children.find(
                  child => (child.categoryName?.trim() || "") === activeLeaf,
                )
              : undefined;

          if (leaf?.categoryId) params.set("categoryId", leaf.categoryId);
          else if (activeGroup?.rootCategoryId)
            params.set("rootCategoryId", activeGroup.rootCategoryId);

          params.set("limit", String(PAGE_SIZE));
          params.set("offset", String(offset));
        }

        const res = await fetch(`/api/shop/items?${params.toString()}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items: Product[]; total: number };
        if (mine !== requestId.current) return; // 더 새 요청이 이미 떴다

        setFailed(false);
        setItems(prev => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
      } catch {
        if (mine === requestId.current) setFailed(true);
      } finally {
        if (mine === requestId.current) {
          setIsLoading(false);
          setIsReloading(false);
        }
      }
    },
    [bookmarksOnly, searchQuery, sortOrder, activeRoot, activeLeaf, activeGroup, reactionsEnabled],
  );

  /**
   * 조건이 바뀌면 첫 쪽부터 다시 받는다. 검색은 글자마다 부르지 않고 잠깐 기다린다 —
   * 「복사용지」를 치는 동안 다섯 번 부를 이유가 없다.
   */
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // 서버가 이미 첫 쪽을 그려 줬다. 같은 조건이면 다시 부르지 않는다.
      if (!initialQuery && activeRoot === ALL && !bookmarksOnly) return;
    }
    const timer = setTimeout(() => void load(0, false), searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sortOrder, activeRoot, activeLeaf, bookmarksOnly]);

  const changeMajorCategory = (category: MajorCategory) => {
    setActiveRoot(category);
    setActiveLeaf(ALL);
  };

  /** 칩. 대분류가 `전체` 면 칩이 대분류라 그 칸으로 들어가고, 아니면 소분류를 좁힌다. */
  const changeCategory = (category: string) => {
    if (activeRoot === ALL) {
      if (category === ALL) return;
      changeMajorCategory(category);
      return;
    }
    setActiveLeaf(category);
  };

  return (
    <section className="min-h-screen w-full bg-white">
      <ShopNav />

      <div className="container-shop">
        <div className="pb-24">
          <ShopCategoryFilter
            categories={leafCategories}
            activeCategory={activeRoot === ALL ? ALL : activeLeaf}
            onCategoryChange={changeCategory}
            majorCategories={majorCategories}
            activeMajorCategory={activeRoot}
            onMajorCategoryChange={changeMajorCategory}
          />

          <ProductGrid
            products={items}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeCategory={activeRoot === ALL ? ALL : activeLeaf}
            // 뎁스3 은 두지 않는다 — 세모 계층을 접지 않으므로 칩이 이미 말단이다.
            serverSubcategories={null}
            serverSubcategory={ALL}
            onServerSubcategoryChange={() => {}}
            loadFailed={failed}
            serverMode
            serverTotal={total}
            sortOrder={sortOrder}
            onSortChange={setSortOrder}
            bookmarksOnly={bookmarksOnly}
            onBookmarksOnlyChange={setBookmarksOnly}
            isLoading={isLoading}
            isReloading={isReloading}
            hasMore={!bookmarksOnly && items.length < total}
            onLoadMore={() => void load(items.length, true)}
          />
        </div>
      </div>
    </section>
  );
}
