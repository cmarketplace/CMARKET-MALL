'use client'

import { useMemo, useSyncExternalStore } from 'react'

import { useShop } from '@/app/providers/ShopProvider'
import {
  combine,
  singleSupplierCandidates,
  type CombinationInput,
  type CombinationMode,
  type CombinationResult,
} from '@/lib/cart-combination'
import {
  getCartPlanServerSnapshot,
  getCartPlanSnapshot,
  setCartMode,
  setDeselectedIds,
  subscribeCartPlan,
  type CartPlan,
} from '@/lib/cart-plan'
import type { CartLine } from '@/lib/cart'

export interface CartCombination {
  plan: CartPlan
  cartItems: CartLine[]
  /** 주문에 들어가는 줄(선택 해제한 것 제외) */
  selected: CartLine[]
  inputs: CombinationInput[]
  /** 지금 모드로 계산한 결과 */
  result: CombinationResult
  /** 세 모드를 나란히 비교할 때 쓰는 값. «업체 최소화» 가 성립하지 않으면 `single` 은 null. */
  byMode: Record<CombinationMode, CombinationResult | null>
  canSingle: boolean
  setMode: (mode: CombinationMode) => void
  toggleSelect: (productId: string) => void
  setAllSelected: (selected: boolean) => void
}

/**
 * 장바구니 → 업체 조합 — 장바구니 화면과 결제 화면이 **같은 훅**으로 같은 값을 본다.
 *
 * 순수 계산은 `cart-combination.ts` 에 있고, 여기는 저장소 셋(장바구니 줄·계획·선택)을
 * 묶어 한 번에 계산해 줄 뿐이다.
 *
 * `lowestOnly` — 공급기업(공급사·직원) 손님. 업체를 고르지 않는다(세모가 무조건 최저가로 확정한다):
 * 저장된 조합 방식·줄마다 고른 업체를 **무시하고** 최저가 조합 하나로 계산한다. 보기 등급이 FULL 인
 * 직원은 공급사 실명이 보이고 예전에 고른 업체가 장바구니에 남아 있을 수 있는데, 그 값으로 계산하면
 * 화면 금액과 세모가 결제할 금액이 달라진다. 저장값은 지우지 않는다(계산에만 안 쓴다).
 */
export function useCartCombination({ lowestOnly = false }: { lowestOnly?: boolean } = {}): CartCombination {
  const { cartItems } = useShop()
  const plan = useSyncExternalStore(subscribeCartPlan, getCartPlanSnapshot, getCartPlanServerSnapshot)

  const selected = useMemo(
    () => cartItems.filter(line => !plan.deselectedIds.includes(line.product.id)),
    [cartItems, plan.deselectedIds],
  )

  const inputs = useMemo<CombinationInput[]>(
    () =>
      selected.map(line => ({
        product: line.product,
        quantity: line.quantity,
        offerId: lowestOnly ? null : (line.offerId ?? null),
      })),
    [selected, lowestOnly],
  )

  const canSingle = useMemo(
    () => !lowestOnly && singleSupplierCandidates(inputs).length > 0,
    [inputs, lowestOnly],
  )

  const byMode = useMemo<Record<CombinationMode, CombinationResult | null>>(
    () => ({
      best: combine(inputs, 'best'),
      single: canSingle ? combine(inputs, 'single') : null,
      manual: combine(inputs, 'manual'),
    }),
    [inputs, canSingle],
  )

  // «업체 최소화» 가 성립하지 않는 장바구니에서 그 모드가 저장돼 있으면 최저가 조합으로 본다.
  // 공급기업은 모드 자체가 없다 — 언제나 최저가 조합.
  const effectiveMode: CombinationMode =
    lowestOnly || (plan.mode === 'single' && !canSingle) ? 'best' : plan.mode
  const result = byMode[effectiveMode] ?? byMode.best!

  return {
    plan: { ...plan, mode: effectiveMode },
    cartItems,
    selected,
    inputs,
    result,
    byMode,
    canSingle,
    setMode: setCartMode,
    toggleSelect: productId =>
      setDeselectedIds(
        plan.deselectedIds.includes(productId)
          ? plan.deselectedIds.filter(id => id !== productId)
          : [...plan.deselectedIds, productId],
      ),
    setAllSelected: all =>
      setDeselectedIds(all ? [] : cartItems.map(line => line.product.id)),
  }
}
