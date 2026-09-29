'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PackageSearch, Printer, Zap } from 'lucide-react'

import { RevealCard, RevealSection } from '../SectionReveal'
import SectionHeading from './SectionHeading'

const inputClass =
  'text-text border-border focus-visible:ring-violet w-full rounded-control border bg-white px-4 py-3 text-[15px] outline-none focus-visible:ring-2'

/**
 * 찾는 게 없을 때 — 구해드림 · 급한 물건 · 프린터 모델로 토너 찾기.
 *
 * 세 칸 모두 입력 한 줄로 몰 안의 화면으로 넘어간다(비로그인이면 로그인 안내가 먼저 선다).
 * 토너는 요청이 아니라 **검색**이다 — «모델명 + 토너» 로 몰 목록을 연다.
 */
export default function SourcingSection() {
  const router = useRouter()
  const [item, setItem] = useState('')
  const [urgentItem, setUrgentItem] = useState('')
  const [model, setModel] = useState('')

  const go = (href: string) => (event: React.FormEvent) => {
    event.preventDefault()
    router.push(href)
  }

  return (
    <RevealSection id="sourcing" className="py-16 sm:py-20">
      <div className="container-content px-5 sm:px-10">
        <SectionHeading
          eyebrow="찾는 게 없을 때"
          title={
            <>
              몰에 없는 물건도,
              <br />
              <span className="keyword-gradient-glow">내일</span> 필요한 물건도
            </>
          }
          description="품명만 적어 보내면 씨마켓 공급사 네트워크에서 찾아 견적으로 회신합니다. 견적을 보고 확정하기 전에는 아무것도 주문되지 않습니다."
        />

        <RevealCard className="mt-12 grid gap-4 lg:grid-cols-3">
          <form onSubmit={go(`/shop/request?type=sourcing&item=${encodeURIComponent(item)}`)} className="flex flex-col rounded-lg bg-[var(--hub-card)] p-6">
            <PackageSearch size={26} aria-hidden="true" className="text-violet" />
            <h3 className="text-text mt-4 text-lg font-semibold">구해드림</h3>
            <p className="text-muted mt-2 text-sm leading-6">규격이 까다롭거나 몰에 없는 물건. 모델명·사진 링크를 함께 적으면 더 빨라집니다.</p>
            <label className="mt-auto block pt-5">
              <span className="sr-only">찾는 물건</span>
              <input value={item} onChange={event => setItem(event.target.value)} placeholder="예: 흄후드 필터 1200mm" className={inputClass} />
            </label>
            <button type="submit" className="bg-violet hover:bg-violet-strong mt-2 h-11 cursor-pointer rounded-control text-sm font-semibold text-white transition-colors">
              구해 달라고 요청하기
            </button>
          </form>

          <form
            onSubmit={go(`/shop/request?type=sourcing&urgent=1&item=${encodeURIComponent(urgentItem)}`)}
            className="bg-navy flex flex-col rounded-lg p-6 text-white"
          >
            <Zap size={26} aria-hidden="true" className="text-mint" />
            <h3 className="mt-4 text-lg font-semibold">오늘·내일 필요해요</h3>
            <p className="text-on-dark-muted mt-2 text-sm leading-6">필요한 날짜를 함께 적으면 그날까지 댈 수 있는 공급사부터 찾습니다.</p>
            <label className="mt-auto block pt-5">
              <span className="sr-only">급한 물건</span>
              <input
                value={urgentItem}
                onChange={event => setUrgentItem(event.target.value)}
                placeholder="예: 행사용 생수 200병"
                className="focus-visible:ring-mint w-full rounded-control border border-white/20 bg-white/10 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/60 focus-visible:ring-2"
              />
            </label>
            <button type="submit" className="bg-mint text-navy mt-2 h-11 cursor-pointer rounded-control text-sm font-semibold transition-opacity hover:opacity-90">
              긴급 조달 요청하기
            </button>
          </form>

          <form
            onSubmit={go(`/shop/products?q=${encodeURIComponent(`${model.trim()} 토너`.trim())}`)}
            className="flex flex-col rounded-lg bg-[var(--hub-card)] p-6"
          >
            <Printer size={26} aria-hidden="true" className="text-violet" />
            <h3 className="text-text mt-4 text-lg font-semibold">프린터 모델로 토너 찾기</h3>
            <p className="text-muted mt-2 text-sm leading-6">
              프린터 앞면의 모델명만 적으세요. 환경표지·우수재활용(GR) 인증 재생토너를 고르면 녹색제품 구매로 이어집니다.
            </p>
            <label className="mt-auto block pt-5">
              <span className="sr-only">프린터 모델명</span>
              <input value={model} onChange={event => setModel(event.target.value)} placeholder="예: M404dn" className={inputClass} />
            </label>
            <button
              type="submit"
              disabled={!model.trim()}
              className="bg-violet hover:bg-violet-strong mt-2 h-11 cursor-pointer rounded-control text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              맞는 토너 보기
            </button>
          </form>
        </RevealCard>
      </div>
    </RevealSection>
  )
}
