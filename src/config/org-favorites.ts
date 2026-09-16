/**
 * 기관 유형별 자주 찾는 품목 — 우체국·학교·연구기관이 사는 물건은 서로 다르다.
 *
 * ⚠️ 출처 표기가 규칙이다. `basis` 가 `'md'` 인 동안 화면은 «씨마켓몰 MD 정리» 라고 적고
 * 순위·건수를 그리지 않는다. 주문 집계 스냅샷이 생기면 `basis: 'measured'` 와 `measuredAt`
 * 을 채우고, 그때부터 «○월 주문 기준» 으로 바꿔 적는다 — 근거 없는 «많이 산다» 를 쓰지 않는다.
 *
 * 기관 유형은 씨마켓 `mkt_org_group`(우체국 익명 비교에서 쓰는 분류)에 맞춰 두었다.
 */

export interface OrgFavoriteItem {
  name: string
  keyword: string
}

export interface OrgTypeFavorites {
  key: string
  label: string
  /** 이 유형 담당자에게 한 줄 */
  note: string
  items: OrgFavoriteItem[]
}

export interface OrgFavoritesSnapshot {
  basis: 'md' | 'measured'
  /** `measured` 일 때만. YYYY-MM-DD */
  measuredAt: string | null
  types: OrgTypeFavorites[]
}

export const ORG_FAVORITES: OrgFavoritesSnapshot = {
  basis: 'md',
  measuredAt: null,
  types: [
    {
      key: 'post-office',
      label: '우체국',
      note: '창구 포장재와 소포 소모품이 가장 빨리 떨어집니다.',
      items: [
        { name: '택배 상자', keyword: '택배 상자' },
        { name: '포장 테이프', keyword: '박스 테이프' },
        { name: '에어캡(뽁뽁이)', keyword: '에어캡' },
        { name: '라벨지', keyword: '라벨지' },
        { name: '감열지', keyword: '감열지' },
        { name: '고무밴드', keyword: '고무밴드' },
      ],
    },
    {
      key: 'school',
      label: '학교·교육청',
      note: '학기 시작 전과 방학 중 방역 때 수요가 몰립니다.',
      items: [
        { name: '복사용지', keyword: '복사용지' },
        { name: '보드마커', keyword: '보드마커' },
        { name: '코팅지', keyword: '코팅지' },
        { name: '소독 티슈', keyword: '소독 티슈' },
        { name: '체육용품', keyword: '체육' },
        { name: '방역 소독제', keyword: '소독제' },
      ],
    },
    {
      key: 'research',
      label: '연구기관',
      note: '시약과 실험 소모품은 규격·Cat. No 가 같아야 합니다.',
      items: [
        { name: '니트릴 장갑', keyword: '니트릴 장갑' },
        { name: '피펫 팁', keyword: '피펫 팁' },
        { name: '에탄올', keyword: '에탄올' },
        { name: '실험용 와이퍼', keyword: '와이퍼' },
        { name: '실험복', keyword: '실험복' },
        { name: '코니컬 튜브', keyword: '코니컬 튜브' },
      ],
    },
    {
      key: 'local-gov',
      label: '지자체·공공청사',
      note: '민원실 소모품과 행사 물품이 함께 나갑니다.',
      items: [
        { name: '복사용지', keyword: '복사용지' },
        { name: '토너', keyword: '토너' },
        { name: '번호표 감열지', keyword: '감열지' },
        { name: '결재판', keyword: '결재판' },
        { name: '현수막', keyword: '현수막' },
        { name: '화장지', keyword: '화장지' },
      ],
    },
    {
      key: 'public-corp',
      label: '공기업·현장',
      note: '사무실 소모품과 현장 안전용품을 한 번에 채웁니다.',
      items: [
        { name: '안전모', keyword: '안전모' },
        { name: '안전화', keyword: '안전화' },
        { name: '코팅 장갑', keyword: '코팅 장갑' },
        { name: '작업복', keyword: '작업복' },
        { name: '소화기', keyword: '소화기' },
        { name: '구급함', keyword: '구급함' },
      ],
    },
    {
      key: 'health',
      label: '보건소·의료',
      note: '감염 관리 소모품은 떨어지면 바로 업무가 멈춥니다.',
      items: [
        { name: '일회용 마스크', keyword: '마스크' },
        { name: '니트릴 장갑', keyword: '니트릴 장갑' },
        { name: '알코올 솜', keyword: '알코올 솜' },
        { name: '거즈', keyword: '거즈' },
        { name: '체온계', keyword: '체온계' },
        { name: '손소독제', keyword: '손소독제' },
      ],
    },
  ],
}
