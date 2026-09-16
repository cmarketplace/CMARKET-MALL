import ShopNav from '@/components/Shop/ShopNav'
import AnnualContractHub from '@/components/Shop/Hub/AnnualContractHub'
import { HubHeader } from '@/components/Shop/Requests/RequestKit'
import { currentAnnualRound } from '@/config/annual-contracts'
import { daysUntil, ddayLabel, kstToday } from '@/config/seasons'
import { isRequestStub } from '@/lib/mall-requests'

export const dynamic = 'force-dynamic'

/**
 * 연간 단가계약 신청 — 품목과 월 수량만 적으면 신청이 모여 품목별로 한 번 입찰한다.
 * 낙찰 단가(설정의 `unitPrice`)가 있으면 몰 안이라 그대로 보여 준다(랜딩에는 안 그린다).
 */
export default async function ShopAnnualContractPage() {
  const today = kstToday()
  const round = currentAnnualRound(today)

  return (
    <main className="min-h-screen bg-white">
      <ShopNav />
      <div className="container-shop space-y-8 pt-8 pb-24">
        {round ? (
          <>
            <HubHeader
              eyebrow="연간 단가계약"
              title={round.title}
              description={
                <>
                  매달 사는 소모품을 1년 단가 한 번으로 정합니다. 신청을 모아 품목별로 한 번 입찰하고,
                  <strong className="text-text font-semibold"> 가장 낮게 부른 단가를 계약 기간 내내 고정</strong>합니다.
                  계약 기간은 {round.term}입니다.
                </>
              }
              aside={
                <span className="bg-navy rounded-2xl px-5 py-3 text-white">
                  <span className="text-on-dark-muted block text-xs">신청 마감</span>
                  <span className="text-2xl font-semibold tabular-nums">{ddayLabel(daysUntil(round.applyClosesAt, today))}</span>
                </span>
              }
            />
            <AnnualContractHub round={round} stub={isRequestStub()} />
          </>
        ) : (
          <p className="bg-light-soft text-muted rounded-2xl px-6 py-10 text-center text-sm">
            지금 신청을 받는 연간 단가계약이 없습니다. 다음 회차가 열리면 이곳에 올라옵니다.
          </p>
        )}
      </div>
    </main>
  )
}
