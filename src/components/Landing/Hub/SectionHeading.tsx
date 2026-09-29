import type { ReactNode } from 'react'

import { RevealTitle } from '../SectionReveal'

/**
 * 조달 허브 섹션의 제목 묶음 — 기존 랜딩 섹션(Evidence·Contrast)과 같은 크기·간격을 한 곳에 모았다.
 * 섹션이 열 개를 넘으니 제목 규격이 섹션마다 흔들리면 한 페이지로 안 읽힌다.
 */
export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  align?: 'center' | 'left'
}) {
  return (
    <RevealTitle className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
      <p className="text-violet text-sm font-semibold">{eyebrow}</p>
      <h2 className="text-text mt-3 text-[28px] leading-[1.32] font-semibold break-keep sm:text-[36px] lg:text-[40px]">{title}</h2>
      {description && <p className="text-muted mt-5 text-[15px] leading-[1.8] break-keep sm:text-base">{description}</p>}
    </RevealTitle>
  )
}

/** 섹션 아래의 작은 출처·기준 줄. */
export function SourceNote({ children, align = 'center' }: { children: ReactNode; align?: 'center' | 'left' }) {
  return <p className={`text-muted mt-6 text-xs leading-5 ${align === 'center' ? 'text-center' : ''}`}>{children}</p>
}

/** 섹션 아래 보라 버튼. 랜딩의 다른 문(히어로·마무리)과 같은 모양. */
export const landingButtonClass =
  'bg-violet hover:bg-violet-strong inline-flex h-12 items-center justify-center gap-1.5 rounded-control px-6 text-sm font-semibold text-white transition-colors'

export const landingGhostButtonClass =
  'text-violet-strong bg-violet-soft hover:bg-accent inline-flex h-12 items-center justify-center gap-1.5 rounded-control px-5 text-sm font-semibold transition-colors'
