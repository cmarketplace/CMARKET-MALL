import type { LinkItemInput } from '@/lib/link-items-types'

/** 브라우저가 보낸 «링크로 바로 사기» 한 줄 → 검증된 입력. 틀리면 문구. 가격은 세모가 다시 정한다(여기 값은 보완용). */
export function parseLinkItemInput(body: unknown): { ok: true; value: LinkItemInput } | { ok: false; message: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, message: '요청 형식이 올바르지 않습니다.' }
  const raw = body as Record<string, unknown>
  const text = typeof raw.text === 'string' ? raw.text.trim().slice(0, 2000) : ''
  if (!/https?:\/\//i.test(text)) return { ok: false, message: '상품 주소(https://…)를 붙여 넣어 주세요.' }
  const quantity = Number(raw.quantity ?? 1)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) return { ok: false, message: '수량은 1 이상 정수로 적어 주세요.' }

  const value: LinkItemInput = { text, quantity }
  const customer = typeof raw.customer === 'object' && raw.customer !== null ? (raw.customer as Record<string, unknown>) : null
  if (customer) {
    const name = typeof customer.name === 'string' ? customer.name.trim().slice(0, 150) : ''
    const price = Number(customer.price)
    const shipping = Number(customer.shipping)
    const fill: NonNullable<LinkItemInput['customer']> = {}
    if (name) fill.name = name
    if (Number.isInteger(price) && price > 0 && price <= 1_000_000_000) fill.price = price
    if (Number.isInteger(shipping) && shipping >= 0 && shipping <= 10_000_000 && customer.shipping !== undefined && customer.shipping !== '') fill.shipping = shipping
    if (Object.keys(fill).length > 0) value.customer = fill
  }
  return { ok: true, value }
}
