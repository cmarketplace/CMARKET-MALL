import Link from 'next/link'
import { ClipboardPaste, Scale, ShoppingCart } from 'lucide-react'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading, { landingButtonClass } from './SectionHeading'

const STEPS = [
  { icon: ClipboardPaste, title: '엑셀에서 복사해 붙여 넣기', body: '품명·규격·수량·단가 칸이면 됩니다. 머리글 줄은 알아서 건너뜁니다.' },
  { icon: Scale, title: '줄마다 몰 판매가와 비교', body: '같은 상품을 찾아 지금 판매가로 차액을 계산합니다. 후보는 직접 바꿀 수 있습니다.' },
  { icon: ShoppingCart, title: '싸지는 줄만 담기', body: '몰이 더 비싼 줄은 그렇다고 적고, 싸지는 줄만 장바구니에 담습니다.' },
]

/**
 * 절감액 계산 — 랜딩의 마지막 권유. 예시 숫자를 지어 넣지 않는다: 이 섹션은 «방법» 만 보여 주고
 * 숫자는 담당자 자신의 엑셀에서 나온다.
 */
export default function SavingsSection() {
  return (
    <RevealSection id="savings" className="bg-white py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <SectionHeading
          eyebrow="절감액 계산"
          title={
            <>
              작년에 산 그대로,
              <br />
              <span className="keyword-gradient-glow">씨마켓몰</span>이면 얼마였을까
            </>
          }
          description="구매 내역 엑셀을 붙여 넣으면 줄마다 몰에서 같은 상품을 찾아 차액을 계산합니다. 붙여 넣은 내용은 저장하지 않습니다."
        />
        <RevealCard className="mt-12">
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="bg-light-soft rounded-lg p-6">
                <span className="flex items-center gap-3">
                  <span className="bg-violet flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white">{index + 1}</span>
                  <step.icon size={22} aria-hidden="true" className="text-violet" />
                </span>
                <span className="text-text mt-4 block text-lg font-semibold">{step.title}</span>
                <span className="text-muted mt-2 block text-sm leading-6 break-keep">{step.body}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex justify-center">
            <Link href="/shop/savings" className={landingButtonClass}>
              내 구매 내역으로 계산하기
            </Link>
          </div>
        </RevealCard>
      </div>
    </RevealSection>
  )
}
