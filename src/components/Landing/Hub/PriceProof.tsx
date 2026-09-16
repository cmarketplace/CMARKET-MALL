import type { PriceCompareRow } from '@/lib/price-compare'

const won = (n: number) => n.toLocaleString('ko-KR')

/**
 * «인터넷 최저가 대비» 근거 표 — 최상급 문구 바로 아래에 선다.
 *
 * 같은 상품·부가세 포함끼리 비교한 스냅샷(`price-compare.json`)에서 **몰이 더 싼 품목만** 온다.
 * 기준일과 출처(판매처 링크)를 반드시 함께 그린다 — 링크를 눌러 담당자가 직접 확인할 수 있어야
 * 그 문장이 주장이 아니라 사실이 된다.
 */
export default function PriceProof({
  rows,
  measuredAt,
  limit = 4,
}: {
  rows: PriceCompareRow[]
  measuredAt: string
  limit?: number
}) {
  const shown = rows.slice(0, limit)
  if (shown.length === 0) return null

  return (
    <div className="rounded-lg bg-white p-5 shadow-[0_18px_48px_rgba(38,28,80,0.08)] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-text text-base font-semibold">인터넷 최저가와 비교해 보세요</p>
        <p className="text-muted text-xs">같은 상품 · 부가세 포함 · {measuredAt.replace(/-/g, '.')} 기준</p>
      </div>
      <ul className="divide-border mt-3 divide-y">
        {shown.map(row => (
          <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3.5">
            <span className="min-w-0">
              <span className="text-text block truncate text-[15px] font-semibold">{row.label}</span>
              <span className="text-muted block text-xs">{row.spec}</span>
            </span>
            <span className="text-right">
              <span className="text-muted block text-xs tabular-nums">
                인터넷 최저 <span className="line-through">{won(row.internet.price)}원</span>
              </span>
              <span className="text-text block text-lg leading-tight font-semibold tabular-nums">{won(row.mallPrice)}원</span>
            </span>
            <a
              href={row.internet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-violet col-span-1 truncate text-[11px] underline-offset-2 hover:underline"
            >
              출처: {row.internet.source}
              {row.internet.shipping === 0 ? ' · 무료배송' : row.internet.shipping ? ` · 배송비 ${won(row.internet.shipping)}원 별도` : ''}
            </a>
            <span className="bg-violet-soft text-violet-strong justify-self-end rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums">
              {Math.floor(row.rate * 100)}% 낮음
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted mt-3 text-[11px] leading-5">
        씨마켓몰 판매가는 화면 표시가(부가세 별도)에 부가세 10%를 더한 값이고, 인터넷 가격은 확인 시각의 판매가입니다. 배송비는 따로 적었습니다.
      </p>
    </div>
  )
}
