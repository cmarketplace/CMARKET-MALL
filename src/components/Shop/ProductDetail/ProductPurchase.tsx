"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Repeat, ShoppingCart } from "lucide-react";

import { TENANT } from "@/config/tenant";
import { useShop } from "@/app/providers/ShopProvider";
import GradeBadge from "@/components/Shop/GradeBadge";
import PriceBand from "@/components/Shop/PriceBand";
import {
  bestOffer,
  findOffer,
  nextThresholdHint,
  priceGrade,
  supplierLabel,
  trendDirection,
  unitPriceAt,
} from "@/lib/offer-pricing";
import type { Product } from "../product.data";
import QuantityStepper from "../QuantityStepper";
import DetailStatusIcon from "./DetailStatusIcon";
import OfferTable from "./OfferTable";
import PriceWatchButton from "./PriceWatchButton";

interface ProductPurchaseProps {
  product: Product;
  /** 예시 카탈로그(세모 키 없음)로 그려진 화면인가 — 숫자 옆에 «예시» 를 붙인다. */
  isStub: boolean;
  /** 제한 고객(공급사) — 서버가 오퍼를 «몰 판매가» 하나로 접어 보냈다. 문구만 그에 맞춘다. */
  restricted: boolean;
  /**
   * 업체를 골라 담을 수 있는가 — 발주기관만(고객 유형, 보기 등급과 별개). 공급기업(직원 포함)은 실명·표가
   * 보여도 고르지 못한다: 세모가 최저가 공급사로 확정하므로, 고른 업체로 담기면 장바구니가 거짓말을 한다.
   */
  canChooseSupplier: boolean;
}

const won = (n: number) => n.toLocaleString("ko-KR");
const SLIDER_MAX = 100;

/**
 * 상세의 구매 칸 — 가격 밴드 · 수량 · 대표 오퍼 · 공급사별 표 · 담기.
 *
 * 축은 «수량» 하나다. 수량이 바뀌면 밴드의 점이 움직이고, 1위 업체가 바뀌고, 합계가
 * 바뀐다. 손님이 표에서 다른 업체를 누르면 «직접 고른 공급사» 로 담긴다 — 그 선택은
 * 장바구니 줄(`offerId`)에 실려 결제까지 간다.
 *
 * 오퍼가 하나뿐이거나(한 곳) 아직 안 내려오면 밴드·표 없이 예전처럼 단가 한 줄이다.
 */
export default function ProductPurchase({
  product,
  isStub,
  restricted,
  canChooseSupplier,
}: ProductPurchaseProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const { cartItems, addToCart, updateQuantity, chooseOffer } = useShop();

  const offers = product.offers ?? [];
  const benchmark = product.benchmark ?? null;
  const auto = bestOffer(offers, quantity);
  const picked = canChooseSupplier ? findOffer(offers, selectedOfferId) : null;
  const chosen = picked ?? auto;
  const unitPrice = chosen ? unitPriceAt(chosen, quantity) : product.basePrice;
  const totalPrice = unitPrice * quantity;
  const grade = priceGrade(auto ? unitPriceAt(auto, quantity) : product.basePrice, benchmark);
  const hint = nextThresholdHint(offers, quantity);

  const isInCart = cartItems.some(item => item.product.id === product.id);
  const brandLabel = [...new Set([product.brand, product.manufacturer].filter(Boolean))].join(" · ");
  const showBand = !restricted && (offers.length >= 2 || Boolean(benchmark));

  const handleAddToCart = () => {
    const offerId = picked ? picked.offerId : null;
    if (isInCart) {
      updateQuantity(product.id, quantity);
      chooseOffer(product.id, offerId);
    } else {
      addToCart(product, quantity, offerId);
    }
  };

  const toggleOffer = canChooseSupplier
    ? (offerId: string) => setSelectedOfferId(current => (current === offerId ? null : offerId))
    : undefined;

  return (
    <div className="mt-6">
      {brandLabel && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">브랜드</span>
          <strong className="font-semibold text-text">{brandLabel}</strong>
        </div>
      )}

      {/* ── 가격 밴드 ── */}
      {showBand && (
        <section className={`${brandLabel ? "mt-5" : ""} rounded-xl border border-border p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-text">이 제품 가격은 시장 어디쯤인가</h2>
            <GradeBadge grade={grade} />
          </div>

          <div className="mt-6">
            <PriceBand
              offers={offers}
              quantity={quantity}
              benchmark={benchmark}
              bestOfferId={auto?.offerId ?? null}
              selectedOfferId={picked?.offerId ?? null}
              onSelect={toggleOffer}
            />
          </div>

          <div className="text-muted mt-7 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="bg-primary inline-block h-2.5 w-2.5 rounded-full" />
              공급사 등록 단가 {offers.length}곳
              {offers.length >= 2 && (
                <> · 최저 {won(Math.min(...offers.map(o => unitPriceAt(o, quantity))))}원 ~ 최고{" "}
                {won(Math.max(...offers.map(o => unitPriceAt(o, quantity))))}원</>
              )}
            </span>
            {benchmark && (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="bg-text inline-block h-3 w-0.5" />
                최근 {benchmark.windowDays}일 낙찰 {benchmark.sampleCount}건 중앙값 · 씨마켓 공고 실거래
                {benchmark.asOf && ` · ${benchmark.asOf.replace(/-/g, ".")} 기준`}
              </span>
            )}
            {isStub && <span className="text-highlight-strong font-semibold">예시 데이터</span>}
          </div>
        </section>
      )}

      {/* ── 수량 ── */}
      <div className="mt-4 rounded-xl bg-light-soft px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-sm font-semibold text-text">주문 수량</span>
            <p className="mt-0.5 text-xs text-muted">{hint ?? "최소 주문 수량 1개"}</p>
          </div>
          <QuantityStepper value={quantity} onChange={setQuantity} label={`${product.name} 주문 수량`} />
        </div>
        {offers.some(offer => offer.tiers.length > 0) && (
          <input
            type="range"
            min={1}
            max={SLIDER_MAX}
            value={Math.min(quantity, SLIDER_MAX)}
            onChange={event => setQuantity(Number(event.target.value))}
            aria-label="주문 수량 슬라이더"
            className="accent-primary mt-3 w-full"
          />
        )}
      </div>

      {/* ── 대표 오퍼 ── */}
      <div className="mt-4 rounded-xl bg-blue-tint-2 px-5 py-5">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-primary text-xs font-semibold">
              {restricted || !chosen
                ? TENANT.priceLabel
                : picked
                  ? "직접 고른 공급사"
                  : canChooseSupplier
                    ? "자동 선정 공급사"
                    : "최저가 공급사 · 씨마켓 구매대행"}
            </p>
            {restricted && (
              <p className="text-muted mt-1 text-xs leading-5">
                씨마켓몰이 확정한 판매가입니다. 주문은 씨마켓 안전결제로 진행되고 계약·계산서 상대는 씨마켓입니다.
              </p>
            )}
            {chosen && !restricted && (
              <>
                <p className="text-text mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold">
                  {supplierLabel(chosen)}
                  {chosen.trustScore !== null && (
                    <span className="bg-highlight-soft text-highlight-strong rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      신뢰 {chosen.trustScore}
                    </span>
                  )}
                  {canChooseSupplier && (
                    <span className="bg-white text-muted rounded-full px-2 py-0.5 text-[11px] font-semibold">
                      {chosen.directPurchase ? "직접 구매 가능" : "안전결제 전용"}
                    </span>
                  )}
                </p>
                <ul className="text-muted mt-2 space-y-0.5 text-xs leading-5">
                  {auto && (
                    <li>
                      {quantity}개 기준{" "}
                      {chosen.offerId === auto.offerId
                        ? "최저 단가"
                        : `최저 대비 +${won(unitPrice - unitPriceAt(auto, quantity))}원`}
                      {benchmark && unitPrice < benchmark.medianPrice && (
                        <> · 낙찰가 중앙값보다 {won(benchmark.medianPrice - unitPrice)}원 저렴</>
                      )}
                    </li>
                  )}
                  {(chosen.leadDays !== null || chosen.recentAwards !== null) && (
                    <li>
                      {chosen.leadDays !== null && `리드타임 ${chosen.leadDays}일`}
                      {chosen.leadDays !== null && chosen.recentAwards !== null && " · "}
                      {chosen.recentAwards !== null && `최근 6개월 공고 낙찰 ${chosen.recentAwards}건`}
                    </li>
                  )}
                  {trendDirection(chosen.trend) && (
                    <li>
                      6개월간 단가{" "}
                      {trendDirection(chosen.trend) === "down"
                        ? "인하 추세"
                        : trendDirection(chosen.trend) === "up"
                          ? "인상 추세"
                          : "유지"}
                      {chosen.tiers.length > 0 && ` · 구간 단가 ${chosen.tiers.length}단계`}
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-end justify-end">
              <strong className="text-3xl font-semibold leading-none text-text sm:text-[38px]">
                {won(totalPrice)}
              </strong>
              <span className="ml-1.5 text-lg font-semibold leading-none text-text">원</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              단가 {won(unitPrice)}원 × {quantity}개 · 부가세 별도
            </p>
          </div>
        </div>
      </div>

      {/* ── 공급사별 표 ── */}
      {!restricted && offers.length >= 2 && (
        <section className="mt-4">
          <OfferTable
            offers={offers}
            quantity={quantity}
            bestOfferId={auto?.offerId ?? null}
            selectedOfferId={picked?.offerId ?? null}
            onSelect={toggleOffer}
          />
          <p className="text-muted mt-2 text-[11px] leading-relaxed">
            추이는 공급사가 몰에 등록한 단가의 월별 변동입니다.{" "}
            {canChooseSupplier
              ? "업체를 고르지 않으면 수량 기준 최저가로 담기고, 세모 자동매칭과 같은 업체가 잡힙니다."
              : "이 계정의 주문은 업체를 고르지 않습니다 — 수량 기준 최저가 공급사로 씨마켓이 대신 구매합니다."}
          </p>
        </section>
      )}

      {/* ── 신뢰 3줄 ── */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-3 rounded-xl bg-accent/30 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <DetailStatusIcon variant="supplier" className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-text">씨마켓몰 승인 공급사</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[#F0F9F6] px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D7F2E9] text-[#12AD80]">
            <DetailStatusIcon variant="delivery" className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-text">안전결제 시 씨마켓이 교환·반품 책임</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[#F7F3FD] px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EADFFD] text-[#8E62E8]">
            <DetailStatusIcon variant="standard" className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-text">세모 물품관리시스템 표준 품목</span>
        </div>
      </div>

      {/* ── 실행 ── */}
      <button
        type="button"
        onClick={handleAddToCart}
        className={`mt-5 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
          isInCart ? "bg-highlight-soft text-highlight-strong" : "bg-primary text-white hover:bg-primary-dark"
        }`}
      >
        {isInCart ? <Check size={18} strokeWidth={1.5} /> : <ShoppingCart size={18} strokeWidth={1.2} fill="currentColor" />}
        {isInCart
          ? `장바구니에 담김 · 수량 ${quantity}개로 변경`
          : chosen && picked
            ? `${supplierLabel(chosen)} 로 장바구니 담기`
            : "장바구니 담기"}
      </button>

      <div className="mt-3 flex flex-wrap gap-2">
        <PriceWatchButton productId={product.id} currentPrice={auto ? unitPriceAt(auto, quantity) : product.basePrice} />
        <Link
          href="/shop#subscribe"
          className="text-text hover:bg-bg flex h-12 items-center gap-2 rounded-control border border-border bg-white px-4 text-sm font-semibold transition-colors"
        >
          <Repeat size={16} strokeWidth={1.8} />
          정기배송으로
        </Link>
      </div>

      {/* ── 입찰로 탈출하는 문 ── */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
        <p className="text-muted text-xs leading-5">
          이 가격보다 더 받고 싶다면 같은 품목을 씨마켓 공고로 올릴 수 있습니다.
        </p>
        <a
          href={TENANT.bidRegisterUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-flex items-center gap-1 text-xs font-semibold hover:underline"
        >
          공고 올리기 <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
