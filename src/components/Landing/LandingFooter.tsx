import Image from 'next/image'
import Link from 'next/link'
import { TENANT } from '@/config/tenant'

export default function LandingFooter() {
  return (
    <footer className="border-t border-border bg-[#f7f7f8]">
      <div className="container-content px-5 py-10 sm:px-10 sm:py-12">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-start">
          <div>
            <Link href="/" aria-label={`${TENANT.shopName} 소개`}>
              <Image src="/images/cmarket-logo.png" alt={TENANT.orgName} width={525} height={105} className="h-auto w-[132px]" />
            </Link>
            <p className="mt-5 text-sm font-medium text-text">기관 구매를 더 간편하게 세모네모</p>
            <p className="mt-2 text-sm leading-6 text-muted">승인된 상품과 공급 단가를 한곳에서 만나보세요.</p>
          </div>
          <nav aria-label="푸터 메뉴" className="flex gap-6 text-sm font-medium text-muted-strong">
            <Link href="#evidence" className="py-3 hover:text-primary">서비스 소개</Link>
            <Link href="/shop" className="py-3 hover:text-primary">쇼핑몰 바로가기 ↗</Link>
          </nav>
        </div>
        <p className="mt-8 border-t border-border pt-6 text-xs text-muted">© C-Market. All rights reserved.</p>
      </div>
    </footer>
  )
}
