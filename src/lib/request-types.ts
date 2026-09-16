/**
 * 몰 요청 원장의 모양과 어휘 — **클라이언트에서도 쓸 수 있는 부분**만(`order-types.ts` 와 같은 분리).
 *
 * 장바구니로 끝나지 않는 일 — 견적을 먼저 받아야 하는 서비스, 수량을 모아야 하는 공동구매,
 * 입찰로 단가를 정하는 연간 계약, 몰에 없는 물건 — 은 전부 «요청» 한 줄로 들어온다.
 * 정본은 세모(`/external/storefronts/{slug}/requests`)이고, 씨마켓 운영자가 거기서 받아
 * 견적서(`quoteNo`)를 붙이고 상태를 옮긴다.
 *
 * 요청마다 다른 칸은 `details` 에 담는다. 세모는 그 안을 해석하지 않고 보관·표시만 한다 —
 * 칸이 바뀔 때마다 세모 배포를 기다리지 않으려는 것이다. 대신 **몰이 받을 때 검증한다**
 * (`request-validate.ts`).
 */

export const MALL_REQUEST_TYPES = [
  'SERVICE_QUOTE',
  'GROUP_BUY_PLEDGE',
  'ANNUAL_CONTRACT',
  'SOURCING',
  'SWITCH',
  'KIT',
  'MANDATORY_SOURCING',
  'SOCIAL_VALUE',
] as const

export type MallRequestType = (typeof MALL_REQUEST_TYPES)[number]

export type MallRequestStatus = 'RECEIVED' | 'IN_REVIEW' | 'QUOTED' | 'CONFIRMED' | 'CLOSED' | 'CANCELED'

export const MALL_REQUEST_TYPE_LABEL: Record<MallRequestType, string> = {
  SERVICE_QUOTE: '사무실 관리 견적',
  GROUP_BUY_PLEDGE: '공동구매 수요조사',
  ANNUAL_CONTRACT: '연간 단가계약',
  SOURCING: '구해드림',
  SWITCH: '갈아타기 비교 견적',
  KIT: '꾸러미 견적',
  MANDATORY_SOURCING: '의무구매 인증 상품 견적',
  SOCIAL_VALUE: '장애인표준사업장 연계구매',
}

export const MALL_REQUEST_STATUS_LABEL: Record<MallRequestStatus, string> = {
  RECEIVED: '접수',
  IN_REVIEW: '검토 중',
  QUOTED: '견적 도착',
  CONFIRMED: '확정',
  CLOSED: '종료',
  CANCELED: '취소',
}

export const MALL_REQUEST_STATUS_HINT: Record<MallRequestStatus, string> = {
  RECEIVED: '씨마켓몰 담당자가 확인하기 전입니다. 영업일 기준 하루 안에 연락드립니다.',
  IN_REVIEW: '업체·규격을 맞추는 중입니다. 필요한 것이 있으면 담당자가 연락드립니다.',
  QUOTED: '견적서가 도착했습니다. 견적 번호로 확인하고 확정해 주세요.',
  CONFIRMED: '확정된 요청입니다. 주문·구독·계약으로 이어집니다.',
  CLOSED: '처리가 끝난 요청입니다.',
  CANCELED: '취소된 요청입니다.',
}

/** 접수 직후에만 취소할 수 있다 — 업체가 움직이기 시작한 뒤에는 담당자와 이야기해야 한다. */
export const CANCELABLE_REQUEST_STATUSES: readonly MallRequestStatus[] = ['RECEIVED', 'IN_REVIEW']

export interface MallRequestContact {
  /** 담당자 이름 */
  name: string
  /** 기관·회사명 */
  organization: string
  tel: string
  email: string | null
}

/** `details` 의 한 칸 — 화면이 «무엇을 적었는가» 를 그대로 되읽을 수 있게 라벨을 함께 싣는다. */
export interface MallRequestField {
  label: string
  value: string
}

export interface MallRequest {
  id: string
  /** 사람이 부르는 번호. 예) MR-20260916-0007 */
  requestNo: string
  type: MallRequestType
  status: MallRequestStatus
  /** 요청의 대상 — 서비스 key, `캠페인:품목`, 꾸러미 key 등. 집계는 이 키로 한다. */
  refKey: string | null
  title: string
  /** 수량이 있는 요청(공동구매·연간 계약)의 수량 — 집계용 */
  quantity: number | null
  details: MallRequestField[]
  contact: MallRequestContact
  /** 운영자가 붙인 견적서 번호 */
  quoteNo: string | null
  /** 운영자가 요청자에게 남긴 말 */
  replyNote: string | null
  createdAt: string
  updatedAt: string
}

/** 몰 → 원장으로 보내는 신청. 명의(ownerKey)는 서버 라우트가 세션에서 채운다. */
export interface CreateMallRequestInput {
  type: MallRequestType
  refKey: string | null
  title: string
  quantity: number | null
  details: MallRequestField[]
  contact: MallRequestContact
  /** 같은 클릭의 재시도를 한 건으로 묶는 키 */
  clientRequestKey: string
}

/** refKey 별 집계 — 공동구매 진행 막대. 누가 참여했는지는 싣지 않는다. */
export interface MallRequestTally {
  refKey: string
  /** 참여한 곳 수(요청자 기준 중복 제거) */
  participants: number
  quantity: number
}
