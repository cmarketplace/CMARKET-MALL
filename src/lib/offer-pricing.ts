import type { CatalogOffer, MarketBenchmark, Product } from '@/components/Shop/product.data'
import { quoteLinkPrice } from '@/config/link-errand'

/**
 * 공급사별 단가 계산 — **순수 함수만** 둔다(React·저장소·부수효과 없음).
 *
 * 상세의 가격 밴드, 대표 오퍼 선정, 장바구니 조합(`cart-combination.ts`), 주문 줄 단가가
 * 전부 여기만 쓴다. 화면마다 «수량에 따른 단가» 를 따로 계산하면 상세와 장바구니의
 * 1위 업체가 달라지는 날이 온다.
 */

/**
 * 수량 `quantity` 에서 이 오퍼의 단가. 구간이 없으면 기본 단가다.
 * «링크로 바로 사기» 오퍼는 심부름값이 줄당 한 번이라 수량으로 다시 계산한다(세모 주문 확정과 같은 식).
 */
export function unitPriceAt(offer: CatalogOffer, quantity: number): number {
  if (offer.link) {
    const quote = quoteLinkPrice({
      linkPrice: offer.link.linkPrice,
      shipping: offer.link.shipping,
      quantity: Math.max(1, Math.floor(quantity)),
      includeVat: offer.link.includeVat,
    })
    if (quote) return quote.unitPrice
  }
  let price = offer.price
  for (const tier of offer.tiers) {
    if (quantity >= tier.minQuantity && tier.price < price) price = tier.price
  }
  return price
}

/**
 * 수량 기준으로 싼 순서. 동점은 세모가 준 `priceRank` 로 가른다 —
 * 세모 자동매칭(`storefront_catalog` 뷰: price asc, offering_id)과 같은 결정 규칙이라
 * 몰이 «이 업체» 라고 보여 준 것과 세모가 실제로 잡는 업체가 어긋나지 않는다.
 */
export function rankOffers(offers: readonly CatalogOffer[], quantity: number): CatalogOffer[] {
  return [...offers].sort((a, b) => {
    const diff = unitPriceAt(a, quantity) - unitPriceAt(b, quantity)
    return diff !== 0 ? diff : a.priceRank - b.priceRank
  })
}

export function bestOffer(offers: readonly CatalogOffer[], quantity: number): CatalogOffer | null {
  return rankOffers(offers, quantity)[0] ?? null
}

export function findOffer(
  offers: readonly CatalogOffer[],
  offerId: string | null | undefined,
): CatalogOffer | null {
  if (!offerId) return null
  return offers.find(offer => offer.offerId === offerId) ?? null
}

/**
 * 상품의 «쓸 수 있는 오퍼».
 *
 * 목록에서 온 상품은 오퍼가 비어 있다(피드 호출을 아끼려고). 그때는 표시가(최저가)
 * 하나를 익명 오퍼로 세워 장바구니·주문이 같은 코드 경로로 돈다.
 */
export function effectiveOffers(product: Product): CatalogOffer[] {
  if (product.offers && product.offers.length > 0) return product.offers
  return [
    {
      offerId: `base:${product.id}`,
      price: product.basePrice,
      priceRank: 1,
      supplierId: null,
      supplierName: null,
      leadDays: null,
      minQuantity: null,
      tiers: [],
      trend: [],
      trustScore: null,
      recentAwards: null,
      directPurchase: true,
      shippingFee: null,
      freeShippingOver: null,
    },
  ]
}

/** 장바구니 조합에서 «같은 업체» 를 묶는 키. 익명 오퍼는 서로 묶이지 않는다. */
export function supplierKey(offer: CatalogOffer): string {
  return offer.supplierId ?? `offer:${offer.offerId}`
}

/** 화면에 걸 공급사 이름. 실명이 없으면 세모 순위로 «공급처 N». */
export function supplierLabel(offer: CatalogOffer): string {
  return offer.supplierName ?? `공급처 ${offer.priceRank}`
}

/* ── 시장 기준값 대비 등급 ───────────────────────────────────────── */

export type PriceGrade = 'A' | 'B' | 'C'

/**
 * 몰 단가가 최근 낙찰가 중앙값 대비 어디쯤인가.
 *
 *   A: 중앙값보다 5% 넘게 싸다 / B: ±(−5%~+2%) / C: 2% 넘게 비싸다
 *
 * 문턱은 세모 가격밴드 등급과 맞춘 값이다. 기준값이 없으면 등급도 없다 — 지어내지 않는다.
 */
export function priceGrade(unitPrice: number, benchmark: MarketBenchmark | null | undefined): PriceGrade | null {
  if (!benchmark || benchmark.medianPrice <= 0) return null
  const ratio = unitPrice / benchmark.medianPrice
  if (ratio < 0.95) return 'A'
  if (ratio < 1.02) return 'B'
  return 'C'
}

export const GRADE_COPY: Record<PriceGrade, { short: string; long: string }> = {
  A: { short: '낙찰가보다 싸다', long: '최근 낙찰가 중앙값보다 5% 이상 저렴한 가격입니다' },
  B: { short: '낙찰가 수준', long: '최근 낙찰가 중앙값과 비슷한 수준입니다' },
  C: { short: '낙찰가보다 비싸다', long: '최근 낙찰가 중앙값보다 비쌉니다 — 공고로 올리는 편이 나을 수 있습니다' },
}

/** 밴드의 양 끝. 기준선까지 담고, 점이 끝에 붙지 않게 여유를 둔다. */
export function bandRange(
  offers: readonly CatalogOffer[],
  quantity: number,
  benchmark: MarketBenchmark | null | undefined,
): { min: number; max: number } {
  const prices = offers.map(offer => unitPriceAt(offer, quantity))
  if (benchmark) prices.push(benchmark.medianPrice)
  const lo = Math.min(...prices)
  const hi = Math.max(...prices)
  const pad = Math.max((hi - lo) * 0.12, Math.round(lo * 0.015), 1)
  return { min: lo - pad, max: hi + pad }
}

/** 0~100 위치. 밴드 밖 값은 끝에 붙인다. */
export function bandPosition(value: number, range: { min: number; max: number }): number {
  if (range.max <= range.min) return 50
  const ratio = (value - range.min) / (range.max - range.min)
  return Math.min(100, Math.max(0, ratio * 100))
}

/**
 * «N개부터 1위 업체가 바뀝니다» / «N개부터 단가가 더 내려갑니다».
 *
 * 구간 단가 때문에 수량이 늘면 1위가 뒤집힌다. 손님이 슬라이더를 움직이기 전에
 * 그 문턱을 미리 알려 준다. 문턱은 모든 오퍼의 `tiers.minQuantity` 중 지금 수량보다 큰 것.
 */
export function nextThresholdHint(offers: readonly CatalogOffer[], quantity: number): string | null {
  const current = bestOffer(offers, quantity)
  if (!current) return null

  const thresholds = [...new Set(offers.flatMap(offer => offer.tiers.map(tier => tier.minQuantity)))]
    .filter(min => min > quantity)
    .sort((a, b) => a - b)

  for (const threshold of thresholds) {
    const next = bestOffer(offers, threshold)
    if (!next) continue
    if (next.offerId !== current.offerId) return `${threshold}개부터 1위 업체가 바뀝니다`
    if (unitPriceAt(next, threshold) < unitPriceAt(current, quantity)) {
      return `${threshold}개부터 단가가 더 내려갑니다`
    }
  }
  return null
}

/** 6개월 추이의 방향. 화면 문구 «인하 추세 / 유지 / 인상 추세» 의 근거. */
export function trendDirection(trend: readonly number[]): 'down' | 'flat' | 'up' | null {
  if (trend.length < 2) return null
  const first = trend[0]
  const last = trend[trend.length - 1]
  if (first <= 0) return null
  const change = (last - first) / first
  if (change <= -0.02) return 'down'
  if (change >= 0.02) return 'up'
  return 'flat'
}
