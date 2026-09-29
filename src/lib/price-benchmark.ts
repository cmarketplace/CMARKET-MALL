import snapshot from '@/data/price-benchmark.json'

/**
 * 인터넷 정상가 — 연간 단가계약의 **입찰 상한**이자 «세상 어디보다 저렴한 단가계약» 문구의 근거.
 *
 * 인터넷 최저가를 쓰지 않는다(2026-09-16 결정). 최저가에는 재고 떨이·한정 특가·판매가만 낮추고 배송비로
 * 메우는 판매건이 섞여, 그 값을 상한으로 두면 1년 동안 댈 수 있는 공급사가 없다. 그래서
 *   정상가 = 같은 상품·재고 있는 판매건의 상품가(부가세 포함·배송비 별도) **중간값**,
 *   리퍼·유통기한 임박·한정수량·타임딜·가격 갱신 30일 초과·중간값의 60% 미만 판매건은 뺀다.
 * 기록이 7일 이상 쌓이면 하루 값 대신 **최근 30일 중간값**(`basis: '30d'`)을 쓴다.
 *
 * 스냅샷이다 — 랜딩은 그릴 때 네트워크를 타지 않는다. 갱신은 semo_RnD `execution/cpoint_price_benchmark.py`.
 */

export interface PriceBenchmarkItem {
  /** `annual-contracts.ts` 품목 key 와 같다 */
  key: string
  label: string
  spec: string
  /** 정상가 중간값(원, 부가세 포함·배송비 별도) */
  median: number
  /** 중간값에 들어간 판매건 수(30일 기준이면 하루 값의 수) */
  n: number
  min: number
  max: number
  /** 대표 출처(가격비교 페이지) */
  sourceUrl: string
}

export interface PriceBenchmarkSnapshot {
  measuredAt: string | null
  /** 'day' = 그날 하루 중간값, '30d' = 최근 30일 하루 중간값들의 중간값 */
  basis: 'day' | '30d'
  /** 30일 기준일 때 쌓인 날 수 */
  days: number
  items: PriceBenchmarkItem[]
}

/** 최상급 문구를 세우려면 입찰 상한이 붙은 품목이 이만큼은 있어야 한다. */
export const BENCHMARK_MIN_ITEMS = 3

export function getPriceBenchmark(): PriceBenchmarkSnapshot {
  return snapshot as PriceBenchmarkSnapshot
}

export function benchmarkFor(key: string, data: PriceBenchmarkSnapshot = getPriceBenchmark()): PriceBenchmarkItem | null {
  return data.items.find(item => item.key === key) ?? null
}

export function isBenchmarkReady(data: PriceBenchmarkSnapshot = getPriceBenchmark()): boolean {
  return Boolean(data.measuredAt) && data.items.length >= BENCHMARK_MIN_ITEMS
}

/** «2026.09.16 기준 하루 중간값» / «최근 30일(21일치) 중간값» */
export function benchmarkBasisLabel(data: PriceBenchmarkSnapshot = getPriceBenchmark()): string {
  const date = (data.measuredAt ?? '').replace(/-/g, '.')
  return data.basis === '30d' ? `최근 30일 중간값(${data.days}일치) · ${date} 갱신` : `${date} 기준 중간값`
}

export const BENCHMARK_METHOD_NOTE =
  '같은 상품을 파는 인터넷 판매처(재고 있음)의 상품가 중간값입니다. 부가세 포함·배송비 별도이고, 리퍼·유통기한 임박·한정수량·타임딜·가격 갱신이 30일 넘은 판매건과 중간값의 60%에도 못 미치는 떨이 가격은 뺐습니다.'
