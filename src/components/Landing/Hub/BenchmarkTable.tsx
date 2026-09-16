import type { AnnualContractItem } from '@/config/annual-contracts'
import { benchmarkBasisLabel, benchmarkFor, BENCHMARK_METHOD_NOTE, type PriceBenchmarkSnapshot } from '@/lib/price-benchmark'

const won = (n: number) => n.toLocaleString('ko-KR')

/**
 * 품목별 입찰 상한 표 — «세상 어디보다 저렴한 단가계약» 제목의 근거가 여기 선다.
 *
 * 몰의 **지금 판매가를 싸다고 적지 않는다**(2026-09-16 실측에서 대부분 인터넷보다 비쌌다). 적는 것은
 * «이 가격보다 싸게 부른 곳과만 계약한다» 는 상한과 그 상한을 잰 방법·기준일·출처다.
 */
export default function BenchmarkTable({
  items,
  benchmark,
}: {
  items: readonly AnnualContractItem[]
  benchmark: PriceBenchmarkSnapshot
}) {
  const rows = items
    .map(item => ({ item, bench: benchmarkFor(item.key, benchmark) }))
    .filter((row): row is { item: AnnualContractItem; bench: NonNullable<typeof row.bench> } => row.bench !== null)

  return (
    <div className="rounded-lg bg-white p-5 shadow-[0_18px_48px_rgba(38,28,80,0.08)] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-text text-base font-semibold">품목별 입찰 상한</p>
        <p className="text-muted text-xs">인터넷 정상가 · {benchmarkBasisLabel(benchmark)}</p>
      </div>
      <ul className="divide-border mt-2 divide-y">
        {rows.map(({ item, bench }) => (
          <li key={item.key} className="flex items-center justify-between gap-4 py-3">
            <span className="min-w-0">
              <span className="text-text block truncate text-[15px] font-semibold">{item.name}</span>
              <span className="text-muted block truncate text-xs">{item.spec}</span>
            </span>
            <span className="shrink-0 text-right">
              <a
                href={bench.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-violet block text-[11px] underline-offset-2 hover:underline"
              >
                인터넷 정상가 · 판매처 {bench.n}곳
              </a>
              <span className="text-text block text-base leading-tight font-semibold tabular-nums">
                {won(bench.median)}원<span className="text-violet-strong ml-1 text-xs font-semibold">미만으로</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted mt-3 text-[11px] leading-5">{BENCHMARK_METHOD_NOTE}</p>
    </div>
  )
}
