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
  /** 상품 주소 또는 쇼핑몰 앱 «공유하기» 글 그대로 */
  text: string
  quantity: number
  customer?: LinkItemCustomerFill
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
  /** name·price·seller·not_product */
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
  customer: '직접 적은 가격',
}
