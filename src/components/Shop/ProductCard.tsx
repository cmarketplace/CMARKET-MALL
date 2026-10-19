"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, Heart, ShoppingCart } from "lucide-react";

import type { Product } from "./product.data";
import GradeBadge from "./GradeBadge";
import Price from "./Price";
import SocialProofBadge from "./SocialProofBadge";
import { useShop } from "@/app/providers/ShopProvider";
import { bandPosition, priceGrade } from "@/lib/offer-pricing";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { cartItems, addToCart, removeFromCart, isBookmarked, toggleBookmark, reactionsEnabled } = useShop();

  const isInCart = cartItems.some(item => item.product.id === product.id);
  const bookmarked = isBookmarked(product.id);

  // 목록 카드의 작은 밴드 — 최저가(점)와 낙찰가 중앙값(선). 기준값이 없으면 안 그린다.
  const benchmark = product.benchmark ?? null;
  const grade = priceGrade(product.basePrice, benchmark);
  const bandRangeOf = benchmark
    ? {
        min: Math.min(product.basePrice, benchmark.medianPrice),
        max: Math.max(product.maxPrice ?? product.basePrice, benchmark.medianPrice),
      }
    : null;
  const miniRange = bandRangeOf
    ? {
        min: bandRangeOf.min - Math.max((bandRangeOf.max - bandRangeOf.min) * 0.15, bandRangeOf.min * 0.02),
        max: bandRangeOf.max + Math.max((bandRangeOf.max - bandRangeOf.min) * 0.15, bandRangeOf.max * 0.02),
      }
    : null;

  // 카드 전체가 상세로 가는 Link 라, 버튼을 누를 때 이동까지 함께 일어나면 안 된다.
  const handleBookmarkClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    toggleBookmark(product.id);
  };

  const handleCartClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isInCart) {
      removeFromCart(product.id);
      return;
    }

    addToCart(product);
  };

  return (
    <article className="min-w-0">
      {/* Product Image */}
      <Link
        href={`/shop/${product.id}`}
        className="bg-light-soft group relative block aspect-square cursor-pointer overflow-hidden rounded-media"
      >
        <Image
          src={product.img}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />

        {/* 상단 딤드. 흰 아이콘이 밝은 상품 사진 위에서도 보이게 한다.
          * pointer-events-none 이 없으면 이 층이 카드 상단 클릭을 먹어 상세로 못 간다. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 via-black/10 to-transparent"
        />

        {/* Bookmark */}
        <button
          type="button"
          onClick={handleBookmarkClick}
          aria-label={
            reactionsEnabled
              ? `${product.name} 찜 ${bookmarked ? "해제" : "하기"}`
              : `${product.name} 북마크 ${bookmarked ? "해제" : "저장"}`
          }
          aria-pressed={bookmarked}
          /* 보이는 크기는 32px 그대로 두고 `before` 로 터치 영역만 44px 로 넓힌다.
           * 목록 한 화면에 이 버튼이 20개 넘게 깔리는데 32px 은 손가락으로 누르기에
           * 작아 옆 카드로 잘못 들어갔다. 원을 키우면 사진 위 인상이 바뀌므로
           * 시각 크기는 건드리지 않는다. */
          className="absolute top-2.5 right-2.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 before:absolute before:-inset-1.5 before:content-[''] hover:bg-white/15"
        >
          {/* 반응 스위치가 켜지면 찜(하트·세모 저장), 꺼져 있으면 예전 북마크(브라우저 저장) 그대로 */}
          {reactionsEnabled ? (
            <Heart
              size={18}
              strokeWidth={1.8}
              fill={bookmarked ? "currentColor" : "none"}
              className={bookmarked ? "text-rose-500" : undefined}
            />
          ) : (
            <Bookmark size={18} strokeWidth={1.8} fill={bookmarked ? "currentColor" : "none"} />
          )}
        </button>

        {/* Add Cart */}
        <button
          type="button"
          onClick={handleCartClick}
          aria-label={`${product.name} 장바구니 ${isInCart ? "삭제" : "담기"}`}
          /* 북마크와 같은 상단 액션 위계로 맞추고, 그림자 없이 상태 색만으로 구분한다. */
          className={`absolute top-2.5 right-12 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 before:absolute before:-inset-1.5 before:content-[''] ${
            isInCart
              ? // 담김은 연두 계열로 뺀다. 예전에는 담김과 «담기 전 hover» 가 둘 다
                // bg-primary + text-white 라 완전히 같아 보였다 — 옆 카드에 마우스만
                // 올려도 이미 담긴 것처럼 읽혔다.
                "bg-highlight-soft text-highlight-strong"
              : "text-white hover:bg-white/15"
          }`}
        >
          <ShoppingCart size={16} strokeWidth={1.2} fill="currentColor" />
        </button>
      </Link>

      {/* Product Info */}
      <Link href={`/shop/${product.id}`} className="block pt-3.5">
        <span className="text-xs font-medium text-muted">{product.tag}</span>

        <h3 className="text-text mt-1.5 line-clamp-2 text-sm leading-[1.55] font-semibold sm:text-[15px]">{product.name}</h3>

        {/* 세모 품목엔 CAS·품번이 없는 것도 많다. 비면 «·» 만 덩그러니 남으므로 줄째 뺀다. */}
        {product.code && (
          <p className="text-muted mt-1.5 truncate text-xs">
            {product.codeLabel ? `${product.codeLabel} · ` : ""}
            {product.code}
          </p>
        )}

        {benchmark && miniRange && (
          <div aria-hidden="true" className="bg-bg-secondary relative mt-3 h-1.5 rounded-full">
            <span
              className="bg-primary absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{ left: `${bandPosition(product.basePrice, miniRange)}%` }}
            />
            <span
              className="bg-text absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${bandPosition(benchmark.medianPrice, miniRange)}%` }}
            />
          </div>
        )}

        <Price price={product.basePrice} className="mt-2.5" />

        {/*
          여러 곳이 대는 상품이면 지금 값이 «그중 최저가» 라는 사실을 목록에서 알린다.
          한 곳뿐이면 아무 표시도 하지 않는다 — 모든 카드에 붙는 배지는 정보가 아니다.
        */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {product.offerCount > 1 && (
            <p className="text-[11px] font-medium text-muted">공급사 {product.offerCount}곳 중 최저가</p>
          )}
          <GradeBadge grade={grade} />
        </div>

        {/* «대학 5곳이 최근 30일 재구매» — 반응 스위치가 켜졌고 실제 기관 2곳 이상일 때만 서버가 붙인다 */}
        {product.socialProof && <SocialProofBadge proof={product.socialProof} className="mt-1.5" />}
      </Link>
    </article>
  );
}
