import { TENANT } from "@/config/tenant";
import { productImage } from "@/lib/product-image";
import type {
  CatalogOffer,
  MarketBenchmark,
  Product,
} from "@/components/Shop/product.data";

/**
 * 세모 큐레이션 피드 — 이 쇼핑몰의 상품 출처.
 *
 * 세모 마스터가 「이 쇼핑몰 × 품목 × 공급사」로 승인한 조합만 내려온다. 오퍼의 공급사
 * 실명은 세모가 붙여 주는 시점부터 실리고(2026-09-07 결정), 비로그인 손님에게 가리는 것은
 * `catalog.ts` 가 한다.
 *
 * **서버에서만 부른다.** 피드는 파트너 API 키를 요구하는데 그 키는 이 쇼핑몰 전용이
 * 아니라 씨마켓 연동 전체가 쓰는 키다. 클라이언트 번들에 들어가면 소스보기로 그대로
 * 새 나가므로, 이 파일은 서버 컴포넌트에서만 import 한다(`NEXT_PUBLIC_` 접두사 금지).
 *
 * 필요한 환경변수:
 *   SEMO_API_BASE   예) https://api.semo.io.kr/api/v1  (로컬 http://localhost:5555/api/v1)
 *   SEMO_API_KEY    세모 external API 파트너 키
 *   STOREFRONT_SLUG 기본 'c-point'
 */

const DEFAULT_SLUG = "c-point";
const UPSTREAM_TIMEOUT_MS = 10_000;

/** 피드가 바뀌는 속도보다 훨씬 자주 그릴 필요가 없다. 5분마다 다시 받는다. */
const REVALIDATE_SECONDS = 300;

/** 세모 피드 한 줄. `StorefrontItemResponseDto` 와 같은 모양이다. */
interface StorefrontItem {
  itemId: string;
  name: string;
  price: number;
  categoryId?: string | null;
  categoryName?: string | null;
  /**
   * 대분류. 세모 백엔드가 붙여 주기 전에는 응답에 아예 없다.
   * 없을 때와 있을 때가 모두 정상 동작해야 하므로 선택 필드로 둔다.
   */
  rootCategoryName?: string | null;
  manufacturer?: string | null;
  brand?: string | null;
  unit?: string | null;
  spec1?: string | null;
  spec2?: string | null;
  spec3?: string | null;
  imageUrl?: string | null;
  /**
   * 이 상품을 대는 곳의 수(익명).
   *
   * 2 이상이면 `price` 는 그중 **최저가**이고, 상세에서 나머지 값도 볼 수 있다.
   * 세모가 붙여 주기 전에는 응답에 없으므로 없으면 «한 곳» 으로 본다.
   */
  offerCount?: number | null;
  /** 가장 비싼 오퍼. «최대 N원 절약» 문구에만 쓴다 */
  maxPrice?: number | null;
  /** 표시가의 부가세 축(EXCLUSIVE=공급가액) */
  taxType?: string | null;
  /** 시장 기준값(낙찰가 중앙값). 세모 가격밴드가 채워 주기 전에는 없다. */
  benchmark?: {
    medianPrice?: number | null;
    sampleCount?: number | null;
    windowDays?: number | null;
    asOf?: string | null;
  } | null;
  /** MD 큐레이션 순위·공공기관 주문 수. 세모가 붙여 주기 전에는 없다. */
  mdRank?: number | null;
  popularity?: number | null;
}

/**
 * 피드의 오퍼 한 줄(원본).
 *
 * 예전에는 `offerId·price·priceRank` 셋뿐이었다(익명). 2026-09-07 결정으로 공급사 실명·
 * 구간 단가·추이·신뢰도가 붙는다 — 세모가 채워 주기 전에는 전부 없으므로 선택 필드다.
 * 몰 안에서는 `CatalogOffer`(product.data.ts) 로 정규화해서만 쓴다.
 */
interface StorefrontOfferRow {
  offerId: string;
  price: number;
  priceRank: number;
  supplierId?: string | null;
  supplierName?: string | null;
  leadDays?: number | null;
  minQuantity?: number | null;
  tiers?: Array<{ minQuantity: number; price: number }> | null;
  trend?: number[] | null;
  trustScore?: number | null;
  recentAwards?: number | null;
  directPurchase?: boolean | null;
  shippingFee?: number | null;
  freeShippingOver?: number | null;
}

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function toCatalogOffer(row: StorefrontOfferRow): CatalogOffer {
  return {
    offerId: row.offerId,
    price: Number(row.price) || 0,
    priceRank: Number(row.priceRank) || 1,
    supplierId: row.supplierId?.trim() || null,
    supplierName: row.supplierName?.trim() || null,
    leadDays: num(row.leadDays),
    minQuantity: num(row.minQuantity),
    tiers: (row.tiers ?? [])
      .filter(tier => num(tier.minQuantity) !== null && num(tier.price) !== null)
      .sort((a, b) => a.minQuantity - b.minQuantity),
    trend: (row.trend ?? []).filter((value): value is number => num(value) !== null),
    trustScore: num(row.trustScore),
    recentAwards: num(row.recentAwards),
    // 값이 안 내려오면 «직접 구매 가능» 으로 본다 — 세모 직거래 모델이 기본이기 때문이다.
    directPurchase: row.directPurchase !== false,
    shippingFee: num(row.shippingFee),
    freeShippingOver: num(row.freeShippingOver),
  };
}

function toBenchmark(raw: StorefrontItem["benchmark"]): MarketBenchmark | null {
  const median = num(raw?.medianPrice);
  if (!raw || median === null || median <= 0) return null;
  return {
    medianPrice: median,
    sampleCount: num(raw.sampleCount) ?? 0,
    windowDays: num(raw.windowDays) ?? 90,
    asOf: raw.asOf?.trim() || "",
  };
}

/**
 * 피드를 못 불러온 것과 «상품이 0건인 쇼핑몰» 은 다른 사건이다.
 *
 * 설정 누락이나 장애를 빈 배열로 삼키면 화면에서 품절과 구분되지 않고, 그 상태로
 * 며칠이 지나간다. 그래서 실패는 던지고 화면이 «불러오지 못했습니다» 로 그린다.
 */
export class SemoFeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SemoFeedError";
  }
}

const CAS_RE = /^\d{2,7}-\d{2}-\d$/;

/**
 * 피드 한 줄 → 화면이 기대하는 모양.
 *
 * 선택 입력값은 빈 문자열로 정규화한다. 상세 화면은 값이 있는 행만 렌더링하므로
 * `undefined` 나 임의 기본 문구를 넣지 않는다.
 */
function toProduct(row: StorefrontItem): Product {
  const spec = [row.spec1, row.spec2, row.spec3].filter(Boolean).join(" · ");

  const isCas = Boolean(row.spec2 && CAS_RE.test(String(row.spec2).trim()));
  const code = isCas ? String(row.spec2).trim() : "";

  return {
    id: row.itemId,
    name: row.name || "(이름 없음)",
    codeLabel: isCas ? "CAS" : "",
    code,
    basePrice: Number(row.price) || 0,
    // 피드가 준 실제 상품 사진을 쓰고, 없거나 못 믿을 값이면 분류 대표 이미지 →
    // 대분류 그림 → «사진 준비 중» 순으로 떨어진다(`product-image.ts`).
    img: productImage(row),
    tag: row.categoryName || "기타",
    // 아직 안 내려오면 빈 문자열. 「기타」 같은 기본값을 넣으면 «대분류를 받았다» 와
    // «못 받았다» 를 구분할 수 없어 화면이 잘못된 축으로 묶인다.
    categoryGroup: row.rootCategoryName?.trim() || "",
    desc:
      [row.manufacturer, spec].filter(Boolean).join(" · ") ||
      "세모 물품관리시스템에 등록된 표준 품목입니다.",
    manufacturer: row.manufacturer?.trim() ?? "",
    brand: row.brand?.trim() ?? "",
    unit: row.unit?.trim() ?? "",
    spec1: row.spec1?.trim() ?? "",
    spec2: row.spec2?.trim() ?? "",
    spec3: row.spec3?.trim() ?? "",
    features: [...TENANT.productBadges],
    // 값이 안 내려오면 «한 곳» 으로 본다. 0 으로 두면 화면이 «파는 곳이 없다» 로 읽힌다.
    offerCount: Math.max(Number(row.offerCount) || 1, 1),
    categoryId: row.categoryId?.trim() ?? "",
    maxPrice: typeof row.maxPrice === "number" ? row.maxPrice : null,
    benchmark: toBenchmark(row.benchmark),
    mdRank: num(row.mdRank),
    popularity: num(row.popularity),
  };
}

/** 피드 호출에 필요한 설정. 없으면 화면이 «불러오지 못했습니다» 로 그린다. */
function feedConfig(): { base: string; apiKey: string; slug: string } {
  const base = process.env.SEMO_API_BASE;
  const apiKey = process.env.SEMO_API_KEY;
  const slug = process.env.STOREFRONT_SLUG || DEFAULT_SLUG;

  if (!base || !apiKey) {
    throw new SemoFeedError("SEMO_API_BASE / SEMO_API_KEY 가 설정되지 않았습니다");
  }
  return { base: base.replace(/\/$/, ""), apiKey, slug };
}

/**
 * 피드 한 번 호출.
 *
 * `allowNotFound` 를 켜면 404 를 예외가 아니라 `null` 로 돌려준다 — «없는 상품» 은
 * 장애가 아니라 정상적인 결과이고, 상세 화면은 그때 404 를 그려야 한다.
 */
async function callFeed<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  options: { allowNotFound?: boolean } = {},
): Promise<T | null> {
  const { base, apiKey } = feedConfig();
  const url = new URL(`${base}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch (error) {
    throw new SemoFeedError(
      `세모 피드 호출 실패: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (response.status === 404 && options.allowNotFound) return null;

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new SemoFeedError(`세모 피드 ${response.status}: ${body.slice(0, 300)}`);
  }

  // 세모는 `{ data: … }` 봉투로 감싸 보내지만, 프록시를 걷어 낸 응답을 그대로 받는
  // 경로도 있어 두 모양을 모두 받는다.
  const payload = (await response.json()) as { data?: T } & T;
  return (payload.data ?? payload) as T;
}

/**
 * 상품 한 건.
 *
 * 상세 화면이 카탈로그 전체를 받아 그 안에서 찾던 구조를 대신한다 — 승인 품목이
 * 2만 건이 되면 상세 한 장에 목록 100쪽이 딸려온다.
 */
export async function fetchStorefrontProduct(
  itemId: string,
): Promise<Product | null> {
  const { slug } = feedConfig();
  const row = await callFeed<StorefrontItem>(
    `/external/storefronts/${encodeURIComponent(slug)}/items/${encodeURIComponent(itemId)}`,
    {},
    { allowNotFound: true },
  );
  return row ? toProduct(row) : null;
}

/**
 * 이 상품을 대는 곳들의 값.
 *
 * 세모가 공급사 축을 붙여 주기 전에는 익명(«공급처 N»)으로 내려온다 — 그때도 밴드와
 * 조합은 돈다(익명 오퍼는 상품끼리 같은 업체로 묶이지 않을 뿐). 실명 가림(비로그인)은
 * 여기가 아니라 `catalog.ts` 의 `maskForViewer` 가 한다.
 */
export async function fetchItemOffers(itemId: string): Promise<CatalogOffer[]> {
  const { slug } = feedConfig();
  const result = await callFeed<{ offers?: StorefrontOfferRow[] }>(
    `/external/storefronts/${encodeURIComponent(slug)}/items/${encodeURIComponent(itemId)}/offers`,
    {},
    { allowNotFound: true },
  );
  return (result?.offers ?? []).map(toCatalogOffer);
}

/**
 * 같은 카테고리의 다른 상품 몇 개. 상세 화면의 추천 영역에 쓴다.
 *
 * 추천 여섯 칸 때문에 카탈로그 전체를 끌어올 이유는 없다.
 */
export async function fetchRelatedProducts(
  categoryId: string | null | undefined,
  limit = 12,
): Promise<Product[]> {
  const { slug } = feedConfig();
  const result = await callFeed<{ items?: StorefrontItem[] }>(
    `/external/storefronts/${encodeURIComponent(slug)}/items`,
    { limit, offset: 0, categoryId: categoryId ?? undefined },
  );
  return (result?.items ?? []).map(toProduct);
}


/** 쇼핑몰 카테고리 인덱스 한 묶음 */
export interface StorefrontCategoryGroup {
  rootCategoryId: string | null;
  rootCategoryName: string | null;
  itemCount: number;
  children: Array<{
    categoryId: string | null;
    categoryName: string | null;
    itemCount: number;
  }>;
}

export interface StorefrontPage {
  items: Product[];
  total: number;
}

export type StorefrontSort = "recommended" | "price_asc" | "price_desc" | "name";

export interface StorefrontQuery {
  q?: string;
  categoryId?: string;
  rootCategoryId?: string;
  sort?: StorefrontSort;
  limit?: number;
  offset?: number;
}

/**
 * 카테고리 인덱스.
 *
 * 칩을 그리려고 상품 목록을 통째로 받던 것을 대신한다. 세모에 이 경로가 아직 없으면
 * `null` 을 돌려주고, 화면은 예전 방식(전체 받아 클라이언트에서 거르기)으로 되돌아간다 —
 * 몰과 세모는 배포가 따로라 «아직 없는 구간» 이 반드시 생긴다.
 */
export async function fetchStorefrontCategories(): Promise<
  StorefrontCategoryGroup[] | null
> {
  const { slug } = feedConfig();
  const result = await callFeed<{ groups?: StorefrontCategoryGroup[] }>(
    `/external/storefronts/${encodeURIComponent(slug)}/categories`,
    {},
    { allowNotFound: true },
  );
  return result?.groups ?? null;
}

/** 상품 한 쪽. 필터·정렬·건수는 서버가 한다 */
export async function fetchStorefrontPage(
  query: StorefrontQuery = {},
): Promise<StorefrontPage> {
  const { slug } = feedConfig();
  const result = await callFeed<{ items?: StorefrontItem[]; total?: number }>(
    `/external/storefronts/${encodeURIComponent(slug)}/items`,
    {
      q: query.q || undefined,
      categoryId: query.categoryId || undefined,
      rootCategoryId: query.rootCategoryId || undefined,
      sort: query.sort && query.sort !== "recommended" ? query.sort : undefined,
      limit: query.limit ?? 120,
      offset: query.offset ?? 0,
    },
  );
  return {
    items: (result?.items ?? []).map(toProduct),
    total: typeof result?.total === "number" ? result.total : 0,
  };
}

/**
 * 품목 id 목록으로 받아온다(북마크용).
 *
 * 피드에 id 목록 필터가 없어서 단건을 나눠 부른다. 북마크는 원래 몇 개 수준이라
 * 이 편이 목록 전체를 받는 것보다 훨씬 싸다. 상한을 두어 폭주를 막는다.
 */
export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  const unique = [...new Set(ids)].filter(Boolean).slice(0, 60);
  const results = await Promise.all(unique.map(id => fetchStorefrontProduct(id)));
  return results.filter((item): item is Product => Boolean(item));
}
