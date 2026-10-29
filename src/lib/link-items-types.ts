/**
 * «링크로 바로 사기» 응답 모양 — 세모 `external/storefronts/:slug/link-items*` 와 같다(필요한 칸만).
 * 브라우저·서버가 함께 쓰는 타입만 둔다(값·키 없음).
 */

export interface LinkItemCustomerFill {
  /** 쇼핑몰이 막아 못 읽은 제품명 */
  name?: string
  /** 쇼핑몰에서 본 판매가(개당, 부가세 포함) */
  price?: number
  /** 쇼핑몰 배송비 */
  shipping?: number
}

export interface LinkItemInput {
  /** 상품 주소 또는 쇼핑몰 앱 «공유하기» 글 그대로(붙여넣은 페이지면 비어도 된다) */
  text: string
  quantity: number
  customer?: LinkItemCustomerFill
  /** 상품 페이지 통째(Ctrl+A → Ctrl+C) — 스크립트·스타일을 지운 정리본(`paste-page.ts`) */
  page?: { html: string | null; text: string | null }
}

/** 쇼핑몰 표의 칸 한 개(나비엠알오 옵션 표 — 규격·내용량·원산지·모델명·상품코드…) */
export interface LinkItemAttribute {
  name: string
  value: string
}

/** 한 주소에 옵션이 여럿일 때(나비엠알오 묶음 주소) — 손님이 고르면 그 `url` 로 다시 미리 본다 */
export interface LinkItemOption {
  /** 쇼핑몰 상품코드(K…) */
  code: string
  url: string
  /** 옵션끼리 다른 칸만 이은 이름(예: «검정 · 1PK(50EA)») */
  label: string
  /** 판매가(부가세 포함) */
  price: number | null
  specText: string | null
}

export interface LinkItemProduct {
  url: string
  canonicalUrl: string
  shopKey: string
  shopName: string
  name: string | null
  brand: string | null
  manufacturer: string | null
  model: string | null
  specText: string | null
  /** 쇼핑몰 원본 사진 */
  imageUrl: string | null
  /** 인터넷 판매가(개당, 부가세 포함) */
  price: number | null
  listPrice: number | null
  shipping: number | null
  priceMethod: string | null
  nameMethod: string | null
  /** ok | partial | blocked | failed */
  status: string
  httpStatus: number | null
  missing: string[]
  readAt: string
  /** 쇼핑몰 표의 칸 그대로 — 세모 #1660 부터(그 전 세모·스텁은 없음) */
  attributes?: LinkItemAttribute[]
  /** 옵션이 여럿인 주소면 옵션들 — 이때 blockers 에 'option' */
  options?: LinkItemOption[]
}

export interface LinkItemPrice {
  quantity: number
  /** 몰 축 단가(세모네모는 공급가액) */
  unitPrice: number
  /** 부가세 포함 단가 */
  unitInclusive: number
  lineTotal: number
  includeVat: boolean
  linkPrice: number
  shipping: number
  goods: number
  markup: number
  errandFee: number
  totalInclusive: number
  cardFeeRate: number | null
  priceMethod: string | null
  readAt: string | null
}

export interface LinkMallListing {
  itemId: string
  offeringId: string | null
  name: string
  spec: string | null
  unit: string | null
  imageUrl: string | null
  /** 몰 축 판매가 */
  price: number
  isLinkOffer: boolean
}

export interface LinkItemMatch {
  decision: 'link' | 'create' | 'review' | 'skip'
  itemId: string | null
  score: number | null
  candidates: { itemId: string; name: string; spec: string | null; imageUrl: string | null; score: number }[]
}

export interface LinkItemPreview {
  product: LinkItemProduct
  match: LinkItemMatch | null
  mallListings: LinkMallListing[]
  cheaperInMall: LinkMallListing | null
  price: LinkItemPrice | null
  /** name·price·seller·not_product·option(옵션이 여럿인 주소 — 하나를 골라야 함) */
  blockers: string[]
  searchApi: boolean
}

export interface LinkItemBasis {
  itemId: string
  offeringId: string
  isRepresentative: boolean
  url: string
  shopName: string
  linkPrice: number
  shipping: number
  errandFee: number
  cardFeeRate: number | null
  priceMethod: string | null
  readAt: string | null
  includeVat: boolean
  unitPriceAtOne: number | null
}

export interface LinkItemRegistered {
  product: LinkItemProduct
  itemId: string
  decision: 'linked' | 'created' | 'review'
  offeringId: string | null
  item: {
    itemId: string
    name: string
    spec: string | null
    unit: string
    imageUrl: string | null
    price: number | null
  }
  price: LinkItemPrice | null
  basis: LinkItemBasis | null
  mallListings: LinkMallListing[]
  cheaperInMall: LinkMallListing | null
  imageCopyUrl: string | null
}

export interface LinkItemRefresh {
  itemId: string
  offeringId: string
  /** fresh(10분 안에 읽음) · unchanged · updated · unreadable(쇼핑몰이 막음) · customer(손님 입력 가격) */
  status: 'fresh' | 'unchanged' | 'updated' | 'unreadable' | 'customer'
  before: { linkPrice: number; shipping: number; readAt: string | null }
  after: { linkPrice: number; shipping: number; readAt: string | null }
  changed: boolean
}

/** «10월 22일 0시 20분 기준» */
export function readAtLabel(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date)
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return `${get('month')}월 ${get('day')}일 ${Number(get('hour'))}시 ${Number(get('minute'))}분`
}

export const PRICE_METHOD_LABEL: Record<string, string> = {
  jsonld: '쇼핑몰 상품 정보',
  meta: '쇼핑몰 상품 정보',
  naver_api: '네이버 쇼핑 검색',
  pasted: '손님이 붙여 넣은 페이지',
  customer: '직접 적은 가격',
}
