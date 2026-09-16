import snapshot from '@/data/price-compare.json'

/**
 * 인터넷 최저가 비교 — **스냅샷**이다(`landing-stats.ts` 와 같은 규칙: 랜딩은 그릴 때 네트워크를 타지 않는다).
 *
 * 갱신은 semo_RnD `execution/cpoint_price_compare.py` 가 한다:
 *  - 몰 판매가 = 세모 운영 `storefront_offerings`(c-point) 의 그 품목 최저 공급가 × 1.1(부가세).
 *    몰 화면은 부가세 별도로 표시하지만 인터넷 가격은 부가세 포함이라, 비교는 **부가세 포함끼리** 한다.
 *  - 인터넷 최저가 = 같은 상품(브랜드·규격·입수 동일)의 네이버 쇼핑/다나와 최저가. 배송비는 따로 적는다.
 *
 * «세상 어디보다 저렴» 같은 최상급은 **이 파일에 근거가 있을 때만** 쓴다 — 디자인 시스템이 근거 없는
 * 최상급을 금지한다. 그래서 화면은 `cheaperItems()` 가 비어 있으면 최상급 문구 자체를 세우지 않는다.
 */

export interface PriceCompareItem {
  key: string
  /** 화면에 쓰는 짧은 이름. 예) «잘풀리는집 30롤 화장지» */
  label: string
  /** 규격·입수. 예) «22m × 30롤» */
  spec: string
  /** 같은 상품의 몰 상품명(그대로) */
  mallName: string
  /** 몰 판매가(부가세 포함, 원) */
  mallPrice: number
  internet: {
    /** 인터넷 최저가(부가세 포함, 원) */
    price: number
    /** 배송비 — 0 이면 무료, null 이면 표기 없음 */
    shipping: number | null
    /** 판매처·출처. 예) «다나와 최저가» */
    source: string
    title: string
    url: string
    /** 확인 시각 ISO */
    checkedAt: string
  }
}

export interface PriceCompareSnapshot {
  /** 스냅샷을 만든 날(YYYY-MM-DD, KST). 화면에 기준일로 그대로 나간다 */
  measuredAt: string | null
  /** 인터넷 가격 출처 요약. 예) «네이버 쇼핑 검색 API» */
  internetSource: string | null
  items: PriceCompareItem[]
}

export interface PriceCompareRow extends PriceCompareItem {
  /** 인터넷 최저가 − 몰 판매가(원). 양수면 몰이 싸다 */
  saving: number
  /** 절감률(0~1) */
  rate: number
}

export function getPriceCompare(): PriceCompareSnapshot {
  return snapshot as PriceCompareSnapshot
}

/** 몰이 인터넷 최저가보다 **싼** 품목만, 절감률 큰 순. 같거나 비싼 품목은 싸다고 쓰지 않는다. */
export function cheaperItems(data: PriceCompareSnapshot = getPriceCompare()): PriceCompareRow[] {
  if (!data.measuredAt) return []
  return data.items
    .filter(item => item.mallPrice > 0 && item.internet.price > item.mallPrice)
    .map(item => {
      const saving = item.internet.price - item.mallPrice
      return { ...item, saving, rate: saving / item.internet.price }
    })
    .sort((a, b) => b.rate - a.rate)
}

/**
 * 최상급(«세상 어디보다 저렴한») 을 세워도 되는가 — 몰이 더 싼 품목이 이만큼은 있어야 한다.
 * 한두 품목만 골라 «어디보다 싸다» 고 하면 나머지 품목에서 거짓이 된다.
 */
export const PROOF_MIN_ITEMS = 3

export function isPriceProven(rows: PriceCompareRow[]): boolean {
  return rows.length >= PROOF_MIN_ITEMS
}
