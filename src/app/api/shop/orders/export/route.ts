import { NextResponse } from 'next/server'

import { toErrorResponse } from '@/lib/api-errors'
import { ORDER_ROUTE_LABEL, orderStatusLabel, PAYMENT_METHOD_LABEL } from '@/lib/order-types'
import { listOrders } from '@/lib/orders'
import { getShopMember } from '@/lib/shop-member'

/**
 * 내 주문 내역 CSV — «담당자가 바뀌어도 이어진다» 의 가장 작은 실체.
 *
 * 몰 주문은 사람(씨마켓 sub) 단위로 남는다. 순환보직으로 담당자가 바뀌면 새 담당자는 전임자의
 * 주문을 몰에서 볼 수 없다 — 그래서 품목 한 줄 = CSV 한 줄로 내려받아 인수인계 문서에 붙이게 한다.
 * 엑셀이 한글을 깨지 않게 BOM 을 붙이고, 수식으로 읽힐 수 있는 칸(=,+,-,@)은 작은따옴표로 막는다.
 */

const HEADER = ['주문번호', '주문일시', '상태', '구매 방식', '결제수단', '견적서', '품명', '규격', '단위', '수량', '단가(공급가)', '금액(공급가)', '공급사', '받는 곳', '주소']

function cell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(iso))

export async function GET() {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 })
  }

  try {
    const { orders } = await listOrders(member.memberKey)
    const lines = [HEADER.map(cell).join(',')]
    for (const order of orders) {
      for (const item of order.items) {
        lines.push(
          [
            order.orderNo,
            formatDateTime(order.createdAt),
            orderStatusLabel(order.status),
            ORDER_ROUTE_LABEL[order.route],
            order.paymentMethod ? PAYMENT_METHOD_LABEL[order.paymentMethod] : '',
            order.quoteNo,
            item.name,
            item.spec,
            item.unit,
            item.quantity,
            item.unitPrice,
            item.unitPrice * item.quantity,
            item.supplierName,
            order.shipToName,
            order.shipToAddress,
          ]
            .map(cell)
            .join(','),
        )
      }
    }

    const stamp = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()).replace(/-/g, '')
    return new NextResponse(`﻿${lines.join('\r\n')}\r\n`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cmarket-mall-orders-${stamp}.csv"; filename*=UTF-8''${encodeURIComponent(`씨마켓몰_주문내역_${stamp}.csv`)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return toErrorResponse(error, '주문 내역을 내려받지 못했습니다.')
  }
}
