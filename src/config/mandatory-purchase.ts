/**
 * 공공기관 의무(우선)구매 — 분야·목표 비율·근거.
 *
 * ⚠️ 이 파일의 숫자는 **국가법령정보센터 현행 조문·고시 원문으로 확인한 값**이다(2026-09-16 조사).
 * 비율 중 둘(중증장애인생산품·표준사업장)은 법이 아니라 **고시**가 정하므로 고시가 바뀌면 여기부터
 * 고친다. 화면은 `BASIS_NOTE` 의 기준일을 반드시 함께 적는다.
 *
 * 분모가 분야마다 다르다 — 계산기가 틀리지 않으려면 `base` 를 지켜야 한다.
 *  - total: 그 해 구매 총액(물품·용역·공사)
 *  - goodsServices: 물품·용역(공사 제외)
 *  - women: 물품·용역의 5% + 공사의 3%
 *  - smeGoods: 중소기업 **물품** 구매액 — 몰이 알 수 없어 계산기는 문장으로만 보여 준다
 *  - none: 법정 비율 없음
 */

export type MandatoryBase = 'total' | 'goodsServices' | 'women' | 'smeGoods' | 'none'

export interface MandatoryCategory {
  key: string
  label: string
  /** 화면용 목표 문구 */
  target: string
  /** 계산에 쓰는 비율(0~1). 비율이 없거나 분모를 모르면 null */
  rate: number | null
  base: MandatoryBase
  /** 근거 조문·고시 */
  law: string
  /** 몰에서 이 분야 상품을 고를 때 볼 인증 */
  proof: string
}

export const MANDATORY_BASIS_NOTE = '2026년 9월 현행 법령·고시 기준 · 기관별 목표는 공공구매종합정보망(SMPP) 공고를 따릅니다'

export const MANDATORY_CATEGORIES: readonly MandatoryCategory[] = [
  {
    key: 'sme',
    label: '중소기업제품',
    target: '구매 총액의 50% 이상',
    rate: 0.5,
    base: 'total',
    law: '판로지원법 제5조, 시행령 제4조',
    proof: '중소기업 확인서',
  },
  {
    key: 'tech',
    label: '기술개발제품',
    target: '중소기업 물품 구매액의 15% 이상',
    rate: null,
    base: 'smeGoods',
    law: '판로지원법 제13조·제14조, 시행령 제12조',
    proof: '성능인증·NEP·GS 등 기술개발제품 인증',
  },
  {
    key: 'startup',
    label: '창업기업제품',
    target: '구매 총액의 8%',
    rate: 0.08,
    base: 'total',
    law: '중소기업창업지원법 제38조, 시행령 제14조',
    proof: '창업기업 확인서(업력 7년 미만)',
  },
  {
    key: 'women',
    label: '여성기업제품',
    target: '물품·용역 각 5%, 공사 3%',
    rate: null,
    base: 'women',
    law: '여성기업지원법 제9조, 시행령 제7조',
    proof: '여성기업 확인서',
  },
  {
    key: 'disabled-owned',
    label: '장애인기업제품',
    target: '구매 총액의 1%',
    rate: 0.01,
    base: 'total',
    law: '장애인기업활동촉진법 제9조의2, 시행령 제7조의2',
    proof: '장애인기업 확인서',
  },
  {
    key: 'severe-disabled',
    label: '중증장애인생산품',
    target: '물품·서비스 구매액의 1.1% (공사 제외)',
    rate: 0.011,
    base: 'goodsServices',
    law: '중증장애인생산품 우선구매 특별법 제7조, 보건복지부 고시',
    proof: '중증장애인생산품 생산시설 지정',
  },
  {
    key: 'standard-workplace',
    label: '장애인 표준사업장 생산품',
    target: '물품·용역 구매액의 0.8% (공사 제외)',
    rate: 0.008,
    base: 'goodsServices',
    law: '장애인고용촉진법 제22조의4, 고용노동부 고시',
    proof: '장애인 표준사업장 인증',
  },
  {
    key: 'social',
    label: '사회적기업제품',
    target: '법정 비율 없음 · 기관이 정한 목표',
    rate: null,
    base: 'none',
    law: '사회적기업육성법 제12조',
    proof: '사회적기업 인증',
  },
  {
    key: 'green',
    label: '녹색제품',
    target: '비율 없음 · 녹색제품이 있으면 녹색제품을 구매',
    rate: null,
    base: 'none',
    law: '녹색제품 구매촉진에 관한 법률 제6조',
    proof: '환경표지·우수재활용(GR) 인증',
  },
]

export interface PurchaseTotals {
  /** 물품·용역 구매액(원) */
  goodsServices: number
  /** 공사 구매액(원) */
  construction: number
}

/** 분야별 올해 목표 금액. 비율·분모를 몰이 알 수 없는 분야는 null. */
export function mandatoryTarget(category: MandatoryCategory, totals: PurchaseTotals): number | null {
  const total = totals.goodsServices + totals.construction
  switch (category.base) {
    case 'total':
      return category.rate === null ? null : Math.round(total * category.rate)
    case 'goodsServices':
      return category.rate === null ? null : Math.round(totals.goodsServices * category.rate)
    case 'women':
      return Math.round(totals.goodsServices * 0.05 + totals.construction * 0.03)
    case 'smeGoods':
    case 'none':
      return null
  }
}

export function findMandatoryCategory(key: string): MandatoryCategory | null {
  return MANDATORY_CATEGORIES.find(category => category.key === key) ?? null
}
