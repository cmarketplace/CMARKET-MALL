/**
 * 법정 점검 달력 — 법으로 주기가 정해진 건물·사무실 관리.
 *
 * ⚠️ 주기·대상은 **국가법령정보센터 현행 조문으로 확인한 값**만 적었다(2026-09-16 조사).
 * 대상 규모(연면적)를 함께 적는 이유: «모든 사무실이 해야 한다» 로 읽히면 거짓이 된다.
 * 확인하지 못한 것(사무실 냉각탑 레지오넬라 정기검사 의무)은 넣지 않았다.
 *
 * `serviceKey` 가 있으면 몰의 사무실 관리 서비스로, 없으면 구해드림(점검 업체 찾기)으로 잇는다.
 */

export interface LegalInspection {
  key: string
  name: string
  /** 한눈에 읽는 주기 */
  cycle: string
  /** 누구에게 해당하는가 */
  appliesTo: string
  /** 함께 챙길 것 */
  note: string
  law: string
  serviceKey: string | null
  /** 몰 구해드림 검색어(서비스가 없을 때) */
  sourcingItem: string
}

export const LEGAL_BASIS_NOTE = '2026년 9월 현행 법령 기준 · 건물 규모·용도에 따라 대상이 달라집니다'

export const LEGAL_INSPECTIONS: readonly LegalInspection[] = [
  {
    key: 'disinfection',
    name: '방역 소독',
    cycle: '4~9월 3개월마다 · 10~3월 6개월마다',
    appliesTo: '연면적 2천㎡ 이상 사무실용·복합용도 건축물',
    note: '신고한 소독업자에게 맡기고 소독증명서를 보관',
    law: '감염병예방법 제51조, 시행규칙 별표 7',
    serviceKey: 'pest-control',
    sourcingItem: '방역 소독',
  },
  {
    key: 'water-tank',
    name: '저수조 청소·수질검사',
    cycle: '청소 반기 1회 · 위생점검 월 1회 · 수질검사 연 1회',
    appliesTo: '업무시설 연면적 3천㎡ 이상 등 저수조를 둔 건축물',
    note: '결과는 2년 보관, 수질검사 결과는 이용자에게 공지',
    law: '수도법 제33조, 시행규칙 제22조의4',
    serviceKey: 'water-tank-cleaning',
    sourcingItem: '저수조 청소',
  },
  {
    key: 'fire-safety',
    name: '소방시설 자체점검',
    cycle: '작동점검 연 1회 · 종합점검 연 1회',
    appliesTo: '소방안전관리자 선임 대상 건물 · 공공기관은 외관점검 월 1회 추가',
    note: '종합점검은 사용승인월에, 작동점검은 그 6개월 뒤',
    law: '소방시설법 제22조, 시행규칙 별표 3',
    serviceKey: 'fire-safety',
    sourcingItem: '소방시설 점검',
  },
  {
    key: 'elevator',
    name: '승강기 점검·검사',
    cycle: '자체점검 월 1회 · 정기검사 1년마다',
    appliesTo: '승강기를 둔 건물(설치 25년 경과 등은 6개월마다 검사)',
    note: '자체점검 결과는 승강기안전종합정보망에 입력',
    law: '승강기안전관리법 제31조·제32조',
    serviceKey: null,
    sourcingItem: '승강기 유지관리',
  },
  {
    key: 'septic',
    name: '정화조 청소',
    cycle: '연 1회 이상',
    appliesTo: '정화조를 둔 건물(하수처리구역 안이어도 해당)',
    note: '청소 기록을 남겨 둘 것',
    law: '하수도법 제39조, 시행규칙 제33조',
    serviceKey: null,
    sourcingItem: '정화조 청소',
  },
  {
    key: 'indoor-air',
    name: '실내공기질 측정',
    cycle: '유지기준 항목 연 1회',
    appliesTo: '업무시설 연면적 3천㎡ 이상 · 복합용도 2천㎡ 이상',
    note: '측정 결과는 10년 보존',
    law: '실내공기질관리법 제12조, 시행규칙 제11조',
    serviceKey: null,
    sourcingItem: '실내공기질 측정',
  },
  {
    key: 'electrical',
    name: '전기설비 정기점검',
    cycle: '저압 일반용 3년마다',
    appliesTo: '저압 수전 건물(고압 자가용은 정기검사·안전관리자 선임)',
    note: '한국전기안전공사 점검 일정 확인',
    law: '전기안전관리법 제12조, 시행규칙 제12조',
    serviceKey: null,
    sourcingItem: '전기안전관리 대행',
  },
]
