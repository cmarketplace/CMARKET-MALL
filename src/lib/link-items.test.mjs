import { registerHooks } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";

const SRC = new URL("../", import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    return specifier.startsWith("@/") ? next(new URL(`${specifier.slice(2)}.ts`, SRC).href, context) : next(specifier, context);
  },
});

const { unitPriceAt } = await import("./offer-pricing.ts");
const { parseLinkItemInput } = await import("./link-items-validate.ts");
const { readAtLabel } = await import("./link-items-types.ts");

const base = {
  offerId: "off-1",
  price: 51_637,
  priceRank: 1,
  supplierId: null,
  supplierName: null,
  leadDays: null,
  minQuantity: null,
  tiers: [],
  trend: [],
  trustScore: null,
  recentAwards: null,
  directPurchase: false,
  shippingFee: null,
  freeShippingOver: null,
};
const link = {
  offeringId: "off-1",
  url: "https://www.11st.co.kr/products/20505008",
  shopName: "11번가",
  linkPrice: 54_800,
  shipping: 0,
  errandFee: 2_000,
  priceMethod: "jsonld",
  readAt: "2026-10-21T15:20:00Z",
  includeVat: false,
};

test("링크 오퍼는 수량에 따라 단가가 내려간다(세모 주문 확정과 같은 식)", () => {
  const offer = { ...base, link };
  assert.equal(unitPriceAt(offer, 1), 51_637);
  assert.equal(unitPriceAt(offer, 10), 50_000);
});

test("링크가 아닌 오퍼는 지금처럼 구간 단가", () => {
  assert.equal(unitPriceAt({ ...base, tiers: [{ minQuantity: 10, price: 40_000 }] }, 10), 40_000);
  assert.equal(unitPriceAt(base, 10), 51_637);
});

test("입력 검증 — 주소·수량·보완 값", () => {
  assert.equal(parseLinkItemInput({ text: "주소 없음", quantity: 1 }).ok, false);
  assert.equal(parseLinkItemInput({ text: "https://www.coupang.com/vp/products/1", quantity: 0 }).ok, false);
  const ok = parseLinkItemInput({
    text: "[쿠팡] 더블에이 A4 https://www.coupang.com/vp/products/1",
    quantity: 3,
    customer: { name: " 더블에이 A4 80g ", price: 23000, shipping: "" },
  });
  assert.deepEqual(ok, {
    ok: true,
    value: { text: "[쿠팡] 더블에이 A4 https://www.coupang.com/vp/products/1", quantity: 3, customer: { name: "더블에이 A4 80g", price: 23000 } },
  });
});

test("읽은 시각은 한국 시간으로", () => {
  assert.equal(readAtLabel("2026-10-21T15:20:00Z"), "10월 22일 0시 20분");
  assert.equal(readAtLabel(null), "");
});
