/**
 * 예산 맞춤 채우기 — «남은 예산 N원을 평소 사던 비율대로 채우면 몇 개씩인가».
 *
 * 1. 품목마다 목표 금액 = 예산 × 비중(평소 주문 수량 비중, 기록이 없으면 똑같이).
 * 2. 목표 금액 안에서 살 수 있는 만큼 내림으로 담는다.
 * 3. 남은 돈으로, 목표에 가장 못 미친 품목부터 한 개씩 더 담는다 — 더 담을 수 있는 품목이 없을 때까지.
 *
 * 예산을 넘기지 않는 것이 규칙이다(«예산 소진» 은 넘기면 결재가 안 선다). 단가는 수량 1개 기준 몰
 * 판매가라, 수량 구간 할인이 붙으면 장바구니 합계는 이보다 작아진다 — 넘치는 방향으로는 틀리지 않는다.
 */

export interface BudgetCandidate {
  id: string
  price: number
  weight: number
}

export function fillBudget(budget: number, candidates: BudgetCandidate[]): Record<string, number> {
  const usable = candidates.filter(candidate => candidate.price > 0 && candidate.price <= budget && candidate.weight > 0)
  const quantities: Record<string, number> = Object.fromEntries(candidates.map(candidate => [candidate.id, 0]))
  if (budget <= 0 || usable.length === 0) return quantities

  const totalWeight = usable.reduce((sum, candidate) => sum + candidate.weight, 0)
  const targets = new Map(usable.map(candidate => [candidate.id, (budget * candidate.weight) / totalWeight]))

  let remaining = budget
  for (const candidate of usable) {
    const quantity = Math.floor((targets.get(candidate.id) ?? 0) / candidate.price)
    quantities[candidate.id] = quantity
    remaining -= quantity * candidate.price
  }

  // 한 번에 한 개씩이라 최악에도 «예산 ÷ 최저 단가» 번이다. 폭주를 막는 상한을 둔다.
  for (let guard = 0; guard < 10_000; guard += 1) {
    let pick: BudgetCandidate | null = null
    let pickGap = -Infinity
    for (const candidate of usable) {
      if (candidate.price > remaining) continue
      const gap = ((targets.get(candidate.id) ?? 0) - quantities[candidate.id] * candidate.price) / candidate.price
      if (gap > pickGap) {
        pick = candidate
        pickGap = gap
      }
    }
    if (!pick) break
    quantities[pick.id] += 1
    remaining -= pick.price
  }

  return quantities
}
