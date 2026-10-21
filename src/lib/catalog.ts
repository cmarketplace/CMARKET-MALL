import type { CatalogOffer, PriceTier, Product } from '@/components/Shop/product.data'
import { upcomingSeasons, type SeasonEvent } from '@/config/seasons'
import { stubCategories, stubPage, stubProduct } from '@/lib/catalog-stub'
import { bestOffer, unitPriceAt } from '@/lib/offer-pricing'
import { isSemoConfigured } from '@/lib/semo-api'
import * as semo from '@/lib/semo-feed'
import type { ViewerTier } from '@/lib/shop-auth'

export { SemoFeedError } from '@/lib/semo-feed'
export type {
  StorefrontCategoryGroup,
  StorefrontPage,
  StorefrontQuery,
  StorefrontSort,
} from '@/lib/semo-feed'

/**
 * 카탈로그 — 화면이 상품을 받는 **유일한 창구**. 서버 전용.
 *
 * `orders.ts` 와 같은 이음새다: 세모 키가 있으면 세모 피드(`semo-feed.ts`)가 정본이고,
 * 없으면 예시 카탈로그(`catalog-stub.ts`)가 자리를 지킨다. 화면은 어느 쪽인지 모른다 —
 * 다만 스텁일 때 «예시 데이터» 표식을 달 수 있게 `isStubCatalog()` 만 내준다.
 *
 * `SHOP_DEMO_CATALOG=1` 이면 키가 있어도 스텁을 쓴다 — 세모 `c-point` 스토어프론트에
 * 승인 품목이 0건인 동안 화면을 채워 보는 용도다. **운영 환경변수에는 넣지 않는다.**
 */
export function isStubCatalog(): boolean {
  return !isSemoConfigured() || process.env.SHOP_DEMO_CATALOG === '1'
}

export async function fetchStorefrontCategories() {
  if (isStubCatalog()) return stubCategories()
  return semo.fetchStorefrontCategories()
}

export async function fetchStorefrontPage(query: semo.StorefrontQuery = {}) {
  if (isStubCatalog()) return stubPage(query)
  return semo.fetchStorefrontPage(query)
}

/** 기관 맞춤 선반. 예시 카탈로그에는 기관 이력이 없어 빈 배열 */
export async function fetchBuyerShelves(memberId: string) {
  if (isStubCatalog()) return []
  return semo.fetchBuyerShelves(memberId)
}

/** 법적 구매 칩. 예시 카탈로그에는 제도가 없어 탭을 감춘다(null) */
export async function fetchMandatoryPrograms() {
  if (isStubCatalog()) return null
  return semo.fetchMandatoryPrograms()
}

/** 상품 한 건, 오퍼 없이. 목록·추천용. */
export async function fetchStorefrontProduct(itemId: string): Promise<Product | null> {
  if (isStubCatalog()) return stubProduct(itemId, false)
  return semo.fetchStorefrontProduct(itemId)
}

/**
 * 상품 한 건 + 공급사별 값.
 *
 * 상세와 장바구니가 쓴다. 세모 모드에서는 상품·오퍼 두 번을 부른다(예전 상세와 같다).
 */
export async function fetchProductWithOffers(itemId: string): Promise<Product | null> {
  if (isStubCatalog()) return stubProduct(itemId, true)

  const product = await semo.fetchStorefrontProduct(itemId)
  if (!product) return null
  const offers = await semo.fetchItemOffers(itemId)
  return { ...product, offers, offerCount: Math.max(product.offerCount, offers.length) }
}

/**
 * 품목 id 목록 → 오퍼까지 붙은 상품(장바구니·견적용).
 *
 * 세모에 id 목록 필터가 없어 단건을 나눠 부른다. 장바구니는 원래 몇 줄 수준이라
 * 이 편이 목록 전체를 받는 것보다 훨씬 싸다. 상한을 두어 폭주를 막는다.
 */
export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  const unique = [...new Set(ids)].filter(Boolean).slice(0, 60)
  const results = await Promise.all(unique.map(id => fetchProductWithOffers(id)))
  return results.filter((item): item is Product => Boolean(item))
}

export async function fetchRelatedProducts(categoryId: string | null | undefined, limit = 12) {
  if (isStubCatalog()) return stubPage({ categoryId: categoryId ?? undefined, limit }).items
  return semo.fetchRelatedProducts(categoryId, limit)
}

/* ── 뷰어 등급별 가림 ─────────────────────────────────────────────── */

/**
 * 손님 등급에 맞게 상품을 접는다. **서버에서만** 한다 — 클라이언트에서 감추면 응답에 실려
 * 소스보기로 보인다.
 *
 *   FULL        그대로.
 *   RESTRICTED  공급사 고객. 오퍼 여러 개를 «몰 판매가» 익명 오퍼 **하나**로 접는다 —
 *               단가는 수량마다 전 업체 최저(세모 자동매칭이 잡을 값과 같다), 업체 실명·
 *               신뢰·리드타임·추이는 비우고, 낙찰가 기준선·등급도 없앤다. 직접 구매 불가.
 *               «N곳» 도 1 로 — 경쟁이 몇이나 붙었는지도 정보다.
 *
 * 비로그인은 이 함수까지 오지 않는다(`proxy.ts` 가 막는다). 혹시 오면 RESTRICTED 로 본다.
 */
export function maskForViewer(product: Product, tier: ViewerTier | null | undefined): Product {
  if (tier === 'FULL') return { ...product, namesMasked: false }

  const offers = product.offers ?? []
  const collapsed = offers.length > 0 ? [collapseOffers(offers)] : undefined

  return {
    ...product,
    ...(collapsed ? { offers: collapsed } : {}),
    offerCount: 1,
    maxPrice: null,
    benchmark: null,
    namesMasked: true,
  }
}

export function maskProducts(products: Product[], tier: ViewerTier | null | undefined): Product[] {
  return products.map(product => maskForViewer(product, tier))
}

/** 오퍼 여러 개 → «수량별 전 업체 최저» 익명 오퍼 하나. */
function collapseOffers(offers: CatalogOffer[]): CatalogOffer {
  const best = bestOffer(offers, 1) ?? offers[0]
  const thresholds = [...new Set(offers.flatMap(offer => offer.tiers.map(tier => tier.minQuantity)))]
    .filter(min => min > 1)
    .sort((a, b) => a - b)

  const base = Math.min(...offers.map(offer => unitPriceAt(offer, 1)))
  const tiers: PriceTier[] = []
  let last = base
  for (const min of thresholds) {
    const price = Math.min(...offers.map(offer => unitPriceAt(offer, min)))
    if (price < last) {
      tiers.push({ minQuantity: min, price })
      last = price
    }
  }

  return {
    offerId: best.offerId,
    price: base,
    priceRank: 1,
    supplierId: null,
    supplierName: null,
    leadDays: null,
    minQuantity: null,
    tiers,
    trend: [],
    trustScore: null,
    recentAwards: null,
    directPurchase: false,
    // 진짜 업체를 숨기면 업체 단위 배송비도 계산할 수 없다 — 확정 시 세모가 잡는다.
    shippingFee: null,
    freeShippingOver: null,
  }
}

/* ── 메인 큐레이션 ────────────────────────────────────────────────── */

export interface SeasonSection {
  event: SeasonEvent
  products: Product[]
}

export interface Curation {
  /** 히어로 자리의 시즌(가장 가까운 «featured»). 상품이 0건이면 null. */
  featuredSeason: SeasonSection | null
  /** 그 밖의 다가오는 시즌 — 칩으로만 보여 준다. */
  otherSeasons: SeasonEvent[]
  /** MD 픽. `mdRank` 가 있는 상품만, 없으면 추천순 앞부분. */
  mdPicks: Product[]
  /** 낙찰가 대비 저렴한 순. 기준값이 있는 상품만. */
  byBenchmark: Product[]
  /** 공공기관 주문 많은 순. `popularity` 가 있는 상품만 — 없으면 빈 배열이고 탭이 빠진다. */
  popular: Product[]
}

const CURATION_POOL = 40
const SHELF = 8

/**
 * 메인이 필요한 묶음을 한 번에.
 *
 * 세모에 «MD 픽» 같은 큐레이션 API 는 없다. 그래서 추천순 한 쪽(40건)을 받아 그 안에서
 * 세 축으로 나눈다 — 값이 없는 축은 빈 배열로 돌려주고 화면이 그 탭을 그리지 않는다.
 * 시즌 상품은 시즌 키워드로 검색한다(첫 키워드가 0건이면 다음 키워드).
 */
export async function fetchCuration(): Promise<Curation> {
  const seasons = upcomingSeasons()
  const featured = seasons.find(season => season.featured) ?? seasons[0] ?? null

  const [pool, seasonProducts] = await Promise.all([
    fetchStorefrontPage({ limit: CURATION_POOL }).then(page => page.items),
    featured ? searchSeason(featured) : Promise.resolve<Product[]>([]),
  ])

  const ranked = pool.filter(product => typeof product.mdRank === 'number')
  const mdPicks = (ranked.length > 0
    ? ranked.sort((a, b) => (a.mdRank ?? 0) - (b.mdRank ?? 0))
    : pool
  ).slice(0, SHELF)

  const byBenchmark = pool
    .filter(product => product.benchmark && product.benchmark.medianPrice > 0)
    .sort(
      (a, b) =>
        a.basePrice / a.benchmark!.medianPrice - b.basePrice / b.benchmark!.medianPrice,
    )
    .slice(0, SHELF)

  const popular = pool
    .filter(product => typeof product.popularity === 'number')
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, SHELF)

  return {
    featuredSeason:
      featured && seasonProducts.length > 0 ? { event: featured, products: seasonProducts } : null,
    otherSeasons: seasons.filter(season => season.key !== featured?.key),
    mdPicks,
    byBenchmark,
    popular,
  }
}

async function searchSeason(event: SeasonEvent): Promise<Product[]> {
  const found: Product[] = []
  for (const keyword of event.keywords) {
    const page = await fetchStorefrontPage({ q: keyword, limit: 6 })
    for (const product of page.items) {
      if (!found.some(item => item.id === product.id)) found.push(product)
    }
    if (found.length >= 3) break
  }
  return found.slice(0, 3)
}
