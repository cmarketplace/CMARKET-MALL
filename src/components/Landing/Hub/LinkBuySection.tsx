'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardPaste, FileText, Link2, ScanSearch } from 'lucide-react'

import { extractUrl, LINK_SHOPS } from '@/lib/link-shops'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading from './SectionHeading'

const STEPS = [
  { icon: ClipboardPaste, title: '링크 붙여 넣기', body: '쇼핑몰에서 «공유하기»로 복사한 문구 그대로 붙여 넣어도 됩니다.' },
  { icon: ScanSearch, title: '같은 제품 찾기', body: '씨마켓몰에 이미 있으면 바로 보여 드리고, 없으면 공급사에 견적을 받습니다.' },
  { icon: FileText, title: '나란히 비교한 견적서', body: '링크에 보이는 가격과 씨마켓몰 견적가를 한 장에 적어 드립니다.' },
]

/**
 * «인터넷에서 본 그 제품 사고 싶어요» — 링크 한 줄로 시작하는 구매.
 *
 * 담당자는 이미 쿠팡·네이버에서 살 물건을 골라 두었다. 기관 구매 절차(세금계산서·후불·견적서) 때문에 거기서 못 살
 * 뿐이다. 그래서 «찾아 드린다» 가 아니라 «그 링크 그대로 받는다» 로 문을 연다. 비교 가격을 약속하지 않는다 —
 * 견적서가 링크 가격과 나란히 보여 주고, 판단은 담당자가 한다.
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
              사고 싶은 그 제품,
              <br />
              <span className="keyword-gradient-glow">링크만</span> 주세요
            </>
          }
          description="쇼핑몰에서 골라 둔 상품 링크를 붙여 넣으면 같은 제품을 찾아 견적서로 드립니다. 세금계산서와 기관 후불 결제 — 기관 구매 절차 그대로 살 수 있습니다."
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
                이 제품 견적 받기
              </button>
            </div>
            <p className="text-muted mt-3 text-xs">
              {LINK_SHOPS.map(shop => shop.name).join(' · ')} 등 · 그 밖의 쇼핑몰 링크도 받습니다
              {text && !url && <span className="text-violet-strong"> · http 로 시작하는 주소가 보이지 않습니다</span>}
            </p>
          </form>

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
