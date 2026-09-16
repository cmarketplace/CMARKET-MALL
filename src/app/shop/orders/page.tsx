import Link from 'next/link'

import ShopNav from '@/components/Shop/ShopNav'
import CancelOrderButton from '@/components/Shop/Orders/CancelOrderButton'
import {
  CANCELABLE_STATUSES,
  DEAL_TYPE_LABEL,
  isPrepaid,
  ORDER_ROUTE_LABEL,
  ORDER_STATUS_HINT,
  orderStatusLabel,
  PAYMENT_METHOD_LABEL,
  type StorefrontOrder,
} from '@/lib/order-types'
import { listOrders, OrderError } from '@/lib/orders'
import { getShopMember } from '@/lib/shop-member'

// 방금 낸 주문이 바로 보여야 한다. 캐시되면 담당자는 «주문이 안 됐다» 로 읽고 한 번 더 누른다.
export const dynamic = 'force-dynamic'

/**
 * 내 주문 내역.
 *
 * 씨마켓 「나의 거래 관리」에도 뜨지만, 담당자가 몰에서 나가지 않고
 * 「내 주문이 어디쯤인지 · 언제 얼마를 내는지」를 보는 자리가 여기다. 접수·공급사 수락 대기
 * 단계까지는 여기서 바로 취소할 수 있다(선불은 취소 시 카드 승인 취소·포인트 반환).
 */
export default async function ShopOrdersPage() {
  const member = await getShopMember()

  let orders: StorefrontOrder[] = []
  let loadError: string | null = null

  if (member) {
    try {
      const page = await listOrders(member.memberKey)
      orders = page.orders
    } catch (error) {
      // 빈 목록으로 삼키지 않는다 — «주문한 적 없음» 과 «못 불러옴» 이 같아 보이면
      // 담당자는 주문이 사라졌다고 읽는다.
      if (!(error instanceof OrderError)) throw error
      loadError = error.message
      console.error('[shop/orders page]', error.status, error.message)
    }
  }

  const formatOrderedAt = (iso: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Seoul',
    }).format(new Date(iso))

  return (
    <main className="bg-white">
      <ShopNav showBack />

      <div className="container-shop py-10 lg:py-14">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-text text-2xl font-semibold">주문 내역</h1>
          <p className="text-muted mt-1 text-sm leading-6">
            주문한 건과 진행 상태입니다. 카드·포인트는 주문 때 결제됐고, 세금계산서 후불은 납품 검수 뒤 청구됩니다.
          </p>
          {orders.length > 0 && (
            // 인수인계용 — 담당자가 바뀌면 새 담당자는 이 목록을 몰에서 볼 수 없다.
            <a
              href="/api/shop/orders/export"
              className="text-primary bg-blue-tint-2 hover:bg-accent mt-3 inline-flex items-center rounded-control px-3.5 py-2 text-xs font-semibold transition-colors"
            >
              엑셀(CSV)로 내려받기 · 인수인계용
            </a>
          )}

          {loadError ? (
            <p
              role="alert"
              className="mt-6 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-5 text-[#B3261E]"
            >
              {loadError}
            </p>
          ) : orders.length === 0 ? (
            <div className="bg-light-soft mt-6 rounded-lg px-5 py-10 text-center">
              <p className="text-muted text-sm">아직 주문한 건이 없습니다.</p>
              <Link
                href="/shop"
                className="bg-primary hover:bg-primary-dark mt-4 inline-block rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors"
              >
                상품 보러 가기
              </Link>
            </div>
          ) : (
            <ol className="mt-6 space-y-4">
              {orders.map(order => {
                const isCanceled = order.status === 'CANCELED'
                const hint = ORDER_STATUS_HINT[order.status]
                const prepaid = isPrepaid(order.paymentMethod)
                const meta = [
                  formatOrderedAt(order.createdAt),
                  ORDER_ROUTE_LABEL[order.route],
                  order.dealType === 'CMARKET_AGENCY' ? DEAL_TYPE_LABEL.CMARKET_AGENCY : null,
                  order.paymentMethod ? PAYMENT_METHOD_LABEL[order.paymentMethod] : null,
                  order.supplierCount > 1 ? `공급사 ${order.supplierCount}곳` : null,
                  order.quoteNo ? `견적서 ${order.quoteNo}` : null,
                ].filter(Boolean)

                return (
                  <li key={order.orderNo} className="bg-light-soft rounded-2xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/shop/order-complete?orderNo=${encodeURIComponent(order.orderNo)}`}
                          className="text-text font-mono text-base font-semibold hover:underline"
                        >
                          {order.orderNo}
                        </Link>
                        <p className="text-muted mt-0.5 text-xs">{meta.join(' · ')}</p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          isCanceled
                            ? 'text-muted bg-bg'
                            : 'bg-highlight-soft text-highlight-strong'
                        }`}
                      >
                        {orderStatusLabel(order.status)}
                      </span>
                    </div>

                    {/* 품목 요약 — 첫 품목 + N건. 전체는 영수증에서 본다 */}
                    <p className="text-text mt-3 truncate text-sm">
                      {order.items[0]?.name}
                      {order.items.length > 1 && (
                        <span className="text-muted"> 외 {order.items.length - 1}건</span>
                      )}
                    </p>

                    {hint && !isCanceled && (
                      <p className="text-muted mt-1 text-xs leading-5">{hint}</p>
                    )}

                    <div className="border-bg mt-3 flex items-end justify-between border-t border-dashed pt-3">
                      <div className="text-sm">
                        <span className="text-muted">
                          {isCanceled ? '취소된 금액 ' : prepaid ? '결제된 금액 ' : '청구 예정 금액 '}
                        </span>
                        <strong
                          className={`font-semibold ${isCanceled ? 'text-muted line-through' : 'text-primary'}`}
                        >
                          {order.totalPayable.toLocaleString()}원
                        </strong>
                      </div>

                      {CANCELABLE_STATUSES.includes(order.status) && (
                        <CancelOrderButton orderNo={order.orderNo} prepaid={prepaid} />
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </main>
  )
}
