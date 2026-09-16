/**
 * «9월 30일(수)» — 화면에 날짜를 적는 한 가지 모양.
 *
 * 입력은 KST 달력 날짜(YYYY-MM-DD)다. `Date` 로 파싱하면 서버 시간대에 따라 하루가 밀리므로
 * UTC 정오로 세워 요일만 읽는다.
 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function formatKDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()]
  return `${month}월 ${day}일(${weekday})`
}

/**
 * «2026.09.16 22:15» — KST 날짜·시각. 서버와 브라우저가 **같은 글자**를 내야 한다.
 *
 * `Intl.DateTimeFormat('ko-KR', { timeStyle })` 은 실행 환경의 ICU 에 따라 «오후 10:15» 와
 * «PM 10:15» 로 갈려 클라이언트 컴포넌트의 하이드레이션이 깨진다. 한국은 서머타임이 없으므로
 * UTC 에 9시간을 더해 숫자로만 찍는다.
 */
export function formatKDateTime(iso: string): string {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  const kst = new Date(time + 9 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${kst.getUTCFullYear()}.${pad(kst.getUTCMonth() + 1)}.${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`
}
