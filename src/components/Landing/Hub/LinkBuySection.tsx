'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardPaste, FileText, Link2, ScanSearch } from 'lucide-react'

import { CARD_FEE_RATE, ERRAND_FEE_PER_REQUEST, estimateErrand } from '@/config/link-errand'
import { extractUrl, LINK_SHOPS } from '@/lib/link-shops'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading from './SectionHeading'

const STEPS = [
  { icon: ClipboardPaste, title: '링크 붙여 넣기', body: '쇼핑몰에서 «공유하기»로 복사한 문구 그대로 붙여 넣어도 됩니다.' },
  { icon: FileText, title: '견적서 받기', body: '심부름값을 제품 단가에 포함한 견적서를 드립니다. 몰에 같은 상품이 있으면 그것도 함께 알려 드립니다.' },
  { icon: ScanSearch, title: '대신 주문·배송', body: '확정하시면 씨마켓이 대신 주문하고, 세금계산서·기관 후불로 처리합니다.' },
]

/** 섹션의 계산 예시 — 실제 규칙 함수로 센다(예시 숫자와 규칙이 따로 놀지 않게). */
const EXAMPLE = estimateErrand({ linkUnitPrice: 12_000, quantity: 10, shipping: 0, payment: 'transfer' })
const won = (n: number) => n.toLocaleString('ko-KR')

/**
 * «인터넷에서 본 그 제품 사고 싶어요» — 고른 그대로 대신 사 드림, 심부름값 건당 2,000원(대표 결정 09-17).
 *
 * 담당자는 이미 쿠팡·네이버에서 살 물건을 골라 두었다. 기관 구매 절차(세금계산서·후불·견적서) 때문에 거기서 못 살
 * 뿐이다. 소매가를 대신 사 오는 일이라 «더 싸다» 는 약속은 하지 않는다 — 파는 것은 절차 대행이고, 가격은
 * «링크 판매가 + 심부름값» 으로 투명하게 적는다(심부름값은 견적서 제품 단가에 포함).
 */
export default function LinkBuySection() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [quantity, setQuantity] = useState('')
  const url = extractUrl(text)

  return (
    <RevealSection id="link-buy" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <SectionHeading
          eyebrow="인터넷에서 본 그 제품"
          title={
            <>
              고른 그대로
              <br />
              <span className="keyword-gradient-glow">대신 사 드립니다</span>
            </>
          }
          description={`쇼핑몰에서 골라 둔 상품 링크만 붙여 넣으세요. 세금계산서·기관 후불로 대신 주문해 드리고, 심부름값은 건당 ${won(ERRAND_FEE_PER_REQUEST)}원(부가세 포함)입니다.`}
        />

        <RevealCard className="mt-12">
          <form
            onSubmit={event => {
              event.preventDefault()
              if (!url) return
              const qty = quantity ? `&qty=${quantity}` : ''
              router.push(`/shop/request?type=link&url=${encodeURIComponent(url)}${qty}`)
            }}
            className="mx-auto max-w-3xl rounded-lg bg-[var(--hub-card)] p-4 sm:p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">상품 링크</span>
                <Link2 size={18} aria-hidden="true" className="text-violet pointer-events-none absolute top-1/2 left-4 -translate-y-1/2" />
                <input
                  value={text}
                  onChange={event => setText(event.target.value)}
                  placeholder="상품 링크를 붙여 넣으세요"
                  inputMode="url"
                  className="text-text border-border focus-visible:ring-violet h-13 w-full rounded-control border bg-white pr-4 pl-11 text-[15px] outline-none focus-visible:ring-2"
                />
              </label>
              <label className="sm:w-28">
                <span className="sr-only">수량</span>
                <input
                  value={quantity}
                  onChange={event => setQuantity(event.target.value.replace(/\D/g, '').slice(0, 7))}
                  placeholder="수량"
                  inputMode="numeric"
                  className="text-text border-border focus-visible:ring-violet h-13 w-full rounded-control border bg-white px-4 text-[15px] outline-none focus-visible:ring-2"
                />
              </label>
              <button
                type="submit"
                disabled={!url}
                className="bg-violet hover:bg-violet-strong h-13 shrink-0 cursor-pointer rounded-control px-6 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                대신 사 주세요
              </button>
            </div>
            <p className="text-muted mt-3 text-xs">
              {LINK_SHOPS.map(shop => shop.name).join(' · ')} 등 · 그 밖의 쇼핑몰 링크도 받습니다
              {text && !url && <span className="text-violet-strong"> · http 로 시작하는 주소가 보이지 않습니다</span>}
            </p>
          </form>

          {EXAMPLE && (
            <div className="mx-auto mt-4 max-w-3xl rounded-lg bg-[var(--hub-card)] px-5 py-4">
              <p className="text-text text-sm">
                <span className="text-violet-strong font-semibold">예시</span> 링크 판매가 {won(12_000)}원 × 10개(무료배송) →{' '}
                <strong className="font-semibold tabular-nums">
                  제품 단가 {won(EXAMPLE.unitPrice)}원 · 합계 {won(EXAMPLE.total)}원
                </strong>
              </p>
              <p className="text-muted mt-1 text-xs leading-5">
                심부름값 {won(ERRAND_FEE_PER_REQUEST)}원(부가세 포함)은 견적서의 제품 단가에 포함해 적습니다. 카드 결제는 카드수수료{CARD_FEE_RATE !== null ? `(${Number((CARD_FEE_RATE * 100).toFixed(2))}%)` : ''}가 별도로 더해집니다.
                주문 시점 판매가 기준이며 쿠폰·카드할인·멤버십가는 적용되지 않고, 반품 배송비는 실비입니다.
              </p>
            </div>
          )}

          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-lg bg-[var(--hub-card)] p-6">
                <span className="flex items-center gap-3">
                  <span className="bg-violet flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white">{index + 1}</span>
                  <step.icon size={22} aria-hidden="true" className="text-violet" />
                </span>
                <span className="text-text mt-4 block text-lg font-semibold">{step.title}</span>
                <span className="text-muted mt-2 block text-sm leading-6 break-keep">{step.body}</span>
              </li>
            ))}
          </ol>
        </RevealCard>
      </div>
    </RevealSection>
  )
}
