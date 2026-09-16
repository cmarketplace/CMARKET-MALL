'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'

import { useShop } from '@/app/providers/ShopProvider'
import type { Product } from '@/components/Shop/product.data'
import QuantityStepper from '@/components/Shop/QuantityStepper'
import { fillBudget } from '@/lib/budget-fill'

import { inputClass } from '../Requests/RequestKit'

export interface BudgetSeed {
  product: Product
  weight: number
}

const won = (n: number) => Math.round(n).toLocaleString('ko-KR')

/**
 * 예산 채우기 화면 — 예산을 바꾸면 수량을 다시 나누고, 손으로 고친 수량은 «고친 값» 으로 남는다.
 * 합계가 예산을 넘으면 빨갛게 적는다(자동으로 깎지 않는다 — 담당자가 늘린 데는 이유가 있다).
 */
export default function BudgetFiller({
  seeds,
  source,
  initialAmount,
}: {
  seeds: BudgetSeed[]
  source: 'history' | 'md' | 'none'
  initialAmount: string
}) {
  const { addToCart } = useShop()
  const [amount, setAmount] = useState(initialAmount)
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [added, setAdded] = useState(false)

  const budget = Number(amount) || 0
  const planned = useMemo(
    () => fillBudget(budget, seeds.map(seed => ({ id: seed.product.id, price: seed.product.basePrice, weight: seed.weight }))),
    [budget, seeds],
  )
  const quantityOf = (id: string) => overrides[id] ?? planned[id] ?? 0
  const total = seeds.reduce((sum, seed) => sum + quantityOf(seed.product.id) * seed.product.basePrice, 0)
  const over = budget > 0 && total > budget

  if (source === 'none') {
    return (
      <p className="bg-light-soft text-muted rounded-2xl px-6 py-10 text-center text-sm">
        채울 상품을 찾지 못했습니다.{' '}
        <Link href="/shop/products" className="text-primary font-semibold hover:underline">
          전체 상품에서 담기
        </Link>
      </p>
    )
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <p className="text-muted mb-3 text-xs">
          {source === 'history' ? '내 주문 기록의 품목별 수량 비율로 나눴습니다.' : '주문 기록이 없어 MD 추천 상품을 같은 비율로 나눴습니다.'}
        </p>
        <ul className="divide-border border-border divide-y rounded-2xl border">
          {seeds.map(({ product }) => {
            const quantity = quantityOf(product.id)
            return (
              <li key={product.id} className="flex items-center gap-4 p-4">
                <span className="bg-light-soft relative h-14 w-14 shrink-0 overflow-hidden rounded-media">
                  {product.img && <Image src={product.img} alt="" fill sizes="56px" className="object-contain p-1" />}
                </span>
                <span className="min-w-0 flex-1">
                  <Link href={`/shop/${product.id}`} className="text-text line-clamp-1 text-sm font-semibold hover:underline">
                    {product.name}
                  </Link>
                  <span className="text-muted block text-xs tabular-nums">{won(product.basePrice)}원</span>
                </span>
                <QuantityStepper
                  value={quantity}
                  min={0}
                  size="sm"
                  label={`${product.name} 수량`}
                  onChange={next => {
                    setAdded(false)
                    setOverrides(current => ({ ...current, [product.id]: Math.max(0, next) }))
                  }}
                />
                <span className="text-text w-24 text-right text-sm font-semibold tabular-nums">{won(quantity * product.basePrice)}원</span>
              </li>
            )
          })}
        </ul>
      </div>

      <aside className="border-border space-y-4 rounded-2xl border bg-white p-5 lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
        <label className="block">
          <span className="text-text text-sm font-semibold">남은 예산</span>
          <span className="relative mt-1.5 block">
            <input
              value={amount}
              onChange={event => {
                setAmount(event.target.value.replace(/\D/g, ''))
                setOverrides({})
                setAdded(false)
              }}
              inputMode="numeric"
              placeholder="3000000"
              className={`${inputClass} pr-8 text-right text-base tabular-nums`}
            />
            <span className="text-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">원</span>
          </span>
        </label>
        <dl className="bg-light-soft space-y-1.5 rounded-xl p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">담을 금액</dt>
            <dd className={`font-semibold tabular-nums ${over ? 'text-[#B3261E]' : 'text-text'}`}>{won(total)}원</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">남는 금액</dt>
            <dd className="text-text tabular-nums">{budget > 0 ? `${won(budget - total)}원` : '-'}</dd>
          </div>
        </dl>
        {over && <p className="text-xs text-[#B3261E]">예산을 넘었습니다. 수량을 줄여 주세요.</p>}
        <p className="text-muted text-xs leading-5">부가세 별도 판매가 기준입니다. 수량 구간 단가·배송비는 장바구니에서 확정됩니다.</p>
        <button
          type="button"
          disabled={total <= 0}
          onClick={() => {
            for (const { product } of seeds) {
              const quantity = quantityOf(product.id)
              if (quantity > 0) addToCart(product, quantity)
            }
            setAdded(true)
          }}
          className="bg-primary hover:bg-primary-dark inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-control text-sm font-semibold text-white transition-colors disabled:opacity-50"
        >
          <ShoppingCart size={16} aria-hidden="true" />
          장바구니에 모두 담기
        </button>
        {added && (
          <Link href="/shop/cart" className="text-primary block text-center text-sm font-semibold hover:underline">
            장바구니 보기
          </Link>
        )}
      </aside>
    </div>
  )
}
