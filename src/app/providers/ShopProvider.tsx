'use client'

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react'

import type { Product } from '@/components/Shop/product.data'
import {
  addLine,
  clearLines,
  getServerSnapshot as getCartServerSnapshot,
  getSnapshot as getCartSnapshot,
  removeLine,
  setLineOffer,
  setLineQuantity,
  subscribe as subscribeCart,
  type CartLine,
} from '@/lib/cart'
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  toggleBookmarkId,
} from '@/lib/bookmarks'
import {
  ensureWishesLoaded,
  getWishError,
  getWishServerSnapshot,
  getWishSnapshot,
  subscribeWishes,
  toggleWish,
} from '@/lib/wishes'

interface ShopContextValue {
  cartItems: CartLine[]
  cartCount: number
  addToCart: (product: Product, quantity?: number, offerId?: string | null) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  /** «직접 고르기» — 줄의 업체를 바꾼다. null 이면 자동(최저가). */
  chooseOffer: (productId: string, offerId: string | null) => void
  clearCart: () => void
  bookmarkedIds: string[]
  isBookmarked: (productId: string) => boolean
  toggleBookmark: (productId: string) => void
  /**
   * 반응 스위치(`SHOP_REACTIONS`) — 켜지면 찜이 하트·세모 저장으로 바뀌고 배지·후기·내 찜이 보인다.
   * 꺼져 있으면(기본) 지금 화면 그대로: 북마크(브라우저 저장)·배지 없음.
   */
  reactionsEnabled: boolean
}

const ShopContext = createContext<ShopContextValue | null>(null)

const noError = () => null

export function ShopProvider({
  children,
  reactionsEnabled = false,
}: {
  children: React.ReactNode
  reactionsEnabled?: boolean
}) {
  // 장바구니·북마크 둘 다 새로고침과 다른 탭에 남아야 해서 localStorage 를 외부 스토어로
  // 구독한다. 자세한 이유는 src/lib/cart.ts, src/lib/bookmarks.ts 주석 참고.
  const cartItems = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getCartServerSnapshot,
  )
  const localBookmarkIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  // 훅은 늘 같은 순서로 부른다 — 스위치가 꺼져 있으면 찜 스토어는 비어 있고 아무도 채우지 않는다.
  const wishIds = useSyncExternalStore(subscribeWishes, getWishSnapshot, getWishServerSnapshot)
  const wishError = useSyncExternalStore(subscribeWishes, getWishError, noError)
  const bookmarkedIds = reactionsEnabled ? wishIds : localBookmarkIds

  useEffect(() => {
    if (reactionsEnabled) ensureWishesLoaded()
  }, [reactionsEnabled])

  const isBookmarked = (productId: string) => bookmarkedIds.includes(productId)

  /**
   * 헤더 장바구니 배지에 붙는 수 — **담긴 품목의 가짓수**다.
   *
   * 수량을 전부 더하면 A4 용지 하나를 25개로 잡았을 때 배지가 «25» 가 된다 —
   * 손님은 그걸 «장바구니에 25건이 들어 있다» 로 읽는다. 수량 합이 필요한 자리는
   * 장바구니 요약이고, 거기서는 «N종 / M개» 로 둘을 나눠 보여 준다.
   */
  const cartCount = cartItems.length

  return (
    <ShopContext.Provider
      value={{
        cartItems,
        cartCount,
        addToCart: addLine,
        removeFromCart: removeLine,
        updateQuantity: setLineQuantity,
        chooseOffer: setLineOffer,
        clearCart: clearLines,
        bookmarkedIds,
        isBookmarked,
        toggleBookmark: reactionsEnabled ? productId => void toggleWish(productId) : toggleBookmarkId,
        reactionsEnabled,
      }}
    >
      {children}
      {reactionsEnabled && wishError && (
        <p
          role="status"
          className="bg-text fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {wishError}
        </p>
      )}
    </ShopContext.Provider>
  )
}

export function useShop() {
  const context = useContext(ShopContext)

  if (!context) {
    throw new Error('useShop must be used within ShopProvider')
  }

  return context
}
