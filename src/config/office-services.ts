/**
 * 사무실 관리 서비스 — 청소·렌탈·탕비실·점검을 «업체 지정 → 견적서 → 구독» 한 줄로 잇는다.
 *
 * 몰이 파는 것은 물건만이 아니다. 담당자가 매년 따로 계약하던 청소·정수기·방역을 한 계약,
 * 한 계산서로 묶는 것이 이 섹션의 약속이다(담당자는 몇 천 원보다 계약 상대 수에 민감하다).
 *
 * 흐름
 *  1. 담당자가 서비스(여러 개 가능)를 고르고 인원·면적·대수와 주기를 적어 **견적을 요청**한다
 *     (`/shop/services` → 몰 요청 원장, type `SERVICE_QUOTE`).
 *  2. 씨마켓이 지정 업체의 견적서를 붙여 회신한다(요청의 `quoteNo`).
 *  3. 세모에 구독 상품(`planKey`)이 있는 서비스는 그 자리에서 **정기구독**으로 넘어간다.
 *
 * ⚠️ `vendor` 는 **계약이 끝난 업체만** 적는다. 비어 있으면 화면은 «지정 업체 선정 중» 으로
 * 그린다 — 업체 이름을 지어 넣지 않는다. 가격도 여기 없다(견적서가 정한다).
 */

export type ServiceGroupKey = 'cleaning' | 'rental' | 'pantry' | 'care'

export interface ServiceGroup {
  key: ServiceGroupKey
  label: string
  description: string
}

export const SERVICE_GROUPS: readonly ServiceGroup[] = [
  { key: 'cleaning', label: '청소·위생', description: '사무실·화장실·에어컨, 방역까지' },
  { key: 'rental', label: '렌탈', description: '정수기·제빙기·비데·복합기' },
  { key: 'pantry', label: '탕비실', description: '간식·커피·생수·탕비실 용품' },
  { key: 'care', label: '관리·점검', description: '문서 파기·화분·냉난방기·소방' },
]

/** 견적을 내는 기준. 폼이 무엇을 묻는지가 여기서 정해진다. */
export type ServiceSizing = 'people' | 'area' | 'units'

export const SIZING_LABEL: Record<ServiceSizing, { label: string; unit: string; placeholder: string }> = {
  people: { label: '인원', unit: '명', placeholder: '30' },
  area: { label: '면적', unit: '평', placeholder: '80' },
  units: { label: '대수', unit: '대', placeholder: '2' },
}

export interface ServiceVendor {
  /** 계약서상 상호 */
  name: string
  /** 화면에 붙는 확인 사항 — 실제로 확인한 것만 적는다(예: «배상책임보험 가입 확인») */
  checks: string[]
}

export interface OfficeService {
  key: string
  name: string
  group: ServiceGroupKey
  /** 카드 한 줄 설명 */
  summary: string
  /** 이 서비스에 무엇이 들어가는가 */
  includes: string[]
  sizing: ServiceSizing
  /** 방문·교체·배송 주기 선택지 */
  cycles: string[]
  /** 세모 구독 상품 key. 있으면 견적 없이도 «바로 구독» 문이 열린다. */
  planKey: string | null
  /** 씨마켓 지정 업체. 계약 전이면 null. */
  vendor: ServiceVendor | null
  /** 법정 점검과 이어지는 서비스면 그 key(`legal-inspections.ts`) */
  legalKey?: string
  /** 계절에 몰리는 서비스 — 이 달들에 «선예약» 배지를 붙인다(1~12) */
  preorderMonths?: number[]
}

export const OFFICE_SERVICES: readonly OfficeService[] = [
  // ── 청소·위생 ──────────────────────────────────────────────
  {
    key: 'office-cleaning',
    name: '사무실 청소',
    group: 'cleaning',
    summary: '정해진 요일에 전문 인력이 방문해 업무 공간을 청소합니다.',
    includes: ['책상 주변·바닥·회의실', '쓰레기 수거·분리배출', '탕비실 정리'],
    sizing: 'area',
    cycles: ['주 1회', '주 2회', '주 3회', '매일'],
    planKey: 'clean',
    vendor: null,
  },
  {
    key: 'restroom-cleaning',
    name: '화장실 청소',
    group: 'cleaning',
    summary: '변기·세면대·바닥 세정과 휴지·핸드타월 보충을 함께 맡깁니다.',
    includes: ['위생도기·세면대 세정', '바닥·배수구 청소', '휴지·핸드워시 보충'],
    sizing: 'units',
    cycles: ['주 2회', '주 3회', '매일'],
    planKey: null,
    vendor: null,
  },
  {
    key: 'aircon-cleaning',
    name: '에어컨 청소',
    group: 'cleaning',
    summary: '분해 세척으로 곰팡이·냄새를 잡습니다. 여름 전에 예약이 몰립니다.',
    includes: ['필터·열교환기 분해 세척', '배수 점검', '작업 전후 사진'],
    sizing: 'units',
    cycles: ['연 1회', '연 2회'],
    planKey: null,
    vendor: null,
    preorderMonths: [3, 4, 5],
  },
  {
    key: 'pest-control',
    name: '방역·해충 방제',
    group: 'cleaning',
    summary: '정기 방역 소독과 해충 방제를 함께 받고 소독 증명서를 보관합니다.',
    includes: ['정기 방역 소독', '해충 방제', '소독 증명서 발급'],
    sizing: 'area',
    cycles: ['월 1회', '격월', '분기 1회'],
    planKey: null,
    vendor: null,
    legalKey: 'disinfection',
  },
  {
    key: 'entrance-mat',
    name: '입구 매트 교체',
    group: 'cleaning',
    summary: '먼지·빗물 매트를 세탁된 매트로 주기마다 바꿔 드립니다.',
    includes: ['매트 수거·교체', '세탁·살균', '규격 맞춤'],
    sizing: 'units',
    cycles: ['2주 1회', '월 1회'],
    planKey: null,
    vendor: null,
  },
  {
    key: 'water-tank-cleaning',
    name: '저수조 청소',
    group: 'cleaning',
    summary: '물탱크 청소와 수질검사를 한 번에 맡기고 결과서를 받습니다.',
    includes: ['저수조 청소·소독', '수질검사 의뢰', '결과서 보관'],
    sizing: 'units',
    cycles: ['반기 1회'],
    planKey: null,
    vendor: null,
    legalKey: 'water-tank',
  },

  // ── 렌탈 ───────────────────────────────────────────────────
  {
    key: 'water-purifier',
    name: '정수기 렌탈',
    group: 'rental',
    summary: '필터 교체·살균 방문 관리까지 포함한 사무실용 정수기입니다.',
    includes: ['냉온수 정수기 설치', '정기 필터 교체', '방문 살균 관리'],
    sizing: 'units',
    cycles: ['2개월 관리', '4개월 관리'],
    planKey: null,
    vendor: null,
  },
  {
    key: 'ice-maker',
    name: '제빙기 렌탈',
    group: 'rental',
    summary: '탕비실·구내식당용 제빙기와 세척 관리를 함께 빌립니다.',
    includes: ['제빙기 설치', '정기 세척·살균', '고장 출동'],
    sizing: 'units',
    cycles: ['월 1회 관리', '격월 관리'],
    planKey: null,
    vendor: null,
    preorderMonths: [4, 5, 6],
  },
  {
    key: 'bidet',
    name: '비데 렌탈',
    group: 'rental',
    summary: '화장실 칸마다 비데를 두고 노즐·필터를 주기적으로 관리합니다.',
    includes: ['비데 설치', '노즐 세척·필터 교체', '고장 출동'],
    sizing: 'units',
    cycles: ['2개월 관리', '4개월 관리'],
    planKey: null,
    vendor: null,
  },
  {
    key: 'air-purifier',
    name: '공기청정기 렌탈',
    group: 'rental',
    summary: '회의실·민원실 공기청정기와 필터 교체를 함께 맡깁니다.',
    includes: ['공기청정기 설치', '필터 정기 교체', '센서 점검'],
    sizing: 'units',
    cycles: ['2개월 관리', '6개월 관리'],
    planKey: null,
    vendor: null,
    preorderMonths: [2, 3],
  },
  {
    key: 'copier',
    name: '복합기 렌탈',
    group: 'rental',
    summary: '토너·부품·출장 수리를 포함한 복합기 렌탈입니다.',
    includes: ['복합기 설치', '토너·드럼 포함', '출장 수리'],
    sizing: 'units',
    cycles: ['월 기본매수 선택'],
    planKey: null,
    vendor: null,
  },
  {
    key: 'coffee-machine',
    name: '커피머신 렌탈',
    group: 'rental',
    summary: '원두 정기 배송과 머신 세척을 함께 받는 사무실 커피입니다.',
    includes: ['커피머신 설치', '원두 정기 배송', '세척·점검'],
    sizing: 'people',
    cycles: ['월 1회 원두', '격주 원두'],
    planKey: null,
    vendor: null,
  },

  // ── 탕비실 ─────────────────────────────────────────────────
  {
    key: 'snack-box',
    name: '사무실 간식 구독',
    group: 'pantry',
    summary: '인원에 맞춘 간식 박스가 주기마다 옵니다. 남는 품목은 다음 회차에 바뀝니다.',
    includes: ['과자·음료·커피믹스 구성', '선호 설문 반영', '남는 품목 교체'],
    sizing: 'people',
    cycles: ['월 1회', '격주', '매주'],
    planKey: 'snack',
    vendor: null,
  },
  {
    key: 'pantry-supplies',
    name: '탕비실 용품 구독',
    group: 'pantry',
    summary: '종이컵·티슈·세제·물티슈 같은 탕비실 소모품을 떨어지기 전에 채웁니다.',
    includes: ['종이컵·일회용품', '티슈·핸드타월', '주방 세제·수세미'],
    sizing: 'people',
    cycles: ['월 1회', '격주'],
    planKey: null,
    vendor: null,
  },
  {
    key: 'bottled-water',
    name: '생수 정기 배송',
    group: 'pantry',
    summary: '생수를 정해진 날 사무실 안까지 들여 드립니다.',
    includes: ['500ml·2L·18.9L 선택', '실내 배송', '빈 통 회수'],
    sizing: 'people',
    cycles: ['주 1회', '격주', '월 1회'],
    planKey: null,
    vendor: null,
  },

  // ── 관리·점검 ──────────────────────────────────────────────
  {
    key: 'document-shredding',
    name: '보안문서 파기',
    group: 'care',
    summary: '잠금 수거함을 두고 주기마다 수거해 파기하고 파기 확인서를 받습니다.',
    includes: ['잠금 수거함 설치', '정기 수거·파쇄', '파기 확인서 발급'],
    sizing: 'units',
    cycles: ['월 1회', '분기 1회', '수시'],
    planKey: null,
    vendor: null,
  },
  {
    key: 'plant-care',
    name: '화분 관리',
    group: 'care',
    summary: '로비·사무실 화분을 들이고 물주기·교체까지 맡깁니다.',
    includes: ['화분 설치', '정기 방문 관리', '시든 식물 교체'],
    sizing: 'units',
    cycles: ['격주', '월 1회'],
    planKey: null,
    vendor: null,
  },
  {
    key: 'uniform-laundry',
    name: '근무복 세탁',
    group: 'care',
    summary: '근무복·앞치마·실험복을 수거해 세탁 후 돌려드립니다.',
    includes: ['정기 수거·배달', '세탁·다림질', '수선'],
    sizing: 'people',
    cycles: ['주 1회', '격주'],
    planKey: null,
    vendor: null,
  },
  {
    key: 'hvac-inspection',
    name: '냉난방기 점검',
    group: 'care',
    summary: '계절이 바뀌기 전에 냉난방기를 점검해 가동 첫날 고장을 막습니다.',
    includes: ['가동 점검', '냉매·배수 확인', '점검표 제공'],
    sizing: 'units',
    cycles: ['연 1회', '연 2회'],
    planKey: null,
    vendor: null,
    preorderMonths: [9, 10],
  },
  {
    key: 'fire-safety',
    name: '소방시설 점검',
    group: 'care',
    summary: '소방시설 자체점검을 맡기고 점검 결과 보고까지 챙깁니다.',
    includes: ['작동·종합 점검', '소화기 교체', '결과 보고서'],
    sizing: 'area',
    cycles: ['연 1회', '연 2회'],
    planKey: null,
    vendor: null,
    legalKey: 'fire-safety',
  },
]

export function findService(key: string | null | undefined): OfficeService | null {
  if (!key) return null
  return OFFICE_SERVICES.find(service => service.key === key) ?? null
}

export function servicesInGroup(group: ServiceGroupKey): OfficeService[] {
  return OFFICE_SERVICES.filter(service => service.group === group)
}
