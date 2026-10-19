"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, ChevronDown, Heart, Search } from "lucide-react";

import { useShop } from "@/app/providers/ShopProvider";
import type { Product } from "./product.data";
import ProductCard from "./ProductCard";
import ProductCardSkeleton from "./ProductCardSkeleton";

interface ProductGridProps {
  products: Product[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeCategory: string;
  loadFailed?: boolean;
  /**
   * 서버가 이미 거르고 정렬해서 준 목록인가.
   *
   * 상품이 18,000건이 된 뒤로 «전부 받아서 여기서 거르기» 는 성립하지 않는다. 서버 모드에서는
   * 이 컴포넌트가 검색·카테고리·정렬을 **다시 걸지 않는다** — 한 쪽(120건)만 갖고 거르면
   * 「낮은 가격순」이 그 쪽 안에서만 맞는 값이 된다.
   */
  serverMode?: boolean;
  serverTotal?: number;
  /**
   * 서버가 아는 뎁스3 목록(지금 뎁스2 의 실제 소분류).
   *
   * 주면 이름 규칙으로 뽑던 «세분류» 대신 이것을 그리고, 고르면 **서버에 다시 묻는다**.
   * 예전에는 받아 둔 쪽 안에서만 걸렀는데, 뎁스2 하나가 4,712건이 된 뒤로는 «지금 화면에
   * 실린 것만» 걸러 놓고 전부인 척하게 된다. `null` 이면 예전(이름 규칙) 방식이다.
   */
  serverSubcategories?: string[] | null;
  serverSubcategory?: string;
  onServerSubcategoryChange?: (subcategory: string) => void;
  sortOrder?: SortOrder;
  onSortChange?: (value: SortOrder) => void;
  bookmarksOnly?: boolean;
  onBookmarksOnlyChange?: (value: boolean) => void;
  isLoading?: boolean;
  /**
   * 목록을 **갈아 끼우는 중**인가(대분류·소분류·정렬·검색이 바뀌어 처음부터 다시 받는 중).
   * 「더 보기」로 이어받는 중과 구분한다 — 그때는 이미 있는 목록을 지우면 안 된다.
   */
  isReloading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

/** `reorder`(기관 재구매순)는 반응 스위치가 켜졌을 때만 고를 수 있다 — 꺼져 있으면 목록에 안 나온다. */
export type SortOrder = "recommended" | "price_asc" | "price_desc" | "name" | "reorder";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "price_asc", label: "낮은 가격순" },
  { value: "price_desc", label: "높은 가격순" },
  { value: "name", label: "이름순" },
];

/** 반응 스위치가 켜졌을 때만 붙는 정렬 — 실제 발주기관 재구매·구매가 2곳 이상인 상품이 앞에 온다. */
const REORDER_OPTION: { value: SortOrder; label: string } = { value: "reorder", label: "기관 재구매순" };

const SUBCATEGORY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "집게 명찰", pattern: /집게명찰|집게 명찰/ },
  { label: "비닐 명찰", pattern: /비닐명찰|비닐 명찰/ },
  { label: "신분증 케이스", pattern: /신분증.*케이스|사원증.*케이스/ },
  { label: "봉투", pattern: /봉투/ },
  { label: "서식·장부", pattern: /서식|장부|원고지|노트/ },
  { label: "영수증·전표", pattern: /영수증|전표|어음/ },
  { label: "샤프", pattern: /샤프(?!심)/ },
  { label: "샤프심", pattern: /샤프심/ },
  { label: "펜·마커", pattern: /펜|마커|매직/ },
  { label: "제본링·소모품", pattern: /제본링|링|소모품/ },
  { label: "클립·핀", pattern: /클립|크립|핀|책철/ },
  { label: "자석", pattern: /자석/ },
  { label: "칼", pattern: /커터|칼/ },
  { label: "가위", pattern: /가위/ },
];

function subcategoryOf(product: Product) {
  return (
    SUBCATEGORY_PATTERNS.find(item => item.pattern.test(product.name))?.label ||
    product.brand ||
    product.manufacturer ||
    "기타"
  );
}

export default function ProductGrid({
  products,
  searchQuery,
  onSearchChange,
  activeCategory,
  loadFailed = false,
  serverMode = false,
  serverTotal = 0,
  serverSubcategories = null,
  serverSubcategory = "전체",
  onServerSubcategoryChange,
  sortOrder: sortOrderProp,
  onSortChange,
  bookmarksOnly: bookmarksOnlyProp,
  onBookmarksOnlyChange,
  isLoading = false,
  isReloading = false,
  hasMore = false,
  onLoadMore,
}: ProductGridProps) {
  const { bookmarkedIds, reactionsEnabled } = useShop();
  const sortOptions = reactionsEnabled ? [...SORT_OPTIONS, REORDER_OPTION] : SORT_OPTIONS;

  // 서버 모드에서는 정렬·북마크의 주인이 위(Shop)다 — 조건이 바뀌면 다시 받아야 하기 때문이다.
  const [localSortOrder, setLocalSortOrder] = useState<SortOrder>("recommended");
  const sortOrder = sortOrderProp ?? localSortOrder;
  const setSortOrder = onSortChange ?? setLocalSortOrder;
  const [localBookmarksOnly, setLocalBookmarksOnly] = useState(false);
  const bookmarksOnly = bookmarksOnlyProp ?? localBookmarksOnly;
  const setBookmarksOnly = onBookmarksOnlyChange ?? setLocalBookmarksOnly;
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [activeSubcategory, setActiveSubcategory] = useState("전체");
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeSortMenu = (event: PointerEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) setIsSortOpen(false);
    };
    const closeSortMenuWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSortOpen(false);
    };

    document.addEventListener("pointerdown", closeSortMenu);
    document.addEventListener("keydown", closeSortMenuWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeSortMenu);
      document.removeEventListener("keydown", closeSortMenuWithKeyboard);
    };
  }, []);

  const keyword = searchQuery.trim().toLowerCase();

  const subcategories = useMemo(() => {
    if (serverSubcategories) return serverSubcategories;
    if (activeCategory === "전체") return [];

    return [...new Set(
      products
        .filter(product => product.tag === activeCategory)
        .map(subcategoryOf),
    )].sort((a, b) => a.localeCompare(b, "ko"));
  }, [serverSubcategories, activeCategory, products]);

  const localSubcategory = subcategories.includes(activeSubcategory) ? activeSubcategory : "전체";
  const selectedSubcategory = serverSubcategories ? serverSubcategory : localSubcategory;
  const selectSubcategory = (subcategory: string) => {
    if (serverSubcategories) onServerSubcategoryChange?.(subcategory);
    else setActiveSubcategory(subcategory);
  };

  const filteredProducts = products.filter(product => {
    // 세분류(이름 규칙)는 서버가 모르는 개념이라 여기서 건다. 소분류 하나가 최대 498건이라
    // 그 안에서 거르는 것은 여전히 싸다. 뎁스3 을 서버가 아는 경우(`serverSubcategories`)는
    // 이미 걸러져 왔으므로 여기서 또 거르면 안 된다.
    if (
      !serverSubcategories &&
      selectedSubcategory !== "전체" &&
      subcategoryOf(product) !== selectedSubcategory
    )
      return false;
    if (serverMode) return true; // 나머지 조건은 서버가 이미 걸렀다

    if (activeCategory !== "전체" && product.tag !== activeCategory) return false;
    if (bookmarksOnly && !bookmarkedIds.includes(product.id)) return false;
    if (!keyword) return true;

    return [product.name, product.codeLabel, product.code, product.tag].some(value =>
      value.toLowerCase().includes(keyword),
    );
  });

  // 「추천순」은 피드가 내려준 순서 그대로다 — 세모 마스터가 승인한 순서에 의미가 있다.
  // sort 는 원본을 뒤집으므로 복사본에 건다.
  const sortedProducts =
    serverMode || sortOrder === "recommended" || sortOrder === "reorder"
      ? filteredProducts
      : [...filteredProducts].sort((a, b) => {
          if (sortOrder === "price_asc") return a.basePrice - b.basePrice;
          if (sortOrder === "price_desc") return b.basePrice - a.basePrice;

          return a.name.localeCompare(b.name, "ko");
        });

  /** 자리표시자 카드 한 벌. 한 화면을 채울 만큼만 그린다. */
  const skeletons = Array.from({ length: 12 }, (_, index) => (
    <ProductCardSkeleton key={`skeleton-${index}`} />
  ));

  if (loadFailed) {
    return (
      <p className="text-muted mt-20 text-center text-sm">
        상품을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return (
    <section>
      <header className="flex flex-col gap-4 border-b border-bg py-5 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="shrink-0 text-xl font-semibold text-text">
          {selectedSubcategory !== "전체"
            ? selectedSubcategory
            : activeCategory === "전체"
              ? "전체 상품"
              : activeCategory}{" "}
          {isReloading ? (
            // 아직 세지 못한 값이다. 직전 분류의 숫자를 남겨 두면 «필기구 4,712» 가 된다.
            <span className="inline-block h-4 w-12 animate-pulse rounded bg-bg align-middle" />
          ) : (
            <span className="text-highlight">
              {/* 뎁스3 을 서버가 걸러 준 경우에도 `serverTotal` 이 그 칸의 전체 건수다.
                * 실린 개수를 쓰면 「더 보기」 전에는 120 으로 보인다. */}
              {(serverMode && (serverSubcategories || selectedSubcategory === "전체")
                ? serverTotal
                : sortedProducts.length
              ).toLocaleString()}
            </span>
          )}
        </h2>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Search */}
          <label className="flex h-10 w-full min-w-0 items-center gap-2 rounded-lg bg-bg px-4 transition-colors focus-within:bg-bg-secondary sm:w-64">
            <input
              type="search"
              value={searchQuery}
              onChange={event => onSearchChange(event.target.value)}
              placeholder="품명 · CAS · 규격 검색"
              className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
            />
            <Search aria-hidden="true" size={18} strokeWidth={1.8} className="shrink-0 text-muted" />
          </label>

          {/* 네이티브 select의 펼친 목록은 브라우저가 그려 radius를 제어할 수 없다.
              트리거와 목록을 같은 컴포넌트로 그려 쇼핑몰의 fill/radius 규칙을 유지한다. */}
          <div ref={sortMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsSortOpen(open => !open)}
              aria-label="정렬 기준"
              aria-haspopup="listbox"
              aria-expanded={isSortOpen}
              className="flex h-10 min-w-28 cursor-pointer items-center justify-between gap-3 rounded-xl bg-bg px-4 text-sm font-semibold text-text transition-colors hover:bg-bg-secondary focus-visible:bg-bg-secondary"
            >
              {sortOptions.find(option => option.value === sortOrder)?.label}
              <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} className={`text-muted transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
            </button>

            {isSortOpen && (
              <div role="listbox" aria-label="정렬 기준" className="absolute top-full right-0 z-30 mt-2 min-w-40 overflow-hidden rounded-xl bg-white p-1.5 shadow-[0_12px_32px_rgba(24,45,82,0.16)]">
                {sortOptions.map(option => {
                  const isSelected = option.value === sortOrder;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSortOrder(option.value);
                        setIsSortOpen(false);
                      }}
                      className={`block w-full cursor-pointer rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${isSelected ? "bg-highlight-soft font-semibold text-highlight-strong" : "text-muted hover:bg-primary hover:text-white"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bookmarks only */}
          <button
            type="button"
            onClick={() => setBookmarksOnly(!bookmarksOnly)}
            aria-pressed={bookmarksOnly}
            className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
              bookmarksOnly
                ? "bg-highlight/30 text-highlight-strong"
                : "bg-highlight-soft text-highlight-strong hover:bg-highlight/30"
            }`}
          >
            {reactionsEnabled ? (
              <Heart size={16} strokeWidth={1.8} fill={bookmarksOnly ? "currentColor" : "none"} />
            ) : (
              <Bookmark size={16} strokeWidth={1.8} fill={bookmarksOnly ? "currentColor" : "none"} />
            )}
            찜한 상품만
          </button>
        </div>
      </header>

      {isReloading && subcategories.length === 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {skeletons}
        </div>
      ) : sortedProducts.length === 0 && !isReloading ? (
        <p className="mt-20 text-center text-sm text-muted">
          {/* 세 경우를 구분한다. «찜한 게 없다» 를 «상품이 없다» 로 보여 주면 고장으로 읽힌다. */}
          {bookmarksOnly && bookmarkedIds.length === 0
            ? "아직 찜한 상품이 없습니다"
            : products.length === 0
              ? "아직 등록된 상품이 없습니다"
              : "조건에 맞는 상품이 없습니다"}
        </p>
      ) : subcategories.length === 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {sortedProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid gap-8 lg:grid-cols-[11rem_minmax(0,1fr)] xl:gap-10">
          <aside aria-label={`${activeCategory} 하위 카테고리`}>
            <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
              {["전체", ...subcategories].map(subcategory => {
                const isSelected = selectedSubcategory === subcategory;
                return (
                  <button
                    key={subcategory}
                    type="button"
                    onClick={() => selectSubcategory(subcategory)}
                    className={`shrink-0 cursor-pointer rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-highlight-soft font-semibold text-highlight-strong"
                        : "bg-bg font-medium text-muted hover:bg-bg-secondary hover:text-text"
                    }`}
                  >
                    {subcategory === "전체" ? `${activeCategory} 전체` : subcategory}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* 사이드바(소분류)는 인덱스에서 와서 이미 정확하다 — 그대로 두고 상품 자리만 비운다. */}
          <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 xl:grid-cols-3 2xl:grid-cols-4">
            {isReloading
              ? skeletons
              : sortedProducts.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      )}

      {/*
        「더 보기」. 무한 스크롤로 하지 않은 이유는 이 몰이 «담고 결재하는» 화면이라
        목록 끝(장바구니로 가는 길)이 스크롤에 계속 밀리면 안 되기 때문이다.
      */}
      {hasMore ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            disabled={isLoading}
            onClick={onLoadMore}
            className="rounded-lg border border-gray-200 px-6 py-3 text-sm font-medium text-text transition-colors hover:bg-bg disabled:opacity-50"
          >
            {isLoading
              ? "불러오는 중…"
              : `더 보기 (${sortedProducts.length.toLocaleString()} / ${serverTotal.toLocaleString()})`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
