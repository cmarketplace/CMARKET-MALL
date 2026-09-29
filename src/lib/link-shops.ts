/**
 * «인터넷에서 본 그 제품» 링크로 받는 쇼핑몰 — 화면의 안내 칩과 서버의 미리보기 허용 목록이 같은 목록을 쓴다.
 *
 * 서버가 이 목록 밖의 주소는 **열어 보지 않는다**(미리보기 요청으로 내부망·임의 주소를 두드리는 것을 막는다).
 * 목록 밖 링크도 요청은 받는다 — 미리보기만 없을 뿐, 담당자가 링크를 열어 확인한다.
 */

export interface LinkShop {
  name: string
  /** 이 도메인이거나 이 도메인의 하위 도메인이면 이 쇼핑몰로 본다 */
  domains: string[]
}

export const LINK_SHOPS: readonly LinkShop[] = [
  { name: '쿠팡', domains: ['coupang.com'] },
  { name: '네이버 쇼핑', domains: ['naver.com', 'naver.me'] },
  { name: '11번가', domains: ['11st.co.kr'] },
  { name: 'G마켓', domains: ['gmarket.co.kr'] },
  { name: '옥션', domains: ['auction.co.kr'] },
  { name: 'SSG', domains: ['ssg.com'] },
  { name: '롯데ON', domains: ['lotteon.com'] },
  { name: '다나와', domains: ['danawa.com'] },
  { name: '오피스디포', domains: ['officedepot.co.kr'] },
]

export function shopOf(rawUrl: string): LinkShop | null {
  let host: string
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    host = url.hostname.toLowerCase()
  } catch {
    return null
  }
  return LINK_SHOPS.find(shop => shop.domains.some(domain => host === domain || host.endsWith(`.${domain}`))) ?? null
}

/** 사람이 붙여 넣은 글에서 첫 http(s) 주소만 뽑는다(«[쿠팡] 상품명 https://…» 같은 공유 문구). */
export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i)
  return match ? match[0].slice(0, 1000) : null
}
