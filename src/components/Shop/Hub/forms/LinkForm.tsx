'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Link2, Loader2 } from 'lucide-react'

import type { Product } from '@/components/Shop/product.data'
import { extractUrl, LINK_SHOPS, shopOf } from '@/lib/link-shops'
import type { LinkPreview } from '@/lib/link-preview'

import { Field, inputClass, RequestFormFrame, RequestReceived, useContactDraft, useRequestSubmit } from '../../Requests/RequestKit'

const won = (n: number) => n.toLocaleString('ko-KR')

interface PreviewState {
  status: 'idle' | 'loading' | 'done'
  url: string | null
  preview: LinkPreview | null
  matches: Product[]
}

const IDLE: PreviewState = { status: 'idle', url: null, preview: null, matches: [] }

/**
 * 링크로 사기 — 인터넷에서 본 상품 링크를 붙여 넣으면 같은 제품으로 견적을 받는다(요청 SOURCING, refKey `link`).
 *
 * 붙여 넣는 순간 미리보기(제목·이미지·링크에 보이는 가격)를 불러오고, 몰에 비슷한 상품이 이미 있으면
 * 그 자리에서 보여 준다 — 견적을 기다리지 않고 바로 살 수 있으면 그게 제일 빠르다.
 * 미리보기는 못 불러와도 괜찮다(쿠팡·네이버는 자주 막는다). 링크만으로 접수된다.
 */
export default function LinkForm({
  today,
  initialUrl,
  initialQuantity,
  stub,
}: {
  today: string
  initialUrl: string
  initialQuantity: string
  stub: boolean
}) {
  const [linkText, setLinkText] = useState(initialUrl)
  const [seenPrice, setSeenPrice] = useState('')
  const [priceTouched, setPriceTouched] = useState(false)
  const [quantity, setQuantity] = useState(initialQuantity)
  const [neededBy, setNeededBy] = useState('')
  const [allowAlternative, setAllowAlternative] = useState(true)
  const [address, setAddress] = useState('')
  const [memo, setMemo] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [state, setState] = useState<PreviewState>(IDLE)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { contact, set } = useContactDraft()
  const { submit, busy, error, needsLogin, created, reset } = useRequestSubmit()

  const url = extractUrl(linkText)
  const shop = url ? shopOf(url) : null

  const loadPreview = async (target: string) => {
    setState({ status: 'loading', url: target, preview: null, matches: [] })
    try {
      const response = await fetch(`/api/shop/link-preview?url=${encodeURIComponent(target)}`, { cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as { preview?: LinkPreview | null; matches?: Product[] } | null
      const preview = payload?.preview ?? null
      setState({ status: 'done', url: target, preview, matches: payload?.matches ?? [] })
      if (preview?.price && !priceTouched) setSeenPrice(String(preview.price))
    } catch {
      setState({ status: 'done', url: target, preview: null, matches: [] })
    }
  }

  // 쿼리로 링크를 들고 들어온 경우(랜딩에서 붙여 넣고 넘어온 경우) 한 번 미리보기를 연다.
  useEffect(() => {
    const target = extractUrl(initialUrl)
    if (!target) return
    const handle = setTimeout(() => {
      void loadPreview(target)
    }, 0)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onLinkChange = (value: string) => {
    setLinkText(value)
    if (timer.current) clearTimeout(timer.current)
    const target = extractUrl(value)
    if (!target) {
      setState(IDLE)
      return
    }
    if (target === state.url) return
    timer.current = setTimeout(() => void loadPreview(target), 500)
  }

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!url) return setFormError('상품 링크를 붙여 넣어 주세요.')
    if (!(Number(quantity) > 0)) return setFormError('필요한 수량을 적어 주세요.')
    if (!address.trim()) return setFormError('받을 주소(지역)를 적어 주세요.')

    const title = state.preview?.title ?? null
    const ok = await submit(contact, [
      {
        type: 'SOURCING',
        refKey: 'link',
        title: `링크 구매 · ${(title ?? shop?.name ?? '인터넷 상품').slice(0, 60)}`,
        quantity: Number(quantity),
        details: [
          { label: '상품 링크', value: url },
          { label: '쇼핑몰', value: shop?.name ?? new URL(url).hostname },
          { label: '상품명(링크)', value: title ?? '' },
          { label: '링크에서 본 가격', value: seenPrice ? `${won(Number(seenPrice))}원` : '' },
          { label: '수량', value: `${won(Number(quantity))}개` },
          { label: '필요일', value: neededBy },
          { label: '대체품', value: allowAlternative ? '같은 규격이면 다른 브랜드도 가능' : '같은 제품만' },
          { label: '주소', value: address },
          { label: '메모', value: memo },
        ],
      },
    ])
    if (ok) {
      setLinkText('')
      setSeenPrice('')
      setPriceTouched(false)
      setQuantity('')
      setMemo('')
      setState(IDLE)
    }
  }

  if (created) return <RequestReceived requests={created} stub={stub} onAnother={reset} anotherLabel="다른 링크 보내기" />

  return (
    <RequestFormFrame
      onSubmit={send}
      contact={contact}
      setContact={set}
      error={formError ?? error}
      needsLogin={needsLogin}
      busy={busy}
      next="/shop/request?type=link"
      submitLabel="이 제품 견적 받기"
      footnote="견적서에는 링크에 보이는 가격과 씨마켓몰 견적가를 나란히 적습니다. 견적을 보고 확정하기 전에는 아무것도 주문되지 않습니다."
    >
      <Field label="상품 링크" hint="공유하기로 복사한 문구 그대로 붙여 넣어도 됩니다">
        <span className="relative block">
          <Link2 size={16} aria-hidden="true" className="text-muted pointer-events-none absolute top-3.5 left-3" />
          <textarea
            value={linkText}
            onChange={event => onLinkChange(event.target.value)}
            rows={2}
            placeholder="https://www.coupang.com/vp/products/..."
            className={`${inputClass} pl-9`}
          />
        </span>
      </Field>
      <p className="text-muted -mt-2 text-xs">받는 곳: {LINK_SHOPS.map(entry => entry.name).join(' · ')} · 그 밖의 링크도 접수됩니다</p>

      {url && (
        <div className="bg-light-soft rounded-xl p-4" aria-live="polite">
          {state.status === 'loading' ? (
            <p className="text-muted flex items-center gap-2 text-sm">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> 링크를 확인하는 중…
            </p>
          ) : state.preview?.title ? (
            <div className="flex gap-4">
              {state.preview.image && (
                // 외부 쇼핑몰 이미지 — next/image 원격 도메인 목록에 넣지 않으려고 img 를 쓴다(미리보기 한 장).
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.preview.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 shrink-0 rounded-media bg-white object-contain"
                />
              )}
              <div className="min-w-0">
                <span className="bg-blue-tint-2 text-primary rounded-full px-2 py-0.5 text-[11px] font-semibold">{state.preview.shop}</span>
                <p className="text-text mt-1.5 line-clamp-2 text-sm font-semibold">{state.preview.title}</p>
                {state.preview.price && (
                  <p className="text-muted mt-1 text-xs">
                    링크에 보이는 가격 <strong className="text-text tabular-nums">{won(state.preview.price)}원</strong> · 쿠폰·배송비 미반영
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted text-sm">
              {shop ? `${shop.name} 링크입니다.` : '링크를 받았습니다.'} 상품 정보를 자동으로 불러오지 못해도 담당자가 링크를 열어 확인합니다.
            </p>
          )}

          {state.matches.length > 0 && (
            <div className="border-border mt-4 border-t pt-3">
              <p className="text-text text-sm font-semibold">씨마켓몰에 비슷한 상품이 이미 있어요</p>
              <ul className="mt-2 space-y-1.5">
                {state.matches.map(product => (
                  <li key={product.id} className="flex items-center justify-between gap-3 text-sm">
                    <Link href={`/shop/${product.id}`} className="text-primary min-w-0 truncate font-semibold hover:underline">
                      {product.name}
                    </Link>
                    <span className="text-text shrink-0 tabular-nums">
                      {won(product.basePrice)}원<span className="text-muted text-xs"> (부가세 별도)</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-muted mt-2 text-[11px]">같은 제품이 맞으면 바로 담아 사시는 게 가장 빠릅니다.</p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="수량">
          <input value={quantity} onChange={event => setQuantity(event.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="20" className={inputClass} />
        </Field>
        <Field label="링크에서 본 가격" hint="원 · 선택">
          <input
            value={seenPrice}
            onChange={event => {
              setPriceTouched(true)
              setSeenPrice(event.target.value.replace(/\D/g, ''))
            }}
            inputMode="numeric"
            className={inputClass}
          />
        </Field>
        <Field label="필요일" hint="선택">
          <input type="date" min={today} value={neededBy} onChange={event => setNeededBy(event.target.value)} className={inputClass} />
        </Field>
      </div>
      <label className="text-text flex items-center gap-2 text-sm">
        <input type="checkbox" checked={allowAlternative} onChange={event => setAllowAlternative(event.target.checked)} className="accent-primary h-4 w-4" />
        같은 규격이면 다른 브랜드 제품도 괜찮아요(더 싸게 찾을 수 있습니다)
      </label>
      <Field label="받을 주소">
        <input value={address} onChange={event => setAddress(event.target.value)} placeholder="서울 중구 세종대로 110" className={inputClass} />
      </Field>
      <Field label="메모" hint="선택">
        <textarea value={memo} onChange={event => setMemo(event.target.value)} rows={3} placeholder="색상·옵션, 필요한 서류" className={inputClass} />
      </Field>
    </RequestFormFrame>
  )
}
