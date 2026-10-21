// 법적 구매 배지 — `npm test` (node --test, 의존성 없음).
import { test } from "node:test";
import assert from "node:assert/strict";

const { cardBadges, offerBadges, MANDATORY_LABELS } = await import("./mandatory.ts");

test("제도 10개 이름", () => {
  assert.equal(Object.keys(MANDATORY_LABELS).length, 10);
  assert.equal(MANDATORY_LABELS.severe, "중증장애인생산품");
});

test("카드 배지는 중소기업을 빼고 두 개까지", () => {
  assert.deepEqual(cardBadges(["severe", "women", "sme", "green"]), ["중증장애인생산품", "여성기업"]);
  assert.deepEqual(cardBadges(["sme"]), []);
  assert.deepEqual(cardBadges(undefined), []);
});

test("모르는 코드는 버린다", () => {
  assert.deepEqual(cardBadges(["x", "tech"]), ["기술개발제품"]);
  assert.deepEqual(offerBadges(["women", "x", "sme"]), ["여성기업", "중소기업"]);
});
