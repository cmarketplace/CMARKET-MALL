/**
 * 「이 몰이 하는 일」 세 칸 — 디자인 시스템 §5 의 「C. 중앙 정렬 메시지형」 + 근거 카드.
 *
 * 카드 상단의 옅은 파랑 면 안에는 **이 몰의 실제 UI 조각**이 들어간다. 아이콘·일러스트로만
 * 채운 개념도는 §2 의 「피할 것」 첫 줄이다 — 씨마켓 자료는 언제나 실제 화면을 증거로 쓴다.
 * 여기 그려진 칩·단가 줄·요약 카드는 전부 `/shop` 에서 같은 토큰으로 실제로 그려지는 것들이다.
 *
 * 세 칸 모두 **지금 동작하는 것**만 적었다. 「주문 접수」는 아직 세모로 넘기는 경로가 없어
 * (장바구니 요약에도 「준비 중」이 서 있다) 랜딩에서 약속하지 않는다.
 */
import { RevealCard, RevealSection, RevealTitle } from './SectionReveal'

export default function Evidence() {
  return (
    <RevealSection id="evidence" className="relative overflow-hidden py-16 sm:py-20">
      <div className="container-content relative z-[2] px-5 sm:px-10">
        <RevealTitle className="mx-auto max-w-3xl text-center">
          <h2 className="text-text text-[28px] leading-[1.32] font-semibold sm:text-[38px] lg:text-[40px]">
            찾고 비교하는 과정은 <span className="keyword-gradient-glow">줄이고</span>
            <br />
            필요한 상품을 <span className="keyword-gradient-glow">바로</span>
          </h2>

          <p className="text-muted mt-6 text-[15px] leading-[1.8] sm:text-base">
            공급사를 찾고 견적을 모으는 일은 세모네모가 미리 끝내 둡니다.
            <br className="hidden sm:block" />
            담당자는 승인된 목록에서 고르기만 하면 됩니다.
          </p>
        </RevealTitle>

        <RevealCard className="mt-14 grid gap-5 lg:grid-cols-3">
          <EvidenceCard
            title="승인된 품목만 보입니다"
            body="세모네모가 승인한 공급사가 실제로 공급하는 품목만 목록에 오릅니다. 카탈로그를 뒤져 «파는 곳이 있는지» 확인할 일이 없습니다."
          >
            <CategoryChips />
          </EvidenceCard>

          <EvidenceCard
            title="언제나 최저가로 담깁니다"
            body="같은 품목을 여러 곳이 대면 그중 가장 싼 값으로 담깁니다. 어느 공급사인지는 목록에도 상세에도 드러나지 않습니다 — 값만 비교됩니다."
          >
            <OfferRows />
          </EvidenceCard>

          <EvidenceCard
            title="담은 그대로 합계가 섭니다"
            body="장바구니는 새로고침해도 남고 화면을 열 때 담아 둔 값을 최신 단가로 맞춥니다. 고른 항목만 골라 합계를 확인할 수 있습니다."
          >
            <CartPeek />
          </EvidenceCard>
        </RevealCard>
      </div>
    </RevealSection>
  )
}

function EvidenceCard({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children: React.ReactNode
}) {
  return (
    <article className="bg-light-soft overflow-hidden rounded-lg">
      {/* 상단 면 — 옅은 파랑 그라데이션 위에 실제 UI 조각을 얹는다. */}
      <div className="from-accent/55 via-blue-tint-2 to-blue-tint flex h-52 items-center justify-center bg-gradient-to-br px-6">
        {children}
      </div>

      <div className="px-6 pt-6 pb-7 sm:px-7">
        <h3 className="text-text text-lg font-semibold">{title}</h3>
        <p className="text-muted mt-2.5 text-sm leading-[1.75]">{body}</p>
      </div>
    </article>
  )
}

/** 목록 상단의 카테고리 칩 줄. 「전체」가 선택된 상태가 기본이다(`Shop.tsx`). */
function CategoryChips() {
  const chips = ['전체', '사무용품', '실험/연구실', '산업/MRO자재']

  return (
    <div className="w-full rounded-md bg-white p-4 shadow-[0_10px_30px_rgba(38,28,80,0.07)]">
      <p className="text-muted text-[11px] font-medium">카테고리</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {chips.map((chip, index) => (
          <span
            key={chip}
            className={`rounded-control px-2.5 py-1.5 text-[11px] ${
              index === 0
                ? 'bg-blue-tint-2 text-primary font-semibold'
                : 'bg-bg text-muted font-medium'
            }`}
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}

/** 상세의 익명 단가 리스트(`OfferList`). 1번만 살아 있고 나머지는 취소선으로 죽는다. */
function OfferRows() {
  return (
    <div className="w-full rounded-md bg-white p-4 shadow-[0_10px_30px_rgba(38,28,80,0.07)]">
      <p className="text-muted text-[11px] font-medium">이 상품을 대는 곳</p>

      <ul className="mt-3 space-y-2">
        <li className="flex items-center justify-between gap-3">
          <span className="bg-highlight-soft text-highlight-strong rounded-xs px-1.5 py-0.5 text-[10px] font-semibold">
            공급처 1 · 최저가
          </span>
          <span className="bg-highlight h-1.5 w-12 rounded-full" />
        </li>
        {['공급처 2', '공급처 3'].map(label => (
          <li key={label} className="flex items-center justify-between gap-3 opacity-45">
            <span className="text-muted text-[10px]">{label}</span>
            <span className="bg-border h-1.5 w-16 rounded-full" />
          </li>
        ))}
      </ul>

      <p className="text-muted mt-3 text-[10px] leading-4">이 값으로 담깁니다</p>
    </div>
  )
}

/** 장바구니 요약(`CartSummary`)의 위 두 줄. */
function CartPeek() {
  return (
    <div className="w-full rounded-md bg-white p-4 shadow-[0_10px_30px_rgba(38,28,80,0.07)]">
      <div className="bg-highlight-soft flex items-center gap-2 rounded-control px-3 py-2">
        <span className="bg-highlight flex h-3.5 w-3.5 items-center justify-center rounded-[3px]">
          <svg viewBox="0 0 12 12" aria-hidden="true" className="h-2.5 w-2.5">
            <path d="m2.5 6.2 2.2 2.2L9.5 3.6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-text text-[11px] font-medium">전체선택</span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted text-[11px]">선택 상품</span>
          <span className="bg-bg-secondary h-2 w-14 rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted text-[11px]">상품 금액</span>
          <span className="bg-bg-secondary h-2 w-10 rounded-full" />
        </div>
      </div>

      <div className="border-bg mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-text text-[11px] font-semibold">총 결제금액</span>
        <span className="bg-primary h-2.5 w-16 rounded-full" />
      </div>
    </div>
  )
}
