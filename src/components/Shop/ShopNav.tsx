'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, ReceiptText, ShoppingCart } from 'lucide-react'

import { TENANT } from '@/config/tenant'
import { useShop } from '@/app/providers/ShopProvider'

import ShopUserMenu from './ShopUserMenu'

interface ShopNavProps {
  /** 상세처럼 «되돌아갈 곳» 이 분명한 화면에서만 켠다. 목록·장바구니는 끈다. */
  showBack?: boolean
}

/** 몰 안의 두 번째 줄 — 홈·전체 상품·정기구독·사무실 관리·공동구매·연간 계약·구해드림·시즌·절감액·주문·요청. */
const SHOP_LINKS: { href: string; label: string; match: (pathname: string) => boolean }[] = [
  { href: '/shop', label: '홈', match: pathname => pathname === '/shop' },
  { href: '/shop/products', label: '전체 상품', match: pathname => pathname.startsWith('/shop/products') },
  { href: '/shop#subscribe', label: '정기구독', match: () => false },
  { href: '/shop/services', label: '사무실 관리', match: pathname => pathname.startsWith('/shop/services') },
  { href: '/shop/group-buy', label: '공동구매', match: pathname => pathname.startsWith('/shop/group-buy') },
  { href: '/shop/annual', label: '연간 단가계약', match: pathname => pathname.startsWith('/shop/annual') },
  { href: '/shop/request', label: '구해드림·꾸러미', match: pathname => pathname === '/shop/request' },
  { href: '/shop#season', label: '시즌', match: () => false },
  { href: '/shop/savings', label: '절감액 계산', match: pathname => pathname.startsWith('/shop/savings') },
  { href: '/shop/orders', label: '주문 내역', match: pathname => pathname.startsWith('/shop/orders') },
  { href: '/shop/requests', label: '내 요청', match: pathname => pathname.startsWith('/shop/requests') },
]

export default function ShopNav({ showBack = false }: ShopNavProps) {
  const { cartCount } = useShop()
  const router = useRouter()
  const pathname = usePathname()

  // 공유 링크나 검색 결과로 상세에 바로 들어오면 되돌아갈 앱 내 기록이 없다.
  // 그대로 back() 하면 사이트 밖으로 튕기므로, 그때는 상품 목록으로 보낸다.
  // (예전에는 랜딩으로 보냈는데, 쇼핑몰 상세에서 나가는 곳으로는 목록이 맞다.)
  const handleBack = () => {
    if (window.history.length > 1) router.back()
    else router.push('/shop')
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md">
      {/* 양옆을 1fr 로 두어야 가운데 로고가 좌우 버튼 너비와 무관하게 정확히 중앙에 선다.
        * justify-between 으로는 오른쪽이 넓어질수록 로고가 왼쪽으로 밀린다. */}
      <nav className="container-shop grid h-16 grid-cols-[1fr_auto_1fr] items-center sm:h-18">
        {/* 되돌아갈 곳이 있는 화면만 뒤로가기, 나머지는 쇼핑몰 이름 */}
        <div className="flex min-w-0 justify-start">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="text-muted-strong hover:bg-bg -ml-2 flex min-h-11 min-w-11 cursor-pointer items-center gap-0.5 rounded-full py-2.5 pr-3 pl-2 text-base font-semibold transition-colors"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />

              <span className="hidden sm:inline">뒤로가기</span>
            </button>
          ) : (
            <Link href="/" className="text-muted-strong hover:text-primary flex min-h-11 items-center truncate rounded-lg text-base font-semibold transition-colors">
              {TENANT.shopName}
            </Link>
          )}
        </div>

        {/* Logo */}
        {/* 이미지 크기가 그대로 링크 크기가 되면 터치 영역이 44px 를 못 채운다.
          * 로고를 키우지 않고 세로 여백으로 채운다. */}
        <Link
          href="/shop"
          className="flex min-h-11 min-w-11 items-center justify-center"
          aria-label={`${TENANT.shopName} 홈`}
        >
          {/* 씨마켓 로고를 그대로 쓴다. C-POINT 전용 로고가 나오면 이 파일과
            * public/images 만 갈아 끼운다 — 지금 없는 마크를 지어내지 않는다. */}
          <Image
            src="/images/cmarket-logo.png"
            alt={TENANT.orgName}
            width={525}
            height={105}
            priority
            className="h-auto w-[104px] sm:w-[118px]"
          />
        </Link>

        {/* Navigation */}
        <div className="flex items-center justify-end gap-2">
          {/* 주문 내역 — 후불몰이라 «언제 결제하는지» 를 보러 오는 화면이다.
            * 로그인 전에도 링크는 보인다: 누르면 게이트가 로그인 문으로 안내한다. */}
          <Link
            href="/shop/orders"
            className="text-muted-strong hover:bg-bg flex min-h-11 items-center gap-2 rounded-full px-2.5 py-2.5 text-base font-semibold transition-colors sm:px-3"
          >
            <ReceiptText size={20} strokeWidth={1.4} />
            <span className="hidden sm:inline">주문 내역</span>
          </Link>

          {/* Cart */}
          <Link
            href="/shop/cart"
            className="text-primary hover:bg-bg flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2.5 py-2.5 text-base font-semibold transition-colors sm:px-4"
          >
            <ShoppingCart size={20} strokeWidth={1.2} fill="currentColor" />

            <span className="hidden sm:inline">장바구니</span>

            {cartCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-highlight-soft px-1.5 text-xs font-semibold text-highlight-strong">
                {cartCount}
              </span>
            )}
          </Link>

          <ShopUserMenu />
        </div>
      </nav>
      <div className="container-shop">
        <nav aria-label="쇼핑몰 메뉴" className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SHOP_LINKS.map(link => {
            const active = link.match(pathname)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`relative shrink-0 px-3 py-2.5 text-sm transition-colors ${
                  active ? 'text-text font-semibold' : 'text-muted hover:text-text'
                }`}
              >
                {link.label}
                {active && (
                  <span aria-hidden="true" className="bg-primary absolute inset-x-3 bottom-0 h-[2px] rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>
        <div className="h-px bg-bg" aria-hidden="true" />
      </div>
    </header>
  )
}
