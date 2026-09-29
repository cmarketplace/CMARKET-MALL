/**
 * 엑셀에서 복사한 구매 내역 → 줄 목록. 절감액 계산(`/shop/savings`)의 입구다.
 *
 * 담당자가 가진 것은 기관마다 모양이 다른 엑셀이다. 칸 순서를 강요하지 않고 **숫자 칸은 오른쪽,
 * 글자 칸은 왼쪽** 이라는 흔한 모양에 기댄다: 오른쪽 끝 숫자 = 단가, 그 앞 숫자 = 수량, 첫 글자 칸 =
 * 품명, 나머지 글자 칸 = 규격. 머리글 줄(«품명·수량·단가»)은 숫자가 없어 빠지고, 못 읽은 줄로 세지도 않는다.
 *
 * 금액 칸(수량×단가)이 끝에 붙어 있는 엑셀도 흔하다 — 오른쪽 숫자가 셋이고 «앞 둘의 곱» 이면
 * 마지막을 금액으로 보고 떼어 낸다.
 */

export interface PastedRow {
  name: string
  spec: string
  quantity: number
  unitPrice: number
}

export const MAX_PASTE_ROWS = 50

const HEADER_WORDS = /품명|품목|수량|단가|규격/

function toNumber(cell: string): number | null {
  const cleaned = cell.replace(/[,\s원₩]/g, '')
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null
  return Number(cleaned)
}

export function parsePurchasePaste(raw: string): { rows: PastedRow[]; skipped: number } {
  const rows: PastedRow[] = []
  let skipped = 0

  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue
    const cells = (line.includes('\t') ? line.split('\t') : line.split(',')).map(cell => cell.trim())

    const numbers: number[] = []
    let cut = cells.length
    while (cut > 0) {
      const value = toNumber(cells[cut - 1])
      if (value === null) {
        // 빈 칸은 건너뛰고 계속 왼쪽을 본다(엑셀 끝의 빈 칸)
        if (cells[cut - 1] === '') {
          cut -= 1
          continue
        }
        break
      }
      numbers.unshift(value)
      cut -= 1
    }

    if (numbers.length >= 3 && Math.abs(numbers[numbers.length - 3] * numbers[numbers.length - 2] - numbers[numbers.length - 1]) < 1) {
      numbers.pop()
    }

    const texts = cells.slice(0, cut).filter(Boolean)
    // 머리글 줄은 «못 읽은 줄» 로 세지 않는다 — 담당자가 빠뜨린 게 아니다.
    if (numbers.length === 0 && HEADER_WORDS.test(line)) continue
    if (numbers.length < 2 || texts.length === 0) {
      skipped += 1
      continue
    }

    const quantity = numbers[numbers.length - 2]
    const unitPrice = numbers[numbers.length - 1]
    if (!(quantity > 0) || !(unitPrice > 0)) {
      skipped += 1
      continue
    }

    rows.push({ name: texts[0].slice(0, 80), spec: texts.slice(1).join(' ').slice(0, 120), quantity, unitPrice })
    if (rows.length >= MAX_PASTE_ROWS) break
  }

  return { rows, skipped }
}

/** 품명 비교용 낱말. 한글·영문·숫자 덩어리만, 한 글자 낱말은 버린다(«용», «1» 이 모든 것과 겹친다). */
export function nameTokens(name: string): string[] {
  return (name.toLowerCase().match(/[가-힣]+|[a-z]+|\d+[a-z]*/g) ?? []).filter(token => token.length > 1)
}

/** 입력 품명의 낱말 중 후보 이름에 들어 있는 비율(0~1). */
export function matchScore(input: string, candidate: string): number {
  const tokens = nameTokens(input)
  if (tokens.length === 0) return 0
  const target = candidate.toLowerCase()
  return tokens.filter(token => target.includes(token)).length / tokens.length
}
