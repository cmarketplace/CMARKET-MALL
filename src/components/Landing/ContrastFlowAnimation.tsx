import Image from 'next/image'

export default function ContrastFlowAnimation({ asIsRows }: { asIsRows: string[] }) {
  return (
    <div className="mt-12 grid w-full gap-6 md:grid-cols-2">
      <article className="rounded-3xl bg-[#f5f5f7] p-6 sm:p-9">
        <p className="text-sm font-semibold text-muted">기존 구매</p>
        <div className="relative my-8 aspect-[3/2] overflow-hidden rounded-2xl">
          <Image src="/images/landing/quote-comparison.png" alt="여러 공급사의 견적서를 펼쳐 단가를 비교하는 담당자의 모습을 표현한 이미지" fill sizes="(min-width: 1600px) 704px, (min-width: 768px) 44vw, 90vw" className="object-cover" />
        </div>
        <h3 className="text-2xl font-semibold text-text">찾고 비교하고 따로 주문하고</h3>
        <p className="mt-4 text-sm leading-[1.7] text-muted">
          {asIsRows.join('. ')}.
        </p>
      </article>
      <article className="rounded-3xl bg-[#eee8fb] p-6 sm:p-9">
        <p className="text-sm font-semibold text-primary">씨마켓 구매</p>
        <div className="relative my-8 aspect-[3/2] overflow-hidden rounded-2xl">
          <Image src="/images/landing/mall-purchasing.png" alt="노트북에서 세모네모로 물품을 주문하는 모습을 표현한 이미지" fill sizes="(min-width: 1600px) 704px, (min-width: 768px) 44vw, 90vw" className="object-cover" />
        </div>
        <h3 className="text-2xl font-semibold text-primary">비교부터 주문까지 한곳에서</h3>
        <p className="mt-4 text-sm leading-[1.7] text-muted-strong">
          승인 공급사의 단가를 비교해 최저가를 적용합니다. 여러 공급사의 상품을 한 번에 주문합니다. 기관 구매 방식에 맞춰 후불로 결제합니다.
        </p>
      </article>
    </div>
  )
}
