import Link from 'next/link'
import { Building2, Landmark } from 'lucide-react'

export type Audience = 'org' | 'biz'

const OPTIONS: { key: Audience; label: string; icon: typeof Landmark; caption: string }[] = [
  { key: 'org', label: '공공기관', icon: Landmark, caption: '후불 결제 · 의무구매 실적 · 공동구매' },
  { key: 'biz', label: '기업', icon: Building2, caption: '카드·포인트 결제 · 연간 단가계약 · 갈아타기' },
]

/**
 * «누가 사나요» — 공공기관과 기업은 먼저 봐야 할 섹션이 다르다.
 *
 * 링크(`?for=`)로 바꾼다. 서버가 순서를 정해 그리므로 첫 화면이 깜빡이지 않고, 주소를 그대로 공유하면
 * 받는 사람도 같은 순서를 본다. `scroll={false}` — 누른 자리에 그대로 머문다.
 */
export default function AudienceSwitch({ audience }: { audience: Audience }) {
  return (
    <section id="hub" aria-label="이용자 유형" className="container-content px-5 pt-10 pb-2 sm:px-10 sm:pt-14">
      <p className="text-muted text-center text-sm font-medium">어디에서 구매하시나요?</p>
      <div className="mx-auto mt-4 grid max-w-2xl grid-cols-2 gap-3" role="tablist" aria-label="이용자 유형">
        {OPTIONS.map(option => {
          const active = option.key === audience
          const Icon = option.icon
          return (
            <Link
              key={option.key}
              href={option.key === 'org' ? '/#hub' : '/?for=biz#hub'}
              scroll={false}
              role="tab"
              aria-selected={active}
              className={`rounded-lg px-4 py-4 text-left transition-colors sm:px-6 ${
                active ? 'bg-navy text-white' : 'bg-blue-tint text-text hover:bg-blue-tint-2'
              }`}
            >
              <span className="flex items-center gap-2 text-base font-semibold sm:text-lg">
                <Icon size={20} aria-hidden="true" className={active ? 'text-mint' : 'text-violet'} />
                {option.label}
              </span>
              <span className={`mt-1 block text-xs leading-5 sm:text-[13px] ${active ? 'text-on-dark-muted' : 'text-muted'}`}>
                {option.caption}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
