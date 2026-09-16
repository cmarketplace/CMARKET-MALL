'use client'

import Sparkline from '@/components/Shop/Sparkline'
import type { CatalogOffer } from '@/components/Shop/product.data'
import { rankOffers, supplierLabel, unitPriceAt } from '@/lib/offer-pricing'

interface OfferTableProps {
  offers: readonly CatalogOffer[]
  quantity: number
  bestOfferId: string | null
  selectedOfferId: string | null
  /**
   * 줄을 누르면 그 업체로 담는다. 없으면 **읽기 전용** — 공급기업(공급사·직원) 손님은 업체도 경로도 고르지
   * 않으므로(세모가 최저가·안전결제로 확정) 줄 선택과 «주문 방식» 칸을 뺀다. 실명·단가는 보기 등급대로 보인다.
   */
  onSelect?: (offerId: string) => void
}

const won = (n: number) => n.toLocaleString('ko-KR')

/**
 * 공급사별 값 표 — 단가 · N개 합계 · 수량 구간 · 6개월 추이 · 리드타임 · 신뢰 · 주문 방식.
 *
 * 줄을 누르면 그 업체로 담긴다(«직접 고르기», 발주기관만). 값이 없는 칸은 «—» 가 아니라 비워 둔다 —
 * 세모가 아직 안 주는 값을 화면이 «없음» 으로 단정하지 않는다.
 */
export default function OfferTable({
  offers,
  quantity,
  bestOfferId,
  selectedOfferId,
  onSelect,
}: OfferTableProps) {
  const ranked = rankOffers(offers, quantity)
  const hasTrend = ranked.some(offer => offer.trend.length >= 2)
  const hasTiers = ranked.some(offer => offer.tiers.length > 0)
  const hasLead = ranked.some(offer => offer.leadDays !== null)
  const hasTrust = ranked.some(offer => offer.trustScore !== null)
  const selectable = Boolean(onSelect)

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-muted text-left text-xs whitespace-nowrap">
              <th className="py-2 pr-3 font-medium">공급사</th>
              <th className="py-2 pr-3 text-right font-medium">단가</th>
              <th className="py-2 pr-3 text-right font-medium">{quantity}개 합계</th>
              {hasTiers && <th className="py-2 pr-3 font-medium">수량 구간</th>}
              {hasTrend && <th className="py-2 pr-3 font-medium">6개월 추이</th>}
              {hasLead && <th className="py-2 pr-3 font-medium">리드타임</th>}
              {hasTrust && <th className="py-2 pr-3 text-right font-medium">신뢰</th>}
              {selectable && <th className="py-2 font-medium">주문 방식</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-bg">
            {ranked.map(offer => {
              const unit = unitPriceAt(offer, quantity)
              const isBest = offer.offerId === bestOfferId
              const isSelected = offer.offerId === selectedOfferId
              return (
                <tr
                  key={offer.offerId}
                  onClick={onSelect ? () => onSelect(offer.offerId) : undefined}
                  aria-selected={selectable ? isSelected : undefined}
                  className={`transition-colors ${selectable ? 'cursor-pointer' : ''} ${
                    isBest ? 'bg-light-soft' : selectable ? 'hover:bg-light-soft' : ''
                  } ${
                    isSelected ? 'shadow-[inset_3px_0_0_var(--color-primary)]' : ''
                  }`}
                >
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <p className="text-text font-semibold">{supplierLabel(offer)}</p>
                    <p className="text-muted text-[11px]">
                      {isBest ? '자동 선정' : !selectable ? '' : isSelected ? '직접 고름' : '선택하려면 클릭'}
                    </p>
                  </td>
                  <td className="text-text py-3 pr-3 text-right font-semibold tabular-nums whitespace-nowrap">{won(unit)}원</td>
                  <td className="text-text py-3 pr-3 text-right tabular-nums whitespace-nowrap">{won(unit * quantity)}원</td>
                  {hasTiers && (
                    <td className="text-muted py-3 pr-3 text-[11px] whitespace-nowrap">
                      {offer.tiers.length > 0
                        ? offer.tiers.map(tier => `${tier.minQuantity}+ ${won(tier.price)}`).join(' / ')
                        : ''}
                    </td>
                  )}
                  {hasTrend && (
                    <td className="text-primary py-3 pr-3">
                      <Sparkline values={offer.trend} label={`${supplierLabel(offer)} 6개월 단가 추이`} />
                    </td>
                  )}
                  {hasLead && (
                    <td className="text-text py-3 pr-3 whitespace-nowrap">
                      {offer.leadDays !== null ? `${offer.leadDays}일` : ''}
                    </td>
                  )}
                  {hasTrust && (
                    <td className="text-text py-3 pr-3 text-right tabular-nums">
                      {offer.trustScore !== null ? offer.trustScore : ''}
                    </td>
                  )}
                  {selectable && (
                    <td className="py-3 whitespace-nowrap">
                      <span className="text-muted text-xs">
                        {offer.directPurchase ? '안전결제 · 직접 구매' : '안전결제만'}
                      </span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
