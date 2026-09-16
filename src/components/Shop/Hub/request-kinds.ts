/**
 * 요청 화면(`/shop/request`)의 종류 — 서버 페이지와 클라이언트 탭이 함께 쓴다.
 * `'use client'` 파일에 두면 서버에서 읽을 때 배열이 아니라 클라이언트 참조가 와서 따로 둔다.
 */
export const REQUEST_KINDS = ['sourcing', 'switch', 'kit', 'mandatory', 'social'] as const
export type RequestKind = (typeof REQUEST_KINDS)[number]
