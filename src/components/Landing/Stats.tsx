import type { LandingStats } from '@/lib/landing-stats'

interface StatsProps {
  /** 스냅샷. `null` 이면 이 섹션은 **아예 그려지지 않는다** */
  stats: LandingStats | null
}

/**
 * 핵심 지표 — 디자인 시스템 §7.
 *
 *  - 핵심 지표는 **3개**가 기본. 가로로 나란히, 아치 배경 위에 대형 숫자.
 *  - 대형 숫자는 **수치와 단위를 분리**한다. 값은 크게, 단위는 작고 연하게.
 *  - 수치 옆에는 반드시 **기준일**을 작게 붙인다.
 *
 * 값이 없으면 통째로 빠진다. 「0품목」을 그리면 «상품이 없는 몰» 로 읽히고, 무엇보다
 * 근거 없는 숫자를 채워 넣는 것은 이 문서가 가장 강하게 금지하는 것이다(§2·§8).
 * 지금 세모의 `c-point` 스토어프론트는 승인 품목이 0건이라 이 섹션은 안 나온다 —
 * 세모에서 품목이 승인되고 `npm run landing:stats` 를 돌리면 그때 나타난다.
 */
export default function Stats({ stats }: StatsProps) {
  if (!stats) return null

  const rows: { value: number; unit: string; label: string }[] = [
    { value: stats.itemCount, unit: '품목', label: '이 몰에 승인된 품목' },
    { value: stats.rootCount, unit: '개', label: '대분류' },
    { value: stats.categoryCount, unit: '개', label: '소분류' },
  ]

  return (
    <section className="container-content px-5 pb-8 sm:px-10 sm:pb-16">
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-8">
        {rows.map(row => (
          <div key={row.label} className="relative pt-8 text-center">
            {/* 시그니처 ⑦ 아치 — 숫자 뒤에 깔리는 옅은 파랑 반원. 사각 카드보다 부드럽다. */}
            <div
              aria-hidden="true"
              className="bg-blue-tint absolute inset-x-0 top-0 mx-auto h-28 w-40 rounded-t-full"
            />

            <div className="relative flex items-end justify-center gap-1.5">
              <strong className="text-text text-[44px] leading-none font-semibold tabular-nums">
                {row.value.toLocaleString('ko-KR')}
              </strong>
              <span className="text-muted pb-1 text-base font-medium">{row.unit}</span>
            </div>

            <p className="text-muted-strong relative mt-3 text-sm font-medium">{row.label}</p>
          </div>
        ))}
      </div>

      {/* 출처·기준일. 숫자 옆에 이게 없으면 그 숫자는 주장일 뿐이다. */}
      <p className="text-muted mt-6 text-center text-xs">
        {stats.measuredAt.replace(/-/g, '.')} 기준 · 세모네모 승인 목록
      </p>
    </section>
  )
}
