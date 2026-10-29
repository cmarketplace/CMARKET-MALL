'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Link2, Loader2, ShoppingCart } from 'lucide-react'

import { useShop } from '@/app/providers/ShopProvider'
import type { Product } from '@/components/Shop/product.data'
import { quoteLinkPrice } from '@/config/link-errand'
import { LINK_SHOPS } from '@/lib/link-shops'
import { looksLikePage, preparePastedPage, type PastedPagePayload } from '@/lib/paste-page'
import {
  PRICE_METHOD_LABEL,
  readAtLabel,
  type LinkItemCustomerFill,
  type LinkItemPreview,
} from '@/lib/link-items-types'

import { Field, inputClass } from '../../Requests/RequestKit'

const won = (n: number) => n.toLocaleString('ko-KR')
const digits = (value: string) => value.replace(/\D/g, '').slice(0, 10)

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'preview'; preview: LinkItemPreview }
  | { kind: 'error'; message: string }

/**
 * 링크로 바로 사기 — URL(또는 쇼핑몰 앱 «공유하기» 글)을 붙여 넣으면 세모가 사진·제품명·규격·판매가를 읽고,
 * 판매 단가(인터넷 판매가 + 배송비 + 심부름값 2,000원을 수량으로 나눈 값, 카드수수료 별도)를 정해 바로 장바구니에 담는다.
 * 주문은 씨마켓 구매대행으로 선다(장바구니 → 결제 그대로). 몰에 같은 물품이 더 싸게 있으면 그쪽을 먼저 보여 준다.
 *
 * 쿠팡·G마켓처럼 페이지를 막는 쇼핑몰은 제품명(필요하면 가격)만 적어 다시 불러온다. 손님이 적은 가격은
 * «직접 적은 가격» 으로 표시되고 씨마켓이 구매 전에 확인한다.
 */
export default function LinkBuyPanel({ initialText, initialQuantity }: { initialText: string; initialQuantity: string }) {
  const { addToCart } = useShop()
  const [text, setText] = useState(initialText)
  // 상품 페이지 통째(Ctrl+A → Ctrl+C → Ctrl+V) — 막힌 쇼핑몰도 손님 브라우저가 연 내용으로 읽는다
  const [pasted, setPasted] = useState<PastedPagePayload | null>(null)
  const [quantity, setQuantity] = useState(initialQuantity || '1')
  const [fill, setFill] = useState<{ name: string; price: string; shipping: string }>({ name: '', price: '', shipping: '' })
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<{ name: string; quantity: number } | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastKey = useRef<string>('')
  // 미뤄 둔 불러오기가 «그때의» 수량·보완 값이 아니라 지금 값을 쓰게(붙여 넣고 바로 수량을 바꾸는 경우)
  const latest = useRef<{ quantity: number; fill: typeof fill; pasted: PastedPagePayload | null }>({ quantity: 1, fill, pasted: null })

  const qty = Math.max(1, Number(quantity) || 1)
  useEffect(() => {
    latest.current = { quantity: qty, fill, pasted }
  })

  const customer = (): LinkItemCustomerFill | undefined => {
    const { fill } = latest.current
    const out: LinkItemCustomerFill = {}
    if (fill.name.trim()) out.name = fill.name.trim()
    if (Number(fill.price) > 0) out.price = Number(fill.price)
    if (fill.shipping !== '') out.shipping = Number(fill.shipping)
    return Object.keys(out).length > 0 ? out : undefined
  }

  // 붙여 넣은 직후에는 아직 상태가 갱신 전이라, 방금 받은 글을 직접 넘긴다(`next`).
  const requestBody = (target: string, page: PastedPagePayload | null, quantityValue: number) =>
    page
      ? { text: target, quantity: quantityValue, customer: customer(), page: { html: page.html, text: page.text } }
      : { text: target, quantity: quantityValue, customer: customer() }

  const load = async (force = false, next?: string, nextPage?: PastedPagePayload | null) => {
    const target = next ?? text
    const page = nextPage === undefined ? latest.current.pasted : nextPage
    if (!page && !/https?:\/\//i.test(target)) {
      setPhase({ kind: 'idle' })
      return
    }
    const body = requestBody(page ? '' : target, page, latest.current.quantity)
    const key = JSON.stringify(body)
    if (!force && key === lastKey.current) return
    lastKey.current = key
    setPhase({ kind: 'loading' })
    setAdded(null)
    setAddError(null)
    try {
      const response = await fetch('/api/shop/link-items/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as { preview?: LinkItemPreview; message?: string } | null
      if (!response.ok || !payload?.preview) {
        setPhase({ kind: 'error', message: payload?.message ?? '링크를 읽지 못했습니다. 잠시 후 다시 시도해 주세요.' })
        return
      }
      setPhase({ kind: 'preview', preview: payload.preview })
    } catch {
      setPhase({ kind: 'error', message: '연결이 끊겼습니다. 다시 불러와 주세요.' })
    }
  }

  // 링크를 들고 들어온 경우(랜딩에서 붙여 넣고 넘어온 경우) 바로 한 번 불러온다.
  useEffect(() => {
    if (!initialText) return
    const handle = setTimeout(() => void load(), 0)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 붙여넣기 — 링크(또는 공유 글)면 지금처럼 주소로, 페이지 통째면 정리해서(스크립트·스타일 제거, 크기 상한) 그 내용으로 읽는다.
   */
  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = event.clipboardData.getData('text/html')
    const plain = event.clipboardData.getData('text/plain')
    if (!looksLikePage(html, plain)) return
    event.preventDefault()
    const prepared = preparePastedPage(html, plain)
    if ('error' in prepared) {
      setPhase({ kind: 'error', message: prepared.error })
      return
    }
    if (timer.current) clearTimeout(timer.current)
    setPasted(prepared)
    setText('')
    void load(true, '', prepared)
  }

  const clearPasted = () => {
    setPasted(null)
    setPhase({ kind: 'idle' })
    lastKey.current = ''
  }

  const onTextChange = (value: string) => {
    if (pasted) setPasted(null)
    setText(value)
    if (timer.current) clearTimeout(timer.current)
    if (!/https?:\/\//i.test(value)) return
    timer.current = setTimeout(() => void load(false, value), 600)
  }

  /** 옵션 하나를 고르면 그 옵션 주소로 다시 읽는다 */
  const pickOption = (url: string) => {
    if (timer.current) clearTimeout(timer.current)
    setPasted(null)
    setText(url)
    void load(true, url, null)
  }

  const add = async () => {
    setAdding(true)
    setAddError(null)
    try {
      const response = await fetch('/api/shop/link-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody(pasted ? '' : text, pasted, qty)),
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as { product?: Product; offerId?: string; message?: string } | null
      if (response.status === 401) {
        setAddError('로그인이 필요합니다. 다시 로그인한 뒤 담아 주세요.')
        return
      }
      if (!response.ok || !payload?.product) {
        setAddError(payload?.message ?? '담지 못했습니다. 잠시 후 다시 시도해 주세요.')
        return
      }
      addToCart(payload.product, qty, payload.offerId ?? null)
      setAdded({ name: payload.product.name, quantity: qty })
    } catch {
      setAddError('연결이 끊겼습니다. 다시 눌러 주세요.')
    } finally {
      setAdding(false)
    }
  }

  const preview = phase.kind === 'preview' ? phase.preview : null
  const product = preview?.product ?? null
  // 수량을 바꾸면 다시 부르지 않고 같은 규칙으로 바로 다시 센다(세모가 주문 때 쓰는 식과 같다).
  const read = preview?.price ?? null
  const quote = read ? quoteLinkPrice({ linkPrice: read.linkPrice, shipping: read.shipping, quantity: qty, includeVat: read.includeVat }) : null
  const price = read && quote ? { ...read, ...quote } : read
  const needsName = Boolean(preview?.blockers.includes('name'))
  const needsPrice = Boolean(preview?.blockers.includes('price'))
  const sellerMissing = Boolean(preview?.blockers.includes('seller'))
  const notProduct = Boolean(preview?.blockers.includes('not_product'))
  // 옵션이 여럿인 주소(나비엠알오 묶음) — 어느 옵션인지 골라야 가격이 정해진다
  const needsOption = Boolean(preview?.blockers.includes('option'))
  const options = product?.options ?? []
  const canAdd = Boolean(preview && price && !needsName && !needsPrice && !needsOption && !sellerMissing && !notProduct)
  const cheaper = preview?.cheaperInMall ?? null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="상품 링크" hint="쇼핑몰 앱 «공유하기» 로 복사한 글 그대로 붙여 넣어도 됩니다">
          <span className="relative block">
            <Link2 size={16} aria-hidden="true" className="text-muted pointer-events-none absolute top-3.5 left-3" />
            <textarea
              value={text}
              onChange={event => onTextChange(event.target.value)}
              onPaste={onPaste}
              rows={2}
              placeholder={pasted ? '' : 'https://www.11st.co.kr/products/... 또는 상품 페이지 전체를 붙여 넣기'}
              className={`${inputClass} pl-9`}
            />
            {pasted && (
              <span className="bg-blue-tint text-muted-strong absolute inset-x-9 top-2 flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs">
                <span className="truncate">
                  붙여 넣은 상품 페이지 · 글 {won(pasted.chars)}자 — 이 내용으로 읽어요
                </span>
                <button type="button" onClick={clearPasted} className="text-primary shrink-0 font-semibold hover:underline">
                  지우기
                </button>
              </span>
            )}
          </span>
        </Field>
        <Field label="수량">
          <input
            value={quantity}
            onChange={event => setQuantity(digits(event.target.value))}
            inputMode="numeric"
            className={`${inputClass} text-right tabular-nums`}
          />
        </Field>
      </div>
      <p className="text-muted -mt-3 text-xs leading-5">
        읽을 수 있는 곳: {LINK_SHOPS.map(entry => entry.name).join(' · ')} — 사진·제품명·규격·판매가를 읽어 세모 물품으로 등록하고 바로 살 수 있게 합니다
        <br />
        <strong className="text-muted-strong font-semibold">열리지 않는 쇼핑몰은 상품 페이지에서 Ctrl+A, Ctrl+C 한 뒤 여기에 붙여 넣으세요</strong>
        (맥은 ⌘A, ⌘C · 설치 없이 지금 보고 있는 페이지 내용으로 읽어요)
      </p>

      {phase.kind === 'loading' && (
        <p className="bg-light-soft text-muted flex items-center gap-2 rounded-xl p-4 text-sm" aria-live="polite">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> 쇼핑몰에서 상품 정보를 읽는 중…
        </p>
      )}
      {phase.kind === 'error' && (
        <p role="alert" className="rounded-xl bg-[#FDECEC] p-4 text-sm text-[#B3261E]">
          {phase.message}
        </p>
      )}

      {preview && product && (
        <div className="space-y-4" aria-live="polite">
          {cheaper && (
            <div className="bg-blue-tint rounded-xl p-4">
              <p className="text-text text-sm font-semibold">세모네모에 같은 물품이 더 싸게 있어요</p>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <Link href={`/shop/${cheaper.itemId}`} className="text-primary min-w-0 truncate font-semibold hover:underline">
                  {cheaper.name}
                  {cheaper.spec ? <span className="text-muted font-normal"> · {cheaper.spec}</span> : null}
                </Link>
                <span className="text-text shrink-0 tabular-nums font-semibold">
                  {won(cheaper.price)}원<span className="text-muted text-xs font-normal"> (부가세 별도)</span>
                </span>
              </div>
              <p className="text-muted mt-1 text-xs">같은 제품이 맞으면 이쪽이 더 싸고 빨리 옵니다.</p>
            </div>
          )}

          <div className="border-border rounded-xl border p-4">
            <div className="flex gap-4">
              <div className="bg-light-soft h-24 w-24 shrink-0 overflow-hidden rounded-media">
                {product.imageUrl && (
                  // 쇼핑몰 원본 사진 — 담으면 세모 저장소 사본으로 바뀐다. next/image 원격 목록에 넣지 않으려고 img 를 쓴다.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    // 쇼핑몰 CDN 이 바깥 표시를 막으면 깨진 그림 대신 빈 칸(담을 때 세모가 사본을 다시 받아 본다)
                    onError={event => {
                      event.currentTarget.style.visibility = 'hidden'
                    }}
                    className="h-full w-full bg-white object-contain"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="bg-blue-tint-2 text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold">{product.shopName}</span>
                {product.name ? (
                  <p className="text-text mt-1.5 line-clamp-2 font-semibold">{product.name}</p>
                ) : (
                  <p className="text-text mt-1.5 text-sm font-semibold">
                    {product.shopName}가 서버 접속을 막아 읽지 못했어요 — 상품 페이지에서 Ctrl+A, Ctrl+C 한 뒤 위 칸에 붙여 넣으면 바로
                    읽어요(또는 제품명만 적어 주세요)
                  </p>
                )}
                <p className="text-muted mt-1 text-xs">
                  {[product.brand, product.specText].filter(Boolean).join(' · ') || '규격은 제품명에서 찾지 못했어요'}
                </p>
              </div>
            </div>

            {needsOption && options.length > 0 && (
              <div className="mt-4">
                <p className="text-text text-sm font-semibold">옵션이 {won(options.length)}개 있어요 — 살 옵션을 골라 주세요</p>
                <div className="mt-2 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
                  {options.map(option => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => pickOption(option.url)}
                      className="border-border hover:border-primary rounded-lg border px-3 py-2 text-left text-sm transition-colors"
                    >
                      <span className="text-text block font-semibold">{option.label}</span>
                      <span className="text-muted block text-xs tabular-nums">
                        {option.code}
                        {option.price != null ? ` · ${won(option.price)}원(부가세 포함)` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(needsName || needsPrice) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_9rem_8rem_auto] sm:items-end">
                <Field label="제품명">
                  <input
                    value={fill.name}
                    onChange={event => setFill({ ...fill, name: event.target.value.slice(0, 150) })}
                    placeholder="더블에이 A4 복사용지 80g 2500매"
                    className={inputClass}
                  />
                </Field>
                <Field label="쇼핑몰 판매가" hint="원">
                  <input
                    value={fill.price}
                    onChange={event => setFill({ ...fill, price: digits(event.target.value) })}
                    inputMode="numeric"
                    className={`${inputClass} text-right tabular-nums`}
                  />
                </Field>
                <Field label="배송비" hint="원 · 무료면 0">
                  <input
                    value={fill.shipping}
                    onChange={event => setFill({ ...fill, shipping: digits(event.target.value) })}
                    inputMode="numeric"
                    className={`${inputClass} text-right tabular-nums`}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => void load(true)}
                  className="bg-text rounded-control px-4 py-2.5 text-sm font-semibold text-white"
                >
                  다시 불러오기
                </button>
              </div>
            )}

            {price && (
              <div className="bg-light-soft mt-4 rounded-xl p-4">
                <p className="text-text text-lg font-semibold tabular-nums">
                  단가 {won(price.unitPrice)}원 × {won(price.quantity)}개 = {won(price.lineTotal)}원
                  <span className="text-muted ml-1 text-xs font-normal">{price.includeVat ? '(부가세 포함)' : '(부가세 별도)'}</span>
                </p>
                <ul className="text-muted mt-2 space-y-0.5 text-xs leading-5">
                  <li>
                    인터넷 판매가 <strong className="text-text tabular-nums">{won(price.linkPrice)}원</strong>
                    {' '}({product.shopName}
                    {price.priceMethod === 'pasted'
                      ? ` · 손님이 붙여 넣은 페이지 기준${price.readAt ? ` ${readAtLabel(price.readAt)}` : ''}`
                      : `${price.readAt ? ` · ${readAtLabel(price.readAt)} 기준` : ''}${price.priceMethod ? ` · ${PRICE_METHOD_LABEL[price.priceMethod] ?? '읽은 값'}` : ''}`}
                    )
                  </li>
                  {price.shipping > 0 && <li>+ 배송비 {won(price.shipping)}원(수량으로 나눔)</li>}
                  <li>
                    + 대행 비용(심부름값) {won(price.errandFee)}원 ÷ {won(price.quantity)}개
                  </li>
                  <li>
                    = 단가 {won(price.unitInclusive)}원(부가세 포함)
                    {!price.includeVat && ` · 공급가 ${won(price.unitPrice)}원`}
                  </li>
                  <li>카드로 결제하면 카드수수료가 별도로 붙습니다 · 수량이 많을수록 단가가 내려갑니다</li>
                </ul>
                {price.priceMethod === 'customer' && (
                  <p className="mt-2 rounded-lg bg-blue-tint px-3 py-2 text-xs leading-5 text-muted-strong">
                    직접 적은 가격이에요 — 씨마켓이 구매 전에 쇼핑몰 실제 가격을 확인하고, 다르면 주문 전에 연락드립니다.
                  </p>
                )}
                {price.priceMethod === 'pasted' && (
                  <p className="mt-2 rounded-lg bg-blue-tint px-3 py-2 text-xs leading-5 text-muted-strong">
                    붙여 넣은 페이지에서 읽은 가격이에요(쿠폰·카드할인·멤버십가는 빼고 누구나 사는 판매가). 씨마켓이 구매 전에 쇼핑몰
                    실제 가격을 확인하고, 다르면 주문 전에 연락드립니다.
                  </p>
                )}
              </div>
            )}

            {sellerMissing && (
              <p className="mt-3 rounded-lg bg-blue-tint px-3 py-2 text-xs leading-5 text-muted-strong">
                아직 이 몰에서 바로 살 수 없어요(판매 준비 중). 아래 «담당자에게 맡기기» 로 요청해 주세요.
              </p>
            )}
            {notProduct && (
              <p className="mt-3 rounded-lg bg-blue-tint px-3 py-2 text-xs leading-5 text-muted-strong">물품으로 볼 수 없는 이름이에요. 제품명을 조금 더 자세히 적어 주세요.</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!canAdd || adding}
                onClick={() => void add()}
                className="bg-primary hover:bg-primary-dark inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-40"
              >
                {adding ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ShoppingCart size={16} aria-hidden="true" />}
                장바구니 담기
              </button>
              {added && (
                <span className="text-text inline-flex items-center gap-2 text-sm">
                  <Check size={16} className="text-primary" aria-hidden="true" />
                  {added.name.slice(0, 30)} {won(added.quantity)}개를 담았어요
                  <Link href="/shop/cart" className="text-primary font-semibold hover:underline">
                    장바구니로
                  </Link>
                </span>
              )}
              {addError && (
                <span role="alert" className="text-sm text-[#B3261E]">
                  {addError}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
