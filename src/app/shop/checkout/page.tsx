import CheckoutView from '@/components/Shop/Checkout/CheckoutView'
import { getShopMember, PAYER_MISSING_MESSAGE, payerMissing } from '@/lib/shop-member'

// 보는 사람에 따라 «주문자» 표기와 고를 수 있는 경로·결제수단이 달라진다.
export const dynamic = 'force-dynamic'

/**
 * 주문 방법 선택.
 *
 * 장바구니(localStorage)는 브라우저에만 있으므로 화면은 클라이언트가 그린다. 서버가
 * 넘기는 것은 «누가 보는가»(이름·고객 유형·결제 명의)뿐이다 — 주문 자체는 `/api/shop/orders` 가
 * 세션으로 다시 판정하고, 세모가 최종 판정한다.
 *
 * 고객 유형은 보기 등급이 아니라 세션 역할이다(`customerTypeOf`) — 직원은 공급기업과 같은 화면을 본다
 * (2026-09-16 결정). 직원은 소속 회원의 카드·포인트로 결제하므로, 소속이 없으면 결제수단을 읽지 않고
 * 그 사유를 먼저 보여 준다.
 */
export default async function CheckoutPage() {
  const member = await getShopMember()
  return (
    <CheckoutView
      viewerName={member?.displayName ?? null}
      customerType={member?.customerType ?? 'COMPANY'}
      paysWithAffiliate={member?.role === 'EMPLOYEE'}
      payerBlockedMessage={member && payerMissing(member) ? PAYER_MISSING_MESSAGE : null}
    />
  )
}
