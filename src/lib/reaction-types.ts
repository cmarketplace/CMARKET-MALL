import type { Product } from '@/components/Shop/product.data'

/**
 * «반응» 화면이 주고받는 모양 — 브라우저·서버가 같이 쓴다(키·비밀값 없음).
 * 원본은 세모 `storefront-reactions` 모듈이다(세모 PR #1473).
 */

/** «대학 5곳이 최근 30일 재구매» — 실제 발주기관 주문만, 2곳 미만이면 세모가 아예 안 준다. */
export interface SocialProof {
  kind: 'REORDER' | 'BUY'
  orgCount: number
  orgType: string
  windowDays: number
  text: string
}

export interface WishlistEntry {
  product: Product
  wishedAt: string
  /** 찜할 때의 몰 판매가. 지금 값과 비교해 «N원 내렸어요» 를 보여 준다 */
  priceAtWish: number | null
}

export interface ReactionAlert {
  id: string
  kind: 'WISH_PRICE_DROP' | 'WISH_RESTOCK' | 'REVIEW_HELPFUL' | string
  title: string
  body: string
  createdAt: string
}

export interface ShopReview {
  id: string
  /** «대학 · 서울 담당자» — 기관명은 없다 */
  authorLabel: string
  body: string
  photoUrls: string[]
  helpfulCount: number
  createdAt: string
  helpedByMe: boolean
  mine: boolean
}

export interface ReviewableOrder {
  orderNo: string
  confirmedAt: string | null
}

export interface ReviewPage {
  items: ShopReview[]
  total: number
  reviewableOrders: ReviewableOrder[]
}

export const REVIEW_LIMITS = {
  bodyMin: 10,
  bodyMax: 1000,
  photosMax: 4,
  /** 세모가 받는 장당 상한 */
  photoMaxBytes: 5 * 1024 * 1024,
  /** Vercel 함수 요청 상한(4.5MB) 아래로 — 브라우저가 줄여서 보낸다 */
  uploadTotalMaxBytes: 4 * 1024 * 1024,
} as const

export const REPORT_REASONS = [
  { value: 'SPAM', label: '광고·도배' },
  { value: 'ABUSE', label: '욕설·비방' },
  { value: 'PRIVACY', label: '개인정보·기관명 노출' },
  { value: 'UNRELATED', label: '상품과 무관' },
  { value: 'OTHER', label: '기타' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['value']
