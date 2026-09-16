import ShopNav from '@/components/Shop/ShopNav'
import SavingsCalculator from '@/components/Shop/Hub/SavingsCalculator'
import { HubHeader } from '@/components/Shop/Requests/RequestKit'
import { isStubCatalog } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

/**
 * 절감액 계산 — 작년 구매 내역(엑셀)을 붙여 넣으면 줄마다 몰 판매가를 찾아 차액을 보여 준다.
 * 붙여 넣은 내용은 저장하지 않는다(후보 검색에 품명만 쓴다).
 */
export default function ShopSavingsPage() {
  return (
    <main className="min-h-screen bg-white">
      <ShopNav />
      <div className="container-shop space-y-8 pt-8 pb-24">
        <HubHeader
          eyebrow="절감액 계산"
          title="작년에 산 그대로, 씨마켓몰이면 얼마였을까"
          description="구매 내역 엑셀에서 품명·규격·수량·단가 칸을 복사해 붙여 넣으세요. 줄마다 몰에서 같은 상품을 찾아 지금 판매가로 계산합니다. 붙여 넣은 내용은 저장하지 않습니다."
        />
        {isStubCatalog() && (
          <p className="bg-highlight-soft text-highlight-strong rounded-xl px-4 py-2.5 text-xs font-semibold">
            예시 카탈로그로 계산되는 환경입니다 — 세모 피드가 연결되면 실제 판매가로 바뀝니다.
          </p>
        )}
        <SavingsCalculator />
      </div>
    </main>
  )
}
