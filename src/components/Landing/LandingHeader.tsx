import Image from 'next/image'
import Link from 'next/link'
import { TENANT } from '@/config/tenant'

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md">
      <nav aria-label="랜딩 메뉴" className="container-content grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 sm:px-10">
        <Link href="/" aria-label={`${TENANT.shopName} 소개`}>
          <Image src="/images/cmarket-logo.png" alt={TENANT.orgName} width={525} height={105} priority className="h-auto w-20 sm:w-[118px]" />
        </Link>
        <Link href="/" aria-label="C-Market Mall 홈" style={{ fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif' }} className="whitespace-nowrap text-base font-semibold text-navy sm:text-2xl">
          C-Market <span className="font-semibold text-primary">Mall</span>
        </Link>
        <div className="flex items-center justify-end gap-6">
          <Link href="#services" className="hidden text-sm font-medium text-muted-strong hover:text-primary xl:block">사무실 구독</Link>
          <Link href="#group-buy" className="hidden text-sm font-medium text-muted-strong hover:text-primary xl:block">공동구매</Link>
          <Link href="#annual" className="hidden text-sm font-medium text-muted-strong hover:text-primary xl:block">단가계약</Link>
          <Link href="#evidence" className="hidden text-sm font-medium text-muted-strong hover:text-primary lg:block">서비스 소개</Link>
          <Link href="/shop" className="rounded-control bg-primary px-3 py-3 text-xs sm:px-5 sm:text-sm font-semibold text-white transition-colors hover:bg-primary-dark">쇼핑몰<span className="hidden sm:inline"> 바로가기</span></Link>
        </div>
      </nav>
    </header>
  )
}
