/**
 * «링크로 바로 사기» 칸에 붙여 넣은 **상품 페이지 통째**(Ctrl+A → Ctrl+C → Ctrl+V)를 서버로 보낼 모양으로 다듬는다.
 *
 * 대표 2026-10-22: 쿠팡·G마켓·옥션·SSG·스마트스토어처럼 서버 접속을 막는 쇼핑몰은 서버가 사람인 척 들어가지 않는다.
 * 손님 브라우저가 이미 연 페이지를 복사한 내용만 읽는다(설치 없음).
 *
 * 지키는 것
 *  - 크기 상한: 원본 8MB 넘으면 HTML 은 버리고 글만, 정리한 HTML 은 40만 바이트·글은 18만 바이트에서 자른다
 *    (세모 본문 상한 1MB 안).
 *  - 스크립트·스타일·iframe·svg·폼 등은 통째로 지우고, 속성은 `class`·`a[href]`·`img[src,width,height,alt]` 만 남긴다
 *    (`javascript:`·`data:` 주소는 버린다). 서버는 이 글을 읽기만 하고 어디에도 그리지 않는다.
 * DOM 없이 정규식으로 다듬는다 — 브라우저·노드 시험 어디서나 같은 결과.
 */

export interface PastedPagePayload {
  html: string | null
  text: string | null
  /** 화면 표시용 — 붙여 넣은 글 길이 */
  chars: number
}

export const PASTE_LIMITS = {
  rawChars: 8_000_000,
  htmlBytes: 400_000,
  textBytes: 180_000,
} as const

const DROP_BLOCKS = /<(script|style|noscript|template|iframe|svg|object|embed|canvas|video|audio|form|select|textarea|head)\b[\s\S]*?<\/\1\s*>/gi
const DROP_SINGLE = /<(link|meta|base|input|source|track|param)\b[^>]*>/gi
const TAG = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, '')
}

function safeUrl(value: string): string | null {
  const v = value.trim()
  if (/^(javascript|data|vbscript):/i.test(v)) return null
  return /^(https?:)?\/\//i.test(v) ? v.replace(/"/g, '%22') : null
}

function keepAttrs(tag: string, attrs: string): string {
  const name = tag.toLowerCase()
  const kept: string[] = []
  ATTR.lastIndex = 0
  let m: RegExpExecArray | null
  let guard = 0
  while ((m = ATTR.exec(attrs)) && guard++ < 40) {
    const key = (m[1] ?? '').toLowerCase()
    const value = unquote(m[2] ?? '')
    if (key === 'class') kept.push(`class="${value.replace(/"/g, '').slice(0, 200)}"`)
    else if (name === 'a' && key === 'href') {
      const url = safeUrl(value)
      if (url) kept.push(`href="${url}"`)
    } else if (name === 'img' && (key === 'src' || key === 'data-src')) {
      const url = safeUrl(value)
      if (url) kept.push(`src="${url}"`)
    } else if (name === 'img' && (key === 'width' || key === 'height') && /^\d{1,5}$/.test(value)) {
      kept.push(`${key}="${value}"`)
    } else if (name === 'img' && key === 'alt') kept.push(`alt="${value.replace(/"/g, '').slice(0, 120)}"`)
  }
  return kept.length ? `<${name} ${kept.join(' ')}>` : `<${name}>`
}

/** 스크립트·스타일·위험한 속성을 지운 HTML */
export function sanitizePastedHtml(html: string): string {
  return html
    .replace(/<!--(?!StartFragment|EndFragment)[\s\S]*?-->/g, '')
    .replace(DROP_BLOCKS, ' ')
    .replace(DROP_SINGLE, ' ')
    .replace(/\s(?:on[a-z]+|style)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(TAG, (_all, tag: string, attrs: string) => keepAttrs(tag, attrs))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
}

/** UTF-8 바이트 상한까지 자른다(글자 중간에서 자르지 않는다) */
export function capBytes(text: string, maxBytes: number): string {
  const encoder = new TextEncoder()
  if (encoder.encode(text).length <= maxBytes) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (encoder.encode(text.slice(0, mid)).length <= maxBytes) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo)
}

/**
 * 링크(또는 공유 글)인가, 페이지 통째인가.
 * 주소 한두 개가 든 짧은 글이면 링크 — 지금처럼 주소 엔진. 길거나(400자↑) 줄이 많은 글이면 페이지.
 */
export function looksLikePage(html: string, plain: string): boolean {
  const text = plain.trim()
  const lines = text.split(/\n/).filter(line => line.trim()).length
  if (text.length >= 400 || lines >= 8) return true
  // 글은 짧아도 HTML 이 큰 경우(사진·표 위주로 복사)
  return html.length >= 20_000 && lines >= 3
}

/** 붙여 넣은 내용 → 서버로 보낼 것. 너무 크거나 비면 문구 */
export function preparePastedPage(html: string, plain: string): PastedPagePayload | { error: string } {
  const rawHtml = html.length > PASTE_LIMITS.rawChars ? '' : html
  const cleanHtml = rawHtml ? capBytes(sanitizePastedHtml(rawHtml), PASTE_LIMITS.htmlBytes) : ''
  const text = capBytes(plain.replace(/\r/g, '').trim(), PASTE_LIMITS.textBytes)
  if (!cleanHtml.trim() && !text) return { error: '붙여 넣은 내용이 비어 있어요. 상품 페이지에서 Ctrl+A, Ctrl+C 한 뒤 다시 붙여 넣어 주세요.' }
  return { html: cleanHtml.trim() ? cleanHtml : null, text: text || null, chars: plain.length || html.length }
}
