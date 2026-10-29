import { test } from "node:test";
import assert from "node:assert/strict";

const { quoteLinkPrice, estimateErrand } = await import("./link-errand.ts");

// 세모 `apps/backend/src/common/domain/__tests__/link-errand-pricing.spec.ts` 의 SAMPLES 와 같은 표 — 한쪽만 바꾸면 깨져야 한다.
const SAMPLES = [
  { linkPrice: 12_000, shipping: 0, quantity: 10, includeVat: true, unitPrice: 12_200, lineTotal: 122_000 },
  { linkPrice: 12_000, shipping: 0, quantity: 10, includeVat: false, unitPrice: 11_091, lineTotal: 110_910 },
  { linkPrice: 54_800, shipping: 0, quantity: 1, includeVat: false, unitPrice: 51_637, lineTotal: 51_637 },
  { linkPrice: 4_730, shipping: 3_000, quantity: 3, includeVat: false, unitPrice: 5_816, lineTotal: 17_448 },
  { linkPrice: 4_730, shipping: 3_000, quantity: 3, includeVat: true, unitPrice: 6_397, lineTotal: 19_191 },
];

for (const s of SAMPLES) {
  test(`링크 단가 ${s.linkPrice}원 × ${s.quantity} + 배송 ${s.shipping} (부가세 포함=${s.includeVat}) → ${s.unitPrice}원`, () => {
    const quote = quoteLinkPrice(s);
    assert.equal(quote?.unitPrice, s.unitPrice);
    assert.equal(quote?.lineTotal, s.lineTotal);
  });
}

test("대신 사 드림 요청 견적(부가세 포함)과 같은 단가 — 12,000원 × 10개 → 12,200원", () => {
  const errand = estimateErrand({ linkUnitPrice: 12_000, quantity: 10, shipping: 0, payment: "transfer" });
  assert.equal(errand?.unitPrice, quoteLinkPrice({ linkPrice: 12_000, shipping: 0, quantity: 10, includeVat: true })?.unitPrice);
});

test("잘못된 입력이면 가격을 지어내지 않는다", () => {
  assert.equal(quoteLinkPrice({ linkPrice: 0, shipping: 0, quantity: 1, includeVat: false }), null);
  assert.equal(quoteLinkPrice({ linkPrice: 1000, shipping: 0, quantity: 0, includeVat: false }), null);
  assert.equal(quoteLinkPrice({ linkPrice: 1000.5, shipping: 0, quantity: 1, includeVat: false }), null);
});
