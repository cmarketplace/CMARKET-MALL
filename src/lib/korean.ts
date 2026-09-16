/**
 * 받침에 맞는 조사 — «화장지는», «핫팩은». 「은(는)」 같은 괄호 조사는 담당자에게 기계가 쓴 문장으로 읽힌다.
 * 한글로 끝나지 않으면(영문·숫자·괄호) 받침을 알 수 없어 괄호 조사로 둔다.
 */
function hasFinalConsonant(word: string): boolean | null {
  const last = word.trim().replace(/[)\]\s]+$/, '').slice(-1)
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return null
  return (code - 0xac00) % 28 !== 0
}

function particle(word: string, withFinal: string, withoutFinal: string): string {
  const final = hasFinalConsonant(word)
  if (final === null) return `${word}${withFinal}(${withoutFinal})`
  return `${word}${final ? withFinal : withoutFinal}`
}

/** 은/는 */
export const topic = (word: string) => particle(word, '은', '는')
/** 을/를 */
export const object = (word: string) => particle(word, '을', '를')
