import type { SocialProof } from "@/lib/reaction-types";

/** 수량 구간 단가 — «10개부터 23,200원» 한 줄. `minQuantity` 오름차순으로 둔다. */
export interface PriceTier {
  minQuantity: number;
  price: number;
}

/**
 * 이 상품을 대는 곳 하나의 값.
 *
 * 예전 피드는 공급사를 끝까지 숨겼다(«공급처 1·2·3»). 2026-09-07 결정으로 몰이 공급사별
 * 단가를 **로그인한 손님에게는 실명으로** 보여 주고, 손님이 «씨마켓 안전결제 / 공급사
 * 직접 구매» 를 고른다. 그래서 공급사 축이 이 모양에 들어왔다.
 *
 * 세모 피드가 아직 안 내려주는 값은 전부 `null`/빈 배열이다 — 화면은 값이 있는 것만
 * 그린다(없는 값을 기본 문구로 채우면 «세모가 준 값» 과 «몰이 지어낸 값» 이 안 갈린다).
 */
export interface CatalogOffer {
  offerId: string;
  /** 수량 1 기준 단가(공급가액). 구간 단가는 `tiers` 로 내려간다. */
  price: number;
  /** 세모가 매긴 순위. 1 = 최저가. 동점은 offerId 순 — 세모 `storefront_catalog` 뷰와 같은 규칙. */
  priceRank: number;
  /** 공급사 식별자. 비로그인·미제공이면 null — 그때는 장바구니 «업체 최소화» 가 성립하지 않는다. */
  supplierId: string | null;
  supplierName: string | null;
  /** 납품 리드타임(영업일). */
  leadDays: number | null;
  minQuantity: number | null;
  /** 수량 구간 단가. 비면 `price` 한 값이다. */
  tiers: PriceTier[];
  /** 최근 6개월 단가 추이(월별, 오래된 것부터). 비면 추이 칸을 그리지 않는다. */
  trend: number[];
  /** 세모 공급자 신뢰도 점수(0~100). */
  trustScore: number | null;
  /** 최근 6개월 씨마켓 공고 낙찰 건수. */
  recentAwards: number | null;
  /** 이 공급사가 «직접 구매» 경로를 받는가. 아니면 안전결제 전용이다. */
  directPurchase: boolean;
  /** 공급사 단위 배송비. null 이면 무료. */
  shippingFee: number | null;
  /** 이 금액(공급가액) 이상이면 배송비 면제. null 이면 항상 부과(배송비가 있을 때). */
  freeShippingOver: number | null;
}

/**
 * 시장 기준값 — 씨마켓 공고 실거래(낙찰가)에서 온다.
 *
 * 몰 가격이 «시장 어디쯤인지» 를 말해 주는 유일한 축이다. 세모 가격밴드 배치가 채운 값을
 * 피드가 내려줄 때만 있고, 없으면 밴드에 기준선을 그리지 않는다.
 */
export interface MarketBenchmark {
  /** 최근 낙찰가 중앙값(공급가액 단가). */
  medianPrice: number;
  sampleCount: number;
  windowDays: number;
  /** 기준일 YYYY-MM-DD. 숫자 옆에 반드시 붙인다. */
  asOf: string;
}

export interface Product {
  id: string;
  name: string;
  codeLabel: string;
  code: string;
  basePrice: number;
  img: string;
  /** 말단 카테고리 이름. 카드·상세에 그대로 노출한다(예: 「명찰」). */
  tag: string;
  /**
   * 세모 카테고리 계층의 최상위(대분류). 예: 「사무용품」, 「실험/연구실」.
   *
   * 피드가 아직 안 내려주면 빈 문자열이다 — 그 경우 화면은 기존 규칙으로 되돌아간다.
   */
  categoryGroup: string;
  desc: string;
  manufacturer: string;
  brand: string;
  unit: string;
  spec1: string;
  spec2: string;
  spec3: string;
  features: string[];
  /**
   * 이 상품을 대는 곳의 수.
   *
   * 2 이상이면 `basePrice` 는 그중 **최저가**다. 목록에서는 이 수만 보이고, 실제 값은
   * 상세·장바구니에서 `offers` 로 받는다.
   */
  offerCount: number;
  /** 말단 카테고리 id. 추천 상품을 같은 카테고리에서만 뽑는 데 쓴다 */
  categoryId: string;
  /** 가장 비싼 오퍼. «최대 N원 절약» 문구에만 쓴다 */
  maxPrice: number | null;
  /**
   * 공급사별 값. **목록에서는 비어 있고** 상세·장바구니(`ids=`)에서만 채워진다 —
   * 목록 120건마다 오퍼를 딸려 보내면 피드 호출이 121번이 된다.
   *
   * 선택 필드인 이유: 장바구니가 localStorage 에 상품을 통째로 저장하므로, 이 필드가 생기기
   * 전에 담긴 줄이 남아 있다. 읽는 쪽은 언제나 `product.offers ?? []` 로 본다.
   */
  offers?: CatalogOffer[];
  benchmark?: MarketBenchmark | null;
  /** 공급사 실명이 가려진 채 내려왔는가(비로그인). 화면이 «로그인하면 보입니다» 를 띄우는 근거. */
  namesMasked?: boolean;
  /** MD 큐레이션 순위. 값이 있는 상품만 «MD 픽» 에 오른다. */
  mdRank?: number | null;
  /** 최근 90일 공공기관 주문 건수. 정렬 축으로만 쓴다. */
  popularity?: number | null;
  /**
   * «대학 5곳이 최근 30일 재구매» — 반응 스위치(`SHOP_REACTIONS`)가 켜졌을 때만 서버가 붙인다.
   * 실제 발주기관 주문만 세고 2곳 미만이면 세모가 주지 않는다(가짜·부풀린 숫자 금지).
   */
  socialProof?: SocialProof | null;
}
