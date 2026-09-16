/**
 * 주문의 모양과 상태 어휘 — **클라이언트에서도 쓸 수 있는 부분**만 모았다.
 * (FITI 포인트몰과 같은 분리 — 서버 전용 `orders.ts` 가 타입까지 갖고 있으면
 * 화면이 타입을 가져오는 순간 서버 코드가 번들에 딸려 들어간다.)
 *
 * ## 주문 경로 두 가지 (2026-09-07 결정) · 가격은 같다 (2026-09-14 D3)
 *
 *   SAFE   씨마켓 안전결제 — 씨마켓이 대금을 받아 공급사에 정산한다. 계약 상대 1곳,
 *          세금계산서 1장(씨마켓 발행), 카드·포인트 선불 또는 세금계산서 후불(발주기관만).
 *          엔씨하이는 이 거래에서 돈을 받지 않고 플랫폼 수수료만 씨마켓에 별도 청구한다.
 *   DIRECT 공급사 직접 구매 — 공급사와 직접 계약한다. 계약 상대·계산서·결제가 공급사
 *          수만큼이고, 결제는 공급사별 세금계산서 후불뿐이다. 발주기관만 고를 수 있다.
 *
 * ## 고객 유형 두 가지 (2026-09-14 대표 결정 D1·D2·D5)
 *
 *   INSTITUTION 발주기관(씨마켓 BUYER). 후불 포함 어느 결제든 되고, 장바구니에서 고른
 *               업체 조합(최저가·업체 최소화·직접 고르기)대로 공급사가 배정된다.
 *   COMPANY     공급기업(씨마켓 SUPPLIER 가 고객으로 구매). 안전결제만, 카드·포인트 선불만,
 *               공급사 선택 없음 — 세모가 **무조건 최저가** 오퍼로 확정하고 거래 형태를
 *               «씨마켓 구매대행»(CMARKET_AGENCY)으로 남긴다. 공급사 화면의 거래 상대는 씨마켓이다.
 *               씨마켓 직원(EMPLOYEE)도 여기다(2026-09-16 대표 결정 — 기관이 아니므로 기업과 같이 선불만).
 *               직원은 소속 회원의 카드·포인트로 결제하고, 세모 응답의 `customerType` 도 COMPANY 로 온다.
 *               보기 등급(`shop-auth.ts` `viewerTierOf`)과는 별개의 축이다.
 *
 * 이 규칙의 정본은 세모 `open-mall-order-terms.ts` 다. 화면은 같은 표를 여기(`allowedPaymentMethods`)
 * 에 두고 **미리 거른다** — 서버가 400 으로 거절할 조합을 화면이 보여 주면 담당자는 «되는 줄 알고
 * 눌렀다가 막히는» 경험을 한다. 서버가 최종 판정이고 화면은 그 예고편이다.
 *
 * ## 상태
 *
 *   PLACED → MATCHED(공급사 수락 대기) → CONTRACTED(공급사 수락) → SHIPPING → DELIVERED
 *   → INSPECTED(구매확정) → SETTLED · 어디서든 CANCELED
 *
 * 어휘를 미리 다 두는 이유: 상태 집합을 나중에 늘리면 그 값을 읽던 화면 조건절이 **에러
 * 없이 조용히** 빠뜨린다(KCL 재검수에서 확인된 사고 유형). 세모가 모르는 값을 보내도
 * 화면이 비지 않게 `orderStatusLabel()` 은 원문으로 떨어진다.
 */

export type OrderStatus =
  | "PLACED"
  | "MATCHED"
  | "CONTRACTED"
  | "SHIPPING"
  | "DELIVERED"
  | "INSPECTED"
  | "INVOICED"
  | "SETTLED"
  | "CANCELED";

export type OrderRoute = "SAFE" | "DIRECT";

export type PaymentMethod = "TAX_INVOICE" | "CARD" | "POINT";

export type CustomerType = "INSTITUTION" | "COMPANY";

/** SUPPLIER_DIRECT = 공급사가 판다(안전결제면 수납·정산만 씨마켓) · CMARKET_AGENCY = 씨마켓 구매대행(최저가 고정). */
export type DealType = "SUPPLIER_DIRECT" | "CMARKET_AGENCY";

export const ORDER_ROUTE_LABEL: Record<OrderRoute, string> = {
  SAFE: "씨마켓 안전결제",
  DIRECT: "공급사 직접 구매",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  TAX_INVOICE: "세금계산서 후불",
  CARD: "법인카드 · 씨마켓 결제창",
  POINT: "씨마켓 포인트",
};

export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  INSTITUTION: "발주기관",
  COMPANY: "공급기업",
};

export const DEAL_TYPE_LABEL: Record<DealType, string> = {
  SUPPLIER_DIRECT: "공급사 판매",
  CMARKET_AGENCY: "씨마켓 구매대행",
};

/** 주문 시점에 돈이 나가는 수단. 후불(세금계산서)만 «지금 결제 없음» 이다. */
export function isPrepaid(method: PaymentMethod | null | undefined): boolean {
  return method === "CARD" || method === "POINT";
}

/**
 * 고객 유형 × 경로 → 고를 수 있는 결제수단. **세모 서버 규칙의 사본**이다(D2).
 *
 *   발주기관 · 안전결제  세금계산서 후불 · 카드 · 포인트
 *   발주기관 · 직접 구매  세금계산서 후불만 (카드·포인트는 씨마켓이 받는 안전결제에만 있다)
 *   공급기업 · 안전결제  카드 · 포인트 (후불 불가, 직접 구매 불가)
 *
 * 순서가 곧 화면 순서이고 첫 번째가 기본 선택이다.
 */
export function allowedPaymentMethods(customerType: CustomerType, route: OrderRoute): PaymentMethod[] {
  if (customerType === "COMPANY") return ["CARD", "POINT"];
  if (route === "DIRECT") return ["TAX_INVOICE"];
  return ["TAX_INVOICE", "CARD", "POINT"];
}

/** 공급기업은 안전결제뿐 — 경로 선택 자체가 없다. */
export function allowedRoutes(customerType: CustomerType): OrderRoute[] {
  return customerType === "COMPANY" ? ["SAFE"] : ["SAFE", "DIRECT"];
}

/** 취소를 받아 주는 상태. 공급사가 수락(CONTRACTED)한 뒤에는 관리자 개입 경로다. */
export const CANCELABLE_STATUSES: readonly OrderStatus[] = ["PLACED", "MATCHED"];

export interface OrderItem {
  seq: number;
  itemId: string;
  name: string;
  spec: string | null;
  unit: string | null;
  quantity: number;
  /** 공급가액 단가. 이 몰의 표시가는 부가세 별도다(`cart-amounts.ts`). */
  unitPrice: number;
  /** 세모가 확정한 오퍼(세모 어휘로는 offeringId). 옛 주문은 null. */
  offerId: string | null;
  supplierName: string | null;
}

/** 주문자가 직접 적는 배송지 — 이 몰은 모두 개방이라 고정 사업장 목록이 없다. */
export interface OrderShipTo {
  name: string;
  zip: string;
  address: string;
  tel: string | null;
}

/**
 * 결제창 재료 — 그 주문자의 씨마켓 저장카드와 포인트 잔액.
 * 세모 `StorefrontPaymentOptionsDto` 와 같은 모양(돈의 정본은 씨마켓, 세모는 옮겨 줄 뿐).
 */
export interface PaymentCard {
  /** 씨마켓 저장카드 id — 주문의 `payment.cardId` 로 보낸다. */
  id: number;
  cardNickname: string;
  maskedCardNumber: string;
  /** 결제 확인 비밀번호(숫자 6자리)가 걸린 카드 — 주문 때 `payment.cardPassword` 가 필요하다. */
  requiresPassword: boolean;
}

export interface PaymentPoints {
  /** 몰 결제에 쓸 수 있는 포인트 합(보너스+충전+판매대금). */
  balance: number;
  bonusBalance: number;
  paidBalance: number;
  settlementBalance: number;
}

export interface PaymentOptions {
  cards: PaymentCard[];
  points: PaymentPoints;
}

/** 카드 결제 입력 — 결제창에서 고른 카드(+잠금 카드면 비밀번호). 몰은 저장·로그하지 않고 세모로 넘긴다. */
export interface OrderPaymentInput {
  cardId: number;
  cardPassword?: string;
}

export interface StorefrontOrder {
  /** 주문번호(세모 구매번호). 키 없는 로컬은 스텁 채번. */
  orderNo: string;
  status: OrderStatus;
  /** 주문자 신원 키(씨마켓 sub). 세션에서만 온다. */
  memberId: string;
  /** 발주기관 / 공급기업. 세모가 주문자 역할로 정한다. 옛 주문은 null. */
  customerType: CustomerType | null;
  /** 공급사 판매 / 씨마켓 구매대행. 옛 주문은 null. */
  dealType: DealType | null;
  route: OrderRoute;
  paymentMethod: PaymentMethod | null;
  /** 이 주문의 근거 견적서. 없으면 장바구니에서 바로 낸 주문이다. */
  quoteNo: string | null;
  shipToName: string;
  shipToZip: string;
  shipToAddress: string;
  shipToTel: string | null;
  /** 공급가액 합 */
  totalSupply: number;
  /** 배송비 합 */
  totalShipping: number;
  /** 부가세 — 과세 합계에서 한 번만 분리한 값 */
  totalVat: number;
  /** 결제 금액. 선불이면 이미 결제된 값, 후불이면 배송완료 후 청구되는 값. */
  totalPayable: number;
  /** 이 주문에 얽힌 공급사 수 = 직접 구매 시 계약·계산서 수 */
  supplierCount: number;
  canceledAt: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderListPage {
  orders: StorefrontOrder[];
  total: number;
}

/** 상태 → 화면 문구. 한 곳에 모아 목록·상세·영수증이 다른 말을 하지 않게 한다. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: "접수됨",
  MATCHED: "공급사 수락 대기",
  CONTRACTED: "공급사 수락",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  INSPECTED: "구매확정",
  INVOICED: "결제·계산서 진행",
  SETTLED: "거래 완료",
  CANCELED: "취소됨",
};

/**
 * 세모가 보낸 상태 문자열의 화면 문구. 모르는 값이면 **원문 그대로** — 빈 칸을 그리면
 * 담당자는 «상태가 사라졌다» 로 읽는다(KCL 재검수 사고 유형).
 */
export function orderStatusLabel(status: string): string {
  return (ORDER_STATUS_LABEL as Record<string, string | undefined>)[status] ?? status;
}

/** 그 상태에서 「지금 무슨 일이 일어나고 있나」. */
export const ORDER_STATUS_HINT: Partial<Record<OrderStatus, string>> = {
  PLACED: "접수되었습니다. 곧 공급사에게 전달됩니다.",
  MATCHED: "공급사에게 주문이 전달되었습니다. 공급사가 수락하면 출고가 시작됩니다.",
  CONTRACTED: "공급사가 주문을 수락했습니다. 출고를 준비합니다.",
  SHIPPING: "물건이 오고 있습니다. 공급사별로 따로 도착할 수 있습니다.",
  DELIVERED: "모두 도착했습니다. 검수 후 구매확정해 주세요(7일 뒤 자동 확정).",
  INSPECTED: "구매가 확정되었습니다. 정산이 진행됩니다.",
  INVOICED: "결제와 세금계산서 발행이 진행 중입니다.",
};

/**
 * 경로·결제수단별 «누구에게 얼마를 어떻게 내는가». 결제 화면·영수증·주문 내역이 같은 말을 한다.
 */
export function routeSummary(
  route: OrderRoute,
  supplierCount: number,
  paymentMethod: PaymentMethod | null = null,
) {
  const n = Math.max(1, supplierCount);
  if (route === "SAFE") {
    const payment =
      paymentMethod === "CARD"
        ? "주문 시 법인카드로 씨마켓에 결제 · 취소 시 승인 취소"
        : paymentMethod === "POINT"
          ? "주문 시 씨마켓 포인트로 결제 · 취소 시 포인트 반환"
          : "납품 검수 후 씨마켓에 1회 후불 · 카드·포인트 선불도 가능";
    return {
      counterpart: "씨마켓플레이스(주) 1곳",
      invoice: "씨마켓 발행 1장",
      payment,
      shipping: `공급사 ${n}곳 발송 · 씨마켓이 한 화면에서 추적`,
      support: "교환·반품·환불은 씨마켓이 책임",
    };
  }
  return {
    counterpart: `공급사 ${n}곳 각각`,
    invoice: `공급사별 발행 ${n}장`,
    payment: `공급사별 계좌로 ${n}회 후불`,
    shipping: `공급사 ${n}곳 개별 발송 · 개별 추적`,
    support: "해당 공급사와 직접 처리",
  };
}
