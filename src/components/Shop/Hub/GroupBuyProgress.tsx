import type { GroupBuyItem } from '@/config/group-buys'
import type { MallRequestTally } from '@/lib/request-types'

const num = (n: number) => n.toLocaleString('ko-KR')

/**
 * 공동구매 진행 막대 — 모인 수량이 단계(입찰 시작 → 제조사 직납 …)의 어디쯤인가.
 *
 * 막대의 끝은 마지막 단계 수량이다. 집계가 없거나(`tally` null) 참여가 0곳이면 숫자와 채움 없이
 * 단계만 그린다 — 0 으로 채운 막대는 «아무도 참여하지 않았다» 로 읽힌다.
 *
 * 랜딩(어두운 면 아님)과 몰이 같이 쓴다. 서버 컴포넌트에서도 그릴 수 있게 상태가 없다.
 */
export default function GroupBuyProgress({
  item,
  tally: rawTally,
  compact = false,
}: {
  item: GroupBuyItem
  tally: MallRequestTally | null
  compact?: boolean
}) {
  // 아직 아무도 참여하지 않았으면 숫자 없이 단계만 — «0곳 참여» 는 인기 없는 품목으로 읽힌다.
  const tally = rawTally && rawTally.participants > 0 ? rawTally : null

  const goal = item.milestones[item.milestones.length - 1]?.quantity ?? 1
  const quantity = tally?.quantity ?? 0
  const ratio = Math.min(1, quantity / goal)
  const reached = item.milestones.filter(milestone => quantity >= milestone.quantity).length

  return (
    <div>
      {tally && (
        <p className="text-text flex items-baseline justify-between gap-2 text-sm">
          <span>
            <strong className="text-[18px] font-semibold tabular-nums">{num(quantity)}</strong>
            <span className="text-muted ml-0.5 text-xs">{item.unit} 모임</span>
          </span>
          <span className="text-muted text-xs tabular-nums">{num(tally.participants)}곳 참여</span>
        </p>
      )}

      <div
        className="bg-bg relative mt-2 h-2 overflow-hidden rounded-full"
        role={tally ? 'progressbar' : undefined}
        aria-valuemin={tally ? 0 : undefined}
        aria-valuemax={tally ? goal : undefined}
        aria-valuenow={tally ? Math.min(quantity, goal) : undefined}
        aria-label={tally ? `${item.name} 모인 수량` : undefined}
      >
        {tally && (
          <span
            className="bg-primary absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
            style={{ width: `${ratio * 100}%` }}
          />
        )}
      </div>

      <ol className={`mt-2 grid gap-1 ${compact ? 'text-[11px]' : 'text-xs'}`} style={{ gridTemplateColumns: `repeat(${item.milestones.length}, minmax(0, 1fr))` }}>
        {item.milestones.map((milestone, index) => {
          const done = tally !== null && index < reached
          return (
            <li key={milestone.quantity} className={index === item.milestones.length - 1 ? 'text-right' : index === 0 ? '' : 'text-center'}>
              <span className={`block tabular-nums ${done ? 'text-primary font-semibold' : 'text-muted-strong font-medium'}`}>
                {num(milestone.quantity)}
                {item.unit}
              </span>
              <span className={`block leading-4 ${done ? 'text-primary' : 'text-muted'}`}>{milestone.label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
