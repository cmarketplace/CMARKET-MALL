/**
 * 계절별 베스트 — «이맘때 담당자들이 찾는 것» 을 네 계절 판으로.
 *
 * `seasons.ts` 는 날짜가 박힌 **행사**(추석·연말 예산 마감)의 D-day 이고, 이 파일은 날짜 없이
 * 매년 돌아오는 **계절**이다. 둘은 섞지 않는다 — 행사는 마감을 세고, 계절은 목록을 보여 준다.
 *
 * 물건과 함께 그 계절에 몰리는 **서비스 선예약**(에어컨 청소는 봄, 난방기 점검은 가을)을 붙인다.
 * 품목은 몰 검색어로만 적는다 — 랜딩은 공개 화면이라 상품 단가를 그리지 않고 몰로 보낸다.
 */

export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter'

export interface SeasonBestItem {
  name: string
  /** 몰 검색어 */
  keyword: string
}

export interface SeasonBest {
  key: SeasonKey
  label: string
  /** 이 계절로 치는 달(1~12) */
  months: number[]
  headline: string
  items: SeasonBestItem[]
  /** 선예약을 받는 서비스 key(`office-services.ts`) */
  serviceKeys: string[]
}

export const SEASON_BESTS: readonly SeasonBest[] = [
  {
    key: 'spring',
    label: '봄',
    months: [3, 4, 5],
    headline: '미세먼지와 새 학기, 여름 준비는 봄에',
    items: [
      { name: '미세먼지 마스크', keyword: '마스크' },
      { name: '공기청정기 필터', keyword: '공기청정기 필터' },
      { name: '파일·바인더', keyword: '바인더' },
      { name: '물티슈', keyword: '물티슈' },
      { name: '서큘레이터', keyword: '서큘레이터' },
      { name: '화분·원예용품', keyword: '화분' },
    ],
    serviceKeys: ['aircon-cleaning', 'air-purifier', 'ice-maker'],
  },
  {
    key: 'summer',
    label: '여름',
    months: [6, 7, 8],
    headline: '폭염·장마 대비를 한 번에',
    items: [
      { name: '선풍기', keyword: '선풍기' },
      { name: '쿨토시', keyword: '쿨토시' },
      { name: '아이스팩', keyword: '아이스팩' },
      { name: '제습제', keyword: '제습제' },
      { name: '모기 기피제', keyword: '모기' },
      { name: '우산 비닐 커버', keyword: '우산' },
    ],
    serviceKeys: ['pest-control', 'ice-maker'],
  },
  {
    key: 'autumn',
    label: '가을·환절기',
    months: [9, 10, 11],
    headline: '환절기 위생과 겨울 채비를 미리',
    items: [
      { name: '손소독제', keyword: '손소독제' },
      { name: '마스크', keyword: '마스크' },
      { name: '가습기', keyword: '가습기' },
      { name: '명절 선물세트', keyword: '선물세트' },
      { name: '핫팩', keyword: '핫팩' },
      { name: '내년 다이어리', keyword: '다이어리' },
    ],
    serviceKeys: ['hvac-inspection', 'fire-safety'],
  },
  {
    key: 'winter',
    label: '겨울',
    months: [12, 1, 2],
    headline: '추위와 눈길, 현장까지 따뜻하게',
    items: [
      { name: '핫팩', keyword: '핫팩' },
      { name: '방한장갑', keyword: '방한장갑' },
      { name: '방한화', keyword: '방한화' },
      { name: '넥워머', keyword: '넥워머' },
      { name: '제설용 염화칼슘', keyword: '염화칼슘' },
      { name: '개인 난방기', keyword: '난방기' },
    ],
    serviceKeys: ['hvac-inspection', 'water-purifier'],
  },
]

/** KST 날짜(YYYY-MM-DD)의 계절. */
export function seasonOf(today: string): SeasonBest {
  const month = Number(today.slice(5, 7))
  return SEASON_BESTS.find(season => season.months.includes(month)) ?? SEASON_BESTS[0]
}
