import { currentAnnualRound } from '@/config/annual-contracts'
import { campaignStage, findCampaignItem } from '@/config/group-buys'
import { findKit } from '@/config/kits'
import { findMandatoryCategory } from '@/config/mandatory-purchase'
import { findService } from '@/config/office-services'
import { kstToday } from '@/config/seasons'
import { topic } from '@/lib/korean'
import {
  MALL_REQUEST_TYPES,
  type CreateMallRequestInput,
  type MallRequestContact,
  type MallRequestField,
  type MallRequestType,
} from '@/lib/request-types'

/**
 * 몰이 요청을 받을 때의 검증 — 세모는 `details` 안을 해석하지 않으므로 **여기가 유일한 문**이다.
 *
 * 규칙은 두 갈래다.
 *  - 모양: 길이 상한·필수 칸. 폼을 우회한 요청이 원장을 더럽히지 않게.
 *  - 뜻: refKey 가 실제 설정(서비스·캠페인·꾸러미)을 가리키는가, 마감이 지나지 않았는가,
 *    최소 수량을 넘었는가. 화면이 이미 막지만 **서버가 다시 본다** — 탭을 열어 둔 채 마감을
 *    넘기면 화면은 모른다.
 *
 * 실패는 `{ message }` 하나 — 담당자가 읽고 고칠 수 있는 문장으로.
 */

const MAX_TITLE = 120
const MAX_FIELDS = 30
const MAX_LABEL = 40
const MAX_VALUE = 2_000
/** 받는 사람 명단처럼 긴 칸 하나는 따로 허용한다(수백 줄) */
const MAX_LONG_VALUE = 30_000
const LONG_FIELD_LABELS = new Set(['받는 사람 명단', '구매 품목 목록'])

type Result = { ok: true; value: CreateMallRequestInput } | { ok: false; message: string }

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function fail(message: string): Result {
  return { ok: false, message }
}

export function validateContact(raw: unknown): MallRequestContact | string {
  const source = (raw ?? {}) as Record<string, unknown>
  const contact: MallRequestContact = {
    name: text(source.name, 40),
    organization: text(source.organization, 80),
    tel: text(source.tel, 20),
    email: text(source.email, 120) || null,
  }
  if (!contact.name) return '담당자 이름을 적어 주세요.'
  if (!contact.organization) return '기관·회사명을 적어 주세요.'
  if (!/^[0-9+\-() ]{8,20}$/.test(contact.tel)) return '연락처를 숫자와 하이픈으로 적어 주세요.'
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) return '이메일 형식을 확인해 주세요.'
  return contact
}

function validateFields(raw: unknown): MallRequestField[] | string {
  if (!Array.isArray(raw)) return '요청 내용을 읽지 못했습니다.'
  if (raw.length > MAX_FIELDS) return '요청 칸이 너무 많습니다.'
  const fields: MallRequestField[] = []
  for (const entry of raw) {
    const label = text((entry as MallRequestField)?.label, MAX_LABEL)
    const limit = LONG_FIELD_LABELS.has(label) ? MAX_LONG_VALUE : MAX_VALUE
    const value = text((entry as MallRequestField)?.value, limit)
    if (!label) return '요청 내용을 읽지 못했습니다.'
    // 빈 칸은 싣지 않는다 — 운영자 화면에 «메모: (빈칸)» 이 줄줄이 서면 읽을 게 묻힌다.
    if (value) fields.push({ label, value })
  }
  return fields
}

function isType(value: unknown): value is MallRequestType {
  return typeof value === 'string' && (MALL_REQUEST_TYPES as readonly string[]).includes(value)
}

export function validateRequestBody(body: unknown, today = kstToday()): Result {
  const source = (body ?? {}) as Record<string, unknown>

  if (!isType(source.type)) return fail('요청 종류를 확인해 주세요.')
  const type = source.type

  const title = text(source.title, MAX_TITLE)
  if (!title) return fail('요청 제목이 비어 있습니다.')

  const clientRequestKey = text(source.clientRequestKey, 80)
  if (!clientRequestKey) return fail('요청 키가 없습니다. 화면을 새로고침한 뒤 다시 보내 주세요.')

  const contact = validateContact(source.contact)
  if (typeof contact === 'string') return fail(contact)

  const details = validateFields(source.details)
  if (typeof details === 'string') return fail(details)

  const refKey = text(source.refKey, 400) || null
  const rawQuantity = source.quantity
  const quantity =
    rawQuantity === null || rawQuantity === undefined || rawQuantity === '' ? null : Number(rawQuantity)
  if (quantity !== null && (!Number.isInteger(quantity) || quantity < 1 || quantity > 10_000_000)) {
    return fail('수량을 1 이상의 정수로 적어 주세요.')
  }

  switch (type) {
    case 'SERVICE_QUOTE': {
      const keys = (refKey ?? '').split(',').filter(Boolean)
      if (keys.length === 0) return fail('견적 받을 서비스를 하나 이상 골라 주세요.')
      if (keys.some(key => !findService(key))) return fail('없는 서비스가 섞여 있습니다. 화면을 새로고침해 주세요.')
      break
    }
    case 'GROUP_BUY_PLEDGE': {
      const [campaignKey, itemKey] = (refKey ?? '').split(':')
      const found = campaignKey && itemKey ? findCampaignItem(campaignKey, itemKey) : null
      if (!found) return fail('공동구매 품목을 찾을 수 없습니다. 화면을 새로고침해 주세요.')
      if (campaignStage(found.campaign, today) !== 'survey') {
        return fail(`${found.campaign.title} 수요조사가 마감되었습니다.`)
      }
      if (quantity === null || quantity < found.item.minQuantity) {
        return fail(`${topic(found.item.name)} ${found.item.minQuantity.toLocaleString('ko-KR')}${found.item.unit}부터 참여할 수 있습니다.`)
      }
      break
    }
    case 'ANNUAL_CONTRACT': {
      const round = currentAnnualRound(today)
      if (!round || round.key !== refKey) return fail('신청을 받는 연간 단가계약이 없습니다.')
      break
    }
    case 'KIT': {
      if (!findKit(refKey)) return fail('꾸러미를 찾을 수 없습니다. 화면을 새로고침해 주세요.')
      break
    }
    case 'SWITCH': {
      if (refKey && !findService(refKey)) return fail('갈아탈 서비스를 다시 골라 주세요.')
      break
    }
    case 'MANDATORY_SOURCING': {
      const keys = (refKey ?? '').split(',').filter(Boolean)
      if (keys.length === 0 || keys.some(key => !findMandatoryCategory(key))) {
        return fail('채울 의무구매 분야를 다시 골라 주세요.')
      }
      break
    }
    case 'SOURCING':
      if (refKey !== null && refKey !== 'urgent' && refKey !== 'link') return fail('요청 종류를 확인해 주세요.')
      if (refKey === 'link' && !details.some(field => field.label === '상품 링크' && /^https?:\/\//i.test(field.value))) {
        return fail('상품 링크를 http 로 시작하는 주소로 붙여 넣어 주세요.')
      }
      break
    case 'SOCIAL_VALUE':
      break
  }

  if (details.length === 0) return fail('요청 내용을 한 칸 이상 적어 주세요.')

  return {
    ok: true,
    value: { type, refKey, title, quantity, details, contact, clientRequestKey },
  }
}
