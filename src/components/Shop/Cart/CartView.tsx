"use client";

import { useEffect } from "react";

import { syncPrices } from "@/lib/cart";

import ShopNav from "@/components/Shop/ShopNav";
import CartItem from "@/components/Shop/Cart/CartItem";
import CartSummary from "@/components/Shop/Cart/CartSummary";
import CombinationModes from "@/components/Shop/Cart/CombinationModes";
import EmptyCart from "@/components/Shop/Cart/EmptyCart";
import RecommendedCarousel from "@/components/Shop/RecommendedCarousel";
import type { Product } from "@/components/Shop/product.data";
import { useShop } from "@/app/providers/ShopProvider";
import { useCartCombination } from "@/components/Shop/Cart/useCartCombination";
import type { CustomerType } from "@/lib/order-types";

interface CartViewProps {
  /** 장바구니 하단 추천 상품. 피드를 못 불러오면 빈 배열이 오고 캐러셀은 렌더되지 않는다. */
  products: Product[];
  /** 예시 카탈로그로 도는 화면인가 — 조합 표 옆에 «예시» 를 붙인다. */
  isStub: boolean;
  /**
   * 발주기관 / 공급기업(공급사·직원). 서버가 세션 역할로 정한다. 공급기업은 업체 조합을 고르지 않는다 —
   * 공급사 실명이 보이는 직원(보기 FULL)이어도 조합 카드·직접 고르기 없이 최저가로 계산한다.
   */
  customerType: CustomerType;
}

export default function CartView({ products, isStub, customerType }: CartViewProps) {
  const { removeFromCart } = useShop();
  const isCompany = customerType === "COMPANY";
  const {
    cartItems,
    selected,
    inputs,
    result,
    byMode,
    canSingle,
    plan,
    setMode,
    toggleSelect,
    setAllSelected,
  } = useCartCombination({ lowestOnly: isCompany });

  /*
   * 담아 둔 값은 «담던 순간» 의 사본이다. 며칠 전에 담은 줄이 그대로 남아 있으면
   * 합계가 지금 값과 다르므로, 이 화면이 열릴 때 한 번 최신값으로 맞춘다.
   * **공급사별 값도 이때 붙는다** — 목록에서 담은 상품은 오퍼가 비어 있어 조합을 계산할 수 없다.
   */
  useEffect(() => {
    void syncPrices();
  }, []);

  const isEmpty = cartItems.length === 0;
  const allSelected = !isEmpty && selected.length === cartItems.length;
  // 고를 업체가 없으면(제한 고객·오퍼 하나뿐) 조합 카드는 의미가 없다. 공급기업은 고를 권한이 없다.
  const hasChoices = !isCompany && cartItems.some(item => (item.product.offers ?? []).length > 1);
  const anonymous = !cartItems.some(item => (item.product.offers ?? []).some(offer => offer.supplierId));
  const assignedById = new Map(result.lines.map(line => [line.product.id, line]));

  return (
    <main className="min-h-screen bg-white">
      <ShopNav showBack />

      <div className="container-shop flex min-h-[calc(100svh-4rem)] flex-col py-10 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-text text-xl font-semibold tracking-[-0.03rem]">
              장바구니{!isEmpty && ` · ${cartItems.length}품목`}
            </h1>
            {!isEmpty && (
              <p className="text-muted mt-2 text-sm">
                {hasChoices
                  ? "업체는 자동으로 조합됩니다. 마음에 안 들면 «직접 고르기» 로 품목마다 지정하세요."
                  : isCompany && !anonymous
                    ? "업체는 수량 기준 최저가로 자동 배정됩니다(씨마켓 구매대행). 주문은 씨마켓 안전결제로 진행됩니다."
                    : "씨마켓몰 판매가로 담겼습니다. 주문은 씨마켓 안전결제로 진행됩니다."}
              </p>
            )}
          </div>
          {isStub && !isEmpty && (
            <span className="bg-highlight-soft text-highlight-strong rounded-full px-3 py-1 text-xs font-semibold">
              예시 데이터
            </span>
          )}
        </div>

        {isEmpty ? (
          <div className="mt-8">
            <EmptyCart />
          </div>
        ) : (
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_360px]">
            <section className="space-y-3">
              {hasChoices && (
                <CombinationModes mode={plan.mode} byMode={byMode} canSingle={canSingle} onChange={setMode} />
              )}

              <div className="flex items-center justify-between gap-4 rounded-xl bg-highlight-soft px-5 py-3.5 sm:px-6">
                <label className="text-text flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setAllSelected(!allSelected)}
                    aria-label="전체 선택"
                    className="accent-primary h-[18px] w-[18px] cursor-pointer"
                  />
                  전체선택
                  <span className="text-muted font-normal">
                    ({selected.length}/{cartItems.length})
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => selected.forEach(item => removeFromCart(item.product.id))}
                  disabled={selected.length === 0}
                  className="text-muted hover:text-text flex min-h-11 cursor-pointer items-center text-sm transition-colors disabled:cursor-default disabled:opacity-40"
                >
                  선택삭제
                </button>
              </div>

              {cartItems.map(item => {
                const assigned = assignedById.get(item.product.id);
                const isSelected = Boolean(assigned);
                // 선택 해제된 줄은 조합에 없다 — 표시는 최저가 조합 기준으로 흐리게 그린다.
                const line =
                  assigned ??
                  byMode.best!.lines.find(candidate => candidate.product.id === item.product.id) ??
                  null;
                if (!line) return null;
                return (
                  <div key={item.product.id} className={isSelected ? undefined : "opacity-55"}>
                    <CartItem line={line} mode={plan.mode} selected={isSelected} onToggleSelect={toggleSelect} />
                  </div>
                );
              })}
            </section>

            <CartSummary
              result={result}
              mode={plan.mode}
              anonymous={anonymous}
              safeOnly={isCompany}
              inputs={inputs}
            />
          </div>
        )}

        <RecommendedCarousel
          products={products}
          excludeIds={cartItems.map(item => item.product.id)}
          className="mt-auto pt-14"
        />
      </div>
    </main>
  );
}
