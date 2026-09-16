'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CreditCard, FileText } from 'lucide-react'

import ShopNav from '@/components/Shop/ShopNav'
import { useCartCombination } from '@/components/Shop/Cart/useCartCombination'
import { TENANT } from '@/config/tenant'
import { calculateCartAmounts } from '@/lib/cart-amounts'
import {
  allowedPaymentMethods,
  DEAL_TYPE_LABEL,
  isPrepaid,
  ORDER_ROUTE_LABEL,
  PAYMENT_METHOD_LABEL,
  routeSummary,
  type CustomerType,
  type OrderRoute,
  type OrderShipTo,
  type PaymentMethod,
  type PaymentOptions,
} from '@/lib/order-types'
import {
  LoginRequiredError,
  OrderSubmitError,
  fetchPaymentOptions,
  getActiveQuoteServerSnapshot,
  getActiveQuoteSnapshot,
  getShipToServerSnapshot,
  getShipToSnapshot,
  newOrderKey,
  placeOrder,
  setActiveQuote,
  setShipTo,
  subscribeActiveQuote,
  subscribeShipTo,
  toOrderLine,
} from '@/lib/place-order'
import { isQuoteValid, quoteMatchesLines, QUOTE_UNUSABLE_CODE } from '@/lib/quote-types'

interface CheckoutViewProps {
  /** 로그인한 담당자 이름. 없으면 주문 버튼이 로그인 문으로 안내한다. */
  viewerName: string | null
  /**
   * 발주기관(INSTITUTION) / 공급기업(COMPANY — 공급사·직원). 서버가 세션 역할로 정한 값이고, 주문 API 와
   * 세모가 같은 판정을 다시 한다 — 여기서는 «고를 수 있는 것» 만 미리 거른다.
   */
  customerType: CustomerType
  /** 직원 계정 — 카드·포인트가 본인 것이 아니라 소속 회원의 것이다(씨마켓이 회원 단위로만 둔다). 문구만 바꾼다. */
  paysWithAffiliate: boolean
  /** 결제 명의를 정할 수 없는 사유(소속 회원이 없는 직원). 있으면 결제수단을 읽지 않고 이 말을 보여 준다. */
  payerBlockedMessage: string | null
}

/** idle = 아직 안 읽음(카드·포인트를 고른 순간 읽기 시작한다) → ready | error. */
type PaymentOptionsState =
  | { status: 'idle' }
  | { status: 'ready'; data: PaymentOptions }
  | { status: 'error'; message: string }

const won = (n: number) => n.toLocaleString('ko-KR')
const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', timeZone: 'Asia/Seoul' }).format(
    new Date(iso),
  )

/**
 * 주문 방법 선택 — 씨마켓 안전결제 / 공급사 직접 구매, 그리고 결제수단.
 *
 * 두 경로는 같은 장바구니·같은 조합 위에 선다(`useCartCombination`). 다른 것은 «누구와
 * 계약하고, 계산서가 몇 장이고, 문제 생기면 누구에게 말하나» 다. 가격은 같다(2026-09-14 D3).
 *
 * 고객 유형이 화면을 가른다(`allowedPaymentMethods` — 세모 서버 규칙의 사본):
 *   발주기관  경로 2개 · 안전결제면 후불·카드·포인트, 직접 구매면 후불만.
 *   공급기업  경로 선택 없음(안전결제 고정) · 카드·포인트 선불만 · 업체 조합 없음 —
 *            세모가 최저가 공급사로 확정하고 «씨마켓 구매대행» 으로 남긴다. 씨마켓 직원 계정도
 *            여기다(2026-09-16) — 소속 회원의 카드·포인트로 결제한다.
 *
 * 카드·포인트는 **주문 등록과 같은 요청에서** 씨마켓이 승인한다. 거절되면 주문은 남지 않고
 * 세모가 보낸 사유(카드 거절·잔액 부족·연동 미설정)가 그대로 이 화면에 뜬다.
 */
export default function CheckoutView({
  viewerName,
  customerType,
  paysWithAffiliate,
  payerBlockedMessage,
}: CheckoutViewProps) {
  const router = useRouter()
  const isCompany = customerType === 'COMPANY'
  // 공급기업은 장바구니에 남은 조합 방식·고른 업체를 쓰지 않는다 — 세모가 결제할 최저가 조합으로 그린다.
  const { cartItems, result } = useCartCombination({ lowestOnly: isCompany })
  const shipTo = useSyncExternalStore(subscribeShipTo, getShipToSnapshot, getShipToServerSnapshot)
  const activeQuote = useSyncExternalStore(
    subscribeActiveQuote,
    getActiveQuoteSnapshot,
    getActiveQuoteServerSnapshot,
  )

  const [route, setRoute] = useState<OrderRoute>('SAFE')
  const [chosenMethod, setChosenMethod] = useState<PaymentMethod | null>(null)
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptionsState>({ status: 'idle' })
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null)
  const [cardPassword, setCardPassword] = useState('')
  const [isPlacing, setIsPlacing] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const orderKeyRef = useRef<string | null>(null)

  const lines = result.lines
  const n = result.supplierCount

  // 견적서는 지금 조합과 같고 유효기간 안일 때만 쓴다 — 그때 세모가 견적 단가로 주문을 세우므로 화면도
  // 견적 단가로 그린다. 조합이 다르면 견적번호를 보내지 않는다(보내면 화면과 다른 공급사·금액으로 결제된다).
  const quoteMatches = activeQuote
    ? quoteMatchesLines(activeQuote, lines.map(toOrderLine), { ignoreOffers: isCompany })
    : false
  const quoteUsable = activeQuote ? isQuoteValid(activeQuote) && quoteMatches : false
  const lockedPrices = new Map(
    quoteUsable && activeQuote ? activeQuote.lines.map(line => [line.itemId, line.unitPrice] as const) : [],
  )
  const unitPriceOf = (line: (typeof lines)[number]) => lockedPrices.get(line.product.id) ?? line.unitPrice

  const amounts = calculateCartAmounts(
    lines.map(line => ({ unitPrice: unitPriceOf(line), quantity: line.quantity })),
    { shipping: result.shipping },
  )

  // 직접 구매가 막히는 이유 — 안전결제 전용 업체가 섞였거나, 업체 실명이 없거나(미제공).
  const directBlockers = lines.filter(
    line => !line.offer.directPurchase || !line.offer.supplierId,
  )
  const directAvailable = !isCompany && lines.length > 0 && directBlockers.length === 0
  const effectiveRoute: OrderRoute = isCompany || (route === 'DIRECT' && !directAvailable) ? 'SAFE' : route

  // 고를 수 있는 결제수단은 고객 유형 × 경로가 정한다. 경로를 바꿔 지금 고른 수단이 사라지면 첫 번째로.
  const methods = allowedPaymentMethods(customerType, effectiveRoute)
  const paymentMethod: PaymentMethod =
    chosenMethod && methods.includes(chosenMethod) ? chosenMethod : methods[0]
  const prepaid = isPrepaid(paymentMethod)
  const summary = routeSummary(effectiveRoute, n, paymentMethod)

  // 카드·포인트를 고른 순간에만 결제창 재료를 읽는다 — 후불만 쓰는 기관에 씨마켓 연동 오류를
  // 보여 줄 이유가 없다. 한 번 읽으면 그 화면에서는 다시 읽지 않는다.
  // 결제 명의가 없으면(소속 회원이 없는 직원) 읽지 않는다 — 라우트가 403 을 줄 것을 알고 있다.
  const payBlocked = prepaid && payerBlockedMessage !== null
  const needsOptions = effectiveRoute === 'SAFE' && prepaid && !payBlocked
  const optionsLoading = needsOptions && paymentOptions.status === 'idle'
  useEffect(() => {
    if (!needsOptions || paymentOptions.status !== 'idle') return
    // 상태는 응답이 온 뒤에만 바꾼다(«불러오는 중» 은 idle 에서 파생). 개발 모드의 이중 실행은
    // 같은 값을 두 번 쓸 뿐이라 해가 없다.
    fetchPaymentOptions()
      .then(data => {
        setPaymentOptions({ status: 'ready', data })
        // 카드가 하나뿐이면 고르게 하지 않는다.
        if (data.cards.length === 1) setSelectedCardId(data.cards[0].id)
      })
      .catch(error => {
        if (error instanceof LoginRequiredError) {
          setNeedsLogin(true)
          setPaymentOptions({ status: 'error', message: error.message })
          return
        }
        setPaymentOptions({
          status: 'error',
          message: error instanceof Error ? error.message : '결제수단을 불러오지 못했습니다.',
        })
      })
  }, [needsOptions, paymentOptions.status])

  const cards = paymentOptions.status === 'ready' ? paymentOptions.data.cards : []
  const points = paymentOptions.status === 'ready' ? paymentOptions.data.points : null
  const selectedCard = cards.find(card => card.id === selectedCardId) ?? null
  const cardReady =
    paymentMethod !== 'CARD' ||
    (selectedCard !== null && (!selectedCard.requiresPassword || /^\d{6}$/.test(cardPassword)))
  const pointShortage = points ? Math.max(0, amounts.total - points.balance) : 0

  const setField = (field: keyof OrderShipTo) => (value: string) =>
    setShipTo({ ...shipTo, [field]: field === 'tel' ? value || null : value })

  const handleOrder = async () => {
    if (lines.length === 0 || isPlacing || !cardReady || payBlocked) return
    setOrderError(null)
    setNeedsLogin(false)
    setIsPlacing(true)
    orderKeyRef.current ??= newOrderKey()

    try {
      const order = await placeOrder({
        shipTo,
        items: lines.map(toOrderLine),
        clientOrderKey: orderKeyRef.current,
        route: effectiveRoute,
        paymentMethod,
        quoteNo: quoteUsable && activeQuote ? activeQuote.quoteNo : null,
        payment:
          paymentMethod === 'CARD' && selectedCard
            ? {
                cardId: selectedCard.id,
                ...(selectedCard.requiresPassword ? { cardPassword } : {}),
              }
            : null,
        shipping: result.shipping,
      })
      orderKeyRef.current = null
      setActiveQuote(null)
      router.push(`/shop/order-complete?orderNo=${encodeURIComponent(order.orderNo)}`)
    } catch (error) {
      setIsPlacing(false)
      if (error instanceof LoginRequiredError) {
        setNeedsLogin(true)
        return
      }
      // 확정된 거절(4xx: 카드 거절·잔액 부족·규칙 위반)만 새 주문 키로 간다 — 세모가 그 주문을 접었다
      // (같은 키는 «이미 취소된 주문 키» 로 거절된다). 시간 초과·연결 끊김·5xx 는 결제가 이미 됐거나
      // 진행 중일 수 있어 **같은 키를 유지**한다. 여기서 키를 버리면 다시 누를 때 새 주문이 서서 같은
      // 카드가 한 번 더 승인됐다(2026-09-16 검수).
      if (error instanceof OrderSubmitError && error.isDefinitive) {
        orderKeyRef.current = null
      }
      // 견적서가 만료됐거나 세모에 없으면(배포 전 몰 원장에서 받은 번호 등) 내려놓는다 — 들고 있으면
      // 다시 눌러도 같은 이유로 계속 막힌다.
      if (error instanceof OrderSubmitError && error.code === QUOTE_UNUSABLE_CODE) {
        setActiveQuote(null)
      }
      setOrderError(
        error instanceof OrderSubmitError
          ? error.message
          : '연결이 끊겨 결제 결과를 확인하지 못했습니다. 주문 내역에서 먼저 확인해 주세요. 없으면 다시 누르세요 — 같은 주문으로 이어집니다.',
      )
    }
  }

  const inputClass =
    'text-text placeholder:text-muted w-full rounded-xl bg-bg px-3 py-2.5 text-sm focus-visible:outline-primary focus-visible:outline-2'

  if (cartItems.length === 0 || lines.length === 0) {
    return (
      <main className="min-h-screen bg-white">
        <ShopNav showBack />
        <div className="container-shop py-16 text-center">
          <h1 className="text-text text-xl font-semibold">주문할 상품이 없습니다</h1>
          <p className="text-muted mt-2 text-sm">장바구니에서 주문할 품목을 선택해 주세요.</p>
          <Link
            href="/shop/cart"
            className="bg-primary hover:bg-primary-dark mt-6 inline-block rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors"
          >
            장바구니로
          </Link>
        </div>
      </main>
    )
  }

  const routeCards: { key: OrderRoute; title: string; who: string; steps: string[] }[] = [
    {
      key: 'SAFE',
      title: ORDER_ROUTE_LABEL.SAFE,
      who: `${TENANT.orgName}이 대금을 받아 공급사에 정산합니다. 담당자는 ${TENANT.orgName} 한 곳만 상대합니다.`,
      steps: ['발주', '공급사 납품', '검수', `${TENANT.orgName}에 결제`, `${TENANT.orgName} → 공급사 정산`],
    },
    {
      key: 'DIRECT',
      title: ORDER_ROUTE_LABEL.DIRECT,
      who: '공급사와 직접 계약합니다. 기존 거래처와 이어서 거래할 때 알맞습니다.',
      steps: ['발주', '공급사 납품', '검수', '공급사별 결제'],
    },
  ]

  const orderButtonLabel = isPlacing
    ? prepaid
      ? '결제하고 주문을 접수하는 중…'
      : '주문을 접수하는 중…'
    : effectiveRoute === 'DIRECT'
      ? `공급사 ${n}곳에 발주 확정`
      : paymentMethod === 'CARD'
        ? '카드로 결제하고 주문 확정'
        : paymentMethod === 'POINT'
          ? '포인트로 결제하고 주문 확정'
          : '안전결제(후불)로 주문 확정'

  return (
    <main className="min-h-screen bg-white">
      <ShopNav showBack />

      <div className="container-shop py-10 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-text text-xl font-semibold tracking-[-0.03rem]">주문 방법 선택</h1>
          {activeQuote && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                quoteUsable ? 'bg-highlight-soft text-highlight-strong' : 'bg-bg text-muted'
              }`}
            >
              <FileText size={13} />
              견적서 {activeQuote.quoteNo}
              {quoteUsable
                ? ` · ${formatDate(activeQuote.validUntil)}까지 잠금`
                : !quoteMatches
                  ? ' · 장바구니 구성이 달라 적용 안 됨'
                  : ' · 만료'}
            </span>
          )}
        </div>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            {/* ── 공급기업: 경로 선택 없음 · 씨마켓 구매대행 안내 ── */}
            {isCompany && (
              <section
                aria-label="거래 형태"
                className="border-primary bg-blue-tint rounded-2xl border p-5"
              >
                <p className="text-primary text-xs font-semibold">{DEAL_TYPE_LABEL.CMARKET_AGENCY}</p>
                <h2 className="text-text mt-1 text-base font-semibold">{ORDER_ROUTE_LABEL.SAFE}로 주문합니다</h2>
                <p className="text-muted mt-2 text-xs leading-5">
                  {paysWithAffiliate ? '직원' : '공급기업'} 계정의 주문은 {TENANT.orgName}이 최저가 공급사에게서 사서
                  판매하는 «{DEAL_TYPE_LABEL.CMARKET_AGENCY}»입니다. 계약·세금계산서 상대는{' '}
                  {TENANT.safePaymentCounterpart} 한 곳이고, 공급사는 {TENANT.orgName}이 정합니다(업체 선택 없음). 결제는
                  카드 또는 {TENANT.orgName} 포인트 선불이며 후불은 고를 수 없습니다.
                  {paysWithAffiliate && ' 카드·포인트는 소속 회원의 것으로 결제됩니다.'}
                </p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {[
                    ['계약 상대', summary.counterpart],
                    ['세금계산서', summary.invoice],
                    ['결제', '주문 시 카드 또는 포인트로 선불'],
                    ['문제 생기면', summary.support],
                  ].map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-muted">{label}</dt>
                      <dd className="text-text">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {/* ── 발주기관: 경로 카드 ── */}
            {!isCompany && (
              <div className="grid gap-4 md:grid-cols-2" role="radiogroup" aria-label="주문 방법">
                {routeCards.map(card => {
                  const active = effectiveRoute === card.key
                  const disabled = card.key === 'DIRECT' && !directAvailable
                  const detail = routeSummary(card.key, n, card.key === 'SAFE' ? paymentMethod : 'TAX_INVOICE')
                  return (
                    <button
                      key={card.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={disabled}
                      onClick={() => setRoute(card.key)}
                      className={`flex cursor-pointer flex-col gap-3 rounded-2xl border p-5 text-left transition-colors disabled:cursor-not-allowed ${
                        active ? 'border-primary bg-blue-tint' : 'border-border bg-white hover:bg-light-soft'
                      } ${disabled ? 'opacity-60' : ''}`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${
                            active ? 'border-primary' : 'border-border'
                          }`}
                        >
                          {active && <span className="bg-primary h-2 w-2 rounded-full" />}
                        </span>
                        <span className="text-text text-base font-semibold">{card.title}</span>
                      </span>
                      <span className="text-muted text-xs leading-5">{card.who}</span>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                        {[
                          ['계약 상대', detail.counterpart],
                          ['세금계산서', detail.invoice],
                          ['결제', detail.payment],
                          ['배송', detail.shipping],
                          ['문제 생기면', detail.support],
                        ].map(([label, value]) => (
                          <div key={label} className="contents">
                            <dt className="text-muted">{label}</dt>
                            <dd className="text-text">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <span className="text-muted flex flex-wrap items-center gap-1 text-[11px]">
                        {card.steps.map((step, index) => (
                          <span key={step} className="contents">
                            {index > 0 && <span aria-hidden="true">→</span>}
                            <span className="bg-white rounded-md px-1.5 py-0.5">{step}</span>
                          </span>
                        ))}
                      </span>
                      {disabled && (
                        <span className="text-[#B3261E] text-[11px] leading-4">
                          {directBlockers.some(line => !line.offer.supplierId)
                            ? '공급사 실명이 없는 품목이 있어 직접 계약할 수 없습니다.'
                            : `안전결제 전용 업체가 ${directBlockers.length}품목에 있습니다. 장바구니에서 업체를 바꾸면 열립니다.`}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── 비교표 (발주기관만 — 공급기업에겐 비교할 다른 경로가 없다) ── */}
            {!isCompany && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-muted text-left text-xs">
                      <th className="w-32 py-2 font-medium" />
                      <th className="py-2 font-medium">{ORDER_ROUTE_LABEL.SAFE}</th>
                      <th className="py-2 font-medium">{ORDER_ROUTE_LABEL.DIRECT}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bg">
                    {[
                      [
                        '상품·배송 합계',
                        `${won(amounts.supply + amounts.shipping)}원`,
                        `${won(amounts.supply + amounts.shipping)}원 · 두 경로 같은 가격`,
                      ],
                      ['계약 상대', `${TENANT.orgName} 1곳`, `공급사 ${n}곳`],
                      ['세금계산서', '1장', `${n}장`],
                      ['결제 횟수', '1회', `${n}회`],
                      ['결제수단', '세금계산서 후불 · 카드 · 포인트', '세금계산서 후불'],
                      ['교환·반품 창구', TENANT.orgName, '각 공급사'],
                    ].map(([label, safe, direct]) => (
                      <tr key={label}>
                        <td className="text-muted py-2.5 pr-3">{label}</td>
                        <td className={`py-2.5 pr-3 ${effectiveRoute === 'SAFE' ? 'text-text font-semibold' : 'text-muted'}`}>
                          {safe}
                        </td>
                        <td className={`py-2.5 ${effectiveRoute === 'DIRECT' ? 'text-text font-semibold' : 'text-muted'}`}>
                          {direct}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── 결제 수단 (안전결제) ── */}
            {effectiveRoute === 'SAFE' && (
              <div className="mt-6 rounded-2xl bg-light-soft p-5">
                <p className="text-text text-sm font-semibold">결제 수단</p>
                <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="결제 수단">
                  {methods.map(method => (
                    <button
                      key={method}
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === method}
                      onClick={() => setChosenMethod(method)}
                      className={`cursor-pointer rounded-control border px-4 py-2.5 text-sm transition-colors ${
                        paymentMethod === method
                          ? 'border-primary bg-blue-tint-2 text-primary font-semibold'
                          : 'border-border bg-white text-text hover:bg-bg'
                      }`}
                    >
                      {PAYMENT_METHOD_LABEL[method]}
                      {method === 'TAX_INVOICE' && <span className="text-muted ml-1 text-xs">· 납품 후 30일</span>}
                    </button>
                  ))}
                </div>

                {/* 결제 명의 없음 — 카드·포인트를 읽지 않고 사유만 */}
                {payBlocked && (
                  <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-4 py-3 text-xs leading-5 text-[#B3261E]">
                    {payerBlockedMessage}
                  </p>
                )}

                {paymentMethod === 'TAX_INVOICE' && (
                  <p className="text-muted mt-3 text-xs leading-5">
                    지금 결제되지 않습니다. 납품 검수 후 {TENANT.orgName}이 청구서와 세금계산서를 발행합니다.
                    {!isCompany && ` 직접 구매를 고르면 카드·포인트 결제창은 사라지고 공급사 ${n}곳의 계좌가 안내됩니다.`}
                  </p>
                )}

                {/* 카드 — 씨마켓 결제관리에 저장된 카드 중 하나 */}
                {paymentMethod === 'CARD' && !payBlocked && (
                  <div className="mt-4" aria-label="결제 카드">
                    <p className="text-text text-xs font-semibold">
                      {paysWithAffiliate && '소속 회원의 '}
                      {TENANT.orgName} 결제관리에 저장된 카드
                    </p>
                    {optionsLoading && (
                      <p className="text-muted mt-2 text-xs">저장된 카드를 불러오는 중…</p>
                    )}
                    {paymentOptions.status === 'error' && (
                      <p role="alert" className="mt-2 rounded-xl bg-[#FDECEC] px-4 py-3 text-xs leading-5 text-[#B3261E]">
                        {paymentOptions.message}
                      </p>
                    )}
                    {paymentOptions.status === 'ready' && cards.length === 0 && (
                      <p className="text-muted mt-2 text-xs leading-5">
                        저장된 카드가 없습니다. {TENANT.orgName} 결제관리에서 카드를 등록한 뒤 다시 시도하거나, 다른
                        결제수단을 골라 주세요.
                      </p>
                    )}
                    {cards.length > 0 && (
                      <div className="mt-2 space-y-2" role="radiogroup" aria-label="저장된 카드">
                        {cards.map(card => {
                          const active = selectedCardId === card.id
                          return (
                            <button
                              key={card.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => {
                                setSelectedCardId(card.id)
                                setCardPassword('')
                              }}
                              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                                active ? 'border-primary bg-blue-tint-2' : 'border-border bg-white hover:bg-bg'
                              }`}
                            >
                              <CreditCard size={16} className={active ? 'text-primary' : 'text-muted'} aria-hidden="true" />
                              <span className="min-w-0 flex-1">
                                <span className="text-text block font-medium">{card.cardNickname}</span>
                                <span className="text-muted block text-xs tabular-nums">{card.maskedCardNumber}</span>
                              </span>
                              {card.requiresPassword && (
                                <span className="text-muted shrink-0 text-[11px]">비밀번호 확인</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {selectedCard?.requiresPassword && (
                      <div className="mt-3">
                        <label htmlFor="card-password" className="text-text text-xs font-semibold">
                          결제 확인 비밀번호 <span className="text-muted font-normal">(숫자 6자리 · 이 카드에 설정된 값)</span>
                        </label>
                        <input
                          id="card-password"
                          type="password"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={6}
                          value={cardPassword}
                          onChange={event => setCardPassword(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="••••••"
                          className={`${inputClass} mt-1.5 w-40 tracking-[0.3em]`}
                        />
                      </div>
                    )}
                    <p className="text-muted mt-3 text-xs leading-5">
                      주문 확정과 동시에 {TENANT.orgName} 결제창(빌키)으로 승인됩니다. 거절되면 주문은 남지 않습니다.
                    </p>
                  </div>
                )}

                {/* 포인트 — 잔액과 결제 후 잔액 */}
                {paymentMethod === 'POINT' && !payBlocked && (
                  <div className="mt-4" aria-label="포인트 잔액">
                    {optionsLoading && (
                      <p className="text-muted text-xs">포인트 잔액을 불러오는 중…</p>
                    )}
                    {paymentOptions.status === 'error' && (
                      <p role="alert" className="rounded-xl bg-[#FDECEC] px-4 py-3 text-xs leading-5 text-[#B3261E]">
                        {paymentOptions.message}
                      </p>
                    )}
                    {points && (
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                        <dt className="text-muted">{paysWithAffiliate ? '소속 회원 포인트' : '사용 가능 포인트'}</dt>
                        <dd className="text-text font-semibold tabular-nums">{won(points.balance)}P</dd>
                        <dt className="text-muted">이번 결제</dt>
                        <dd className="text-text tabular-nums">−{won(amounts.total)}P</dd>
                        <dt className="text-muted">결제 후 잔액</dt>
                        <dd className={`tabular-nums ${pointShortage > 0 ? 'text-[#B3261E] font-semibold' : 'text-text'}`}>
                          {pointShortage > 0 ? `${won(pointShortage)}P 부족` : `${won(points.balance - amounts.total)}P`}
                        </dd>
                      </dl>
                    )}
                    <p className="text-muted mt-3 text-xs leading-5">
                      보너스 → 충전 → 판매대금 순으로 차감됩니다. 취소하면 같은 순서로 돌아옵니다.
                    </p>
                  </div>
                )}
              </div>
            )}
            {effectiveRoute === 'DIRECT' && (
              <div className="mt-6 rounded-2xl bg-light-soft p-5">
                <p className="text-text text-sm font-semibold">결제 · {PAYMENT_METHOD_LABEL.TAX_INVOICE}</p>
                <p className="text-muted mt-2 text-xs leading-5">
                  납품 검수 후 공급사 {n}곳이 각각 세금계산서를 발행하고, 계좌로 후불 결제합니다.
                  카드·포인트 결제는 {TENANT.orgName}이 받는 안전결제에서만 고를 수 있습니다.
                </p>
              </div>
            )}

            {/* ── 배송지 ── */}
            <div className="mt-6 rounded-2xl bg-light-soft p-5">
              <p className="text-text text-sm font-semibold">배송지</p>
              <p className="text-muted mt-1 text-xs">마지막에 적은 주소가 미리 채워집니다.</p>
              <div className="mt-3 space-y-2.5">
                <input
                  value={shipTo.name}
                  onChange={event => setField('name')(event.target.value)}
                  placeholder="받는 곳 (기관·부서명)"
                  autoComplete="organization"
                  className={inputClass}
                />
                <div className="flex gap-2.5">
                  <input
                    value={shipTo.zip}
                    onChange={event => setField('zip')(event.target.value.replace(/\D/g, '').slice(0, 5))}
                    placeholder="우편번호 5자리"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    className={`${inputClass} w-36`}
                  />
                  <input
                    value={shipTo.tel ?? ''}
                    onChange={event => setField('tel')(event.target.value)}
                    placeholder="연락처 (선택)"
                    inputMode="tel"
                    autoComplete="tel"
                    className={inputClass}
                  />
                </div>
                <input
                  value={shipTo.address}
                  onChange={event => setField('address')(event.target.value)}
                  placeholder="주소"
                  autoComplete="street-address"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* ── 요약 ── */}
          <aside className="rounded-2xl bg-light-soft p-6 lg:sticky lg:top-24">
            <p className="text-primary text-xs font-semibold">
              {ORDER_ROUTE_LABEL[effectiveRoute]} 주문
              {isCompany && ` · ${DEAL_TYPE_LABEL.CMARKET_AGENCY}`}
            </p>
            {viewerName && <p className="text-muted mt-1 text-xs">주문자 {viewerName}</p>}

            <ol className="divide-bg mt-4 divide-y divide-dashed rounded-xl bg-white px-4">
              {lines.map(line => (
                <li key={line.product.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-2.5 text-xs">
                  <div className="min-w-0">
                    <p className="text-text truncate font-medium">{line.product.name}</p>
                    <p className="text-muted mt-0.5 truncate">
                      {!isCompany && line.offer.supplierName ? `${line.offer.supplierName} · ` : ''}
                      {won(unitPriceOf(line))}원 × {line.quantity}
                    </p>
                  </div>
                  <strong className="text-text self-end font-semibold tabular-nums">
                    {won(unitPriceOf(line) * line.quantity)}원
                  </strong>
                </li>
              ))}
            </ol>

            <dl className="mt-4 space-y-2 text-sm">
              {[
                ['상품 금액', `${won(amounts.supply)}원`],
                ['배송비', amounts.shipping > 0 ? `${won(amounts.shipping)}원` : '무료'],
                ['부가세', `${won(amounts.vat)}원`],
                ['결제수단', PAYMENT_METHOD_LABEL[paymentMethod]],
                [
                  '계약 상대',
                  effectiveRoute === 'SAFE'
                    ? TENANT.safePaymentCounterpart
                    : result.groups.map(group => group.label).join(', '),
                ],
                ['계산서', summary.invoice],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <dt className="text-muted shrink-0">{label}</dt>
                  <dd className="text-text text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="border-bg mt-4 flex items-end justify-between border-t border-dashed pt-4">
              <span className="text-text font-semibold">{prepaid ? '결제 금액' : '결제 예정'}</span>
              <strong className="text-primary text-2xl font-semibold tabular-nums">{won(amounts.total)}원</strong>
            </div>

            {needsLogin && (
              <p className="mt-4 rounded-xl bg-highlight-soft px-4 py-3 text-sm leading-6 text-highlight-strong">
                주문하려면 씨마켓 계정으로 로그인해 주세요.{' '}
                <Link href="/login?next=/shop/checkout" className="font-semibold underline underline-offset-2">
                  로그인하러 가기
                </Link>
              </p>
            )}
            {orderError && (
              <p role="alert" className="mt-4 rounded-xl bg-[#FDECEC] px-4 py-3 text-sm leading-5 text-[#B3261E]">
                {orderError}
              </p>
            )}

            <button
              type="button"
              onClick={handleOrder}
              disabled={isPlacing || !cardReady || payBlocked}
              className="bg-primary hover:bg-primary-dark mt-5 w-full cursor-pointer rounded-full px-6 py-4 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {orderButtonLabel}
            </button>
            {paymentMethod === 'CARD' && !cardReady && !isPlacing && !payBlocked && (
              <p className="text-muted mt-2 text-center text-xs">
                {selectedCard ? '결제 확인 비밀번호 6자리를 입력해 주세요.' : '결제할 카드를 골라 주세요.'}
              </p>
            )}
            <Link
              href="/shop/cart"
              className="text-muted-strong hover:bg-bg mt-2 block w-full rounded-full px-6 py-3 text-center text-sm font-semibold transition-colors"
            >
              장바구니로
            </Link>
            <p className="text-muted mt-3 text-xs leading-5">
              {prepaid
                ? `주문 확정과 동시에 ${TENANT.orgName}에 결제됩니다. 공급사가 수락하기 전에는 취소할 수 있고, 취소하면 전액 되돌아옵니다.`
                : '후불이므로 지금 결제되지 않습니다. 납품 검수 후 청구서가 발행됩니다.'}
            </p>
          </aside>
        </div>
      </div>
    </main>
  )
}
