"use client";

import Image from "next/image";
import { X } from "lucide-react";

import { useShop } from "@/app/providers/ShopProvider";
import type { AssignedLine, CombinationMode } from "@/lib/cart-combination";
import { effectiveOffers, rankOffers, supplierLabel, unitPriceAt } from "@/lib/offer-pricing";
import QuantityStepper from "../QuantityStepper";

interface CartItemProps {
  line: AssignedLine;
  mode: CombinationMode;
  selected: boolean;
  onToggleSelect: (productId: string) => void;
}

const won = (n: number) => n.toLocaleString("ko-KR");

/**
 * 장바구니 한 줄 — 상품 · 수량 · **업체** · 금액.
 *
 * 업체 칸은 조합 방식이 정한다. «직접 고르기» 에서만 셀렉트가 되고, 나머지 모드에서는
 * 조합이 잡은 업체가 칩으로 보인다. 최저가가 아닌 업체로 잡혔으면 «최저 대비 +N원» 을
 * 같이 보여 준다 — 업체 최소화가 무엇을 대가로 치르는지 줄 단위로 보인다.
 */
export default function CartItem({ line, mode, selected, onToggleSelect }: CartItemProps) {
  const { updateQuantity, removeFromCart, chooseOffer } = useShop();
  const { product, quantity, offer, unitPrice, lineTotal, cheapestUnitPrice } = line;

  const extra = (unitPrice - cheapestUnitPrice) * quantity;
  const offers = rankOffers(effectiveOffers(product), quantity);
  const metaLine = [
    product.tag,
    product.codeLabel && product.code ? `${product.codeLabel} ${product.code}` : product.code,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-2xl bg-light-soft px-5 py-4 sm:grid-cols-[auto_auto_minmax(0,1.2fr)_minmax(0,1fr)_auto_auto_auto] sm:px-6">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggleSelect(product.id)}
        aria-label={`${product.name} 선택`}
        className="accent-primary relative h-[18px] w-[18px] shrink-0 cursor-pointer before:absolute before:-inset-[13px] before:content-['']"
      />

      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
        <Image src={product.img} alt={product.name} fill sizes="56px" className="object-cover" />
      </div>

      <div className="min-w-0">
        <h3 className="text-text truncate text-sm font-semibold sm:text-[15px]">{product.name}</h3>
        {metaLine && <p className="text-muted mt-0.5 truncate text-xs">{metaLine}</p>}
      </div>

      {/* 업체 — 모드에 따라 셀렉트 또는 칩 */}
      <div className="col-span-3 min-w-0 sm:col-span-1">
        {mode === "manual" && offers.length > 1 ? (
          <select
            value={offer.offerId}
            onChange={event => chooseOffer(product.id, event.target.value)}
            aria-label={`${product.name} 공급사`}
            className="text-text w-full rounded-lg border border-border bg-white px-2.5 py-2 text-xs"
          >
            {offers.map(candidate => (
              <option key={candidate.offerId} value={candidate.offerId}>
                {supplierLabel(candidate)} · {won(unitPriceAt(candidate, quantity))}원
              </option>
            ))}
          </select>
        ) : offers.length <= 1 && !offer.supplierName ? (
          <span className="text-muted text-xs">세모네모 판매가</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="bg-white text-text inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
              <span aria-hidden="true" className="bg-primary h-1.5 w-1.5 rounded-full" />
              {supplierLabel(offer)}
            </span>
            {extra > 0 && <span className="text-muted text-[11px]">최저 대비 +{won(extra)}원</span>}
          </div>
        )}
      </div>

      <div className="col-span-2 col-start-2 flex items-center justify-between gap-4 sm:col-span-1 sm:col-start-auto sm:justify-end">
        <QuantityStepper
          size="sm"
          value={quantity}
          onChange={next => updateQuantity(product.id, next)}
          onDecrementAtMin={() => removeFromCart(product.id)}
          label={`${product.name} 수량`}
        />
      </div>

      <div className="text-right sm:w-28">
        <strong className="text-text block text-sm font-semibold sm:text-base">{won(lineTotal)}원</strong>
        <span className="text-muted text-[11px]">{won(unitPrice)}원 × {quantity}</span>
      </div>

      <button
        type="button"
        onClick={() => removeFromCart(product.id)}
        className="text-muted hover:text-text relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center justify-self-end rounded-full transition-colors before:absolute before:-inset-1.5 before:content-['']"
        aria-label={`${product.name} 삭제`}
      >
        <X size={16} strokeWidth={2} />
      </button>
    </article>
  );
}
