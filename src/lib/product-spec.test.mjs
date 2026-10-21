// 카드 «규격» 한 줄 — `npm test` (node --test, 의존성 없음).
import { test } from "node:test";
import assert from "node:assert/strict";

const { specLabel } = await import("./product-spec.ts");

test("규격이 있으면 이어 붙인다", () => {
  assert.equal(specLabel("더그린 항균 위생장갑", "200매", "대(L)"), "200매 · 대(L)");
});

test("이름에 이미 들어 있는 규격은 다시 쓰지 않는다(띄어쓰기·기호 무시)", () => {
  assert.equal(specLabel("잘풀리는집 각티슈 200매 * 3p", "200매*3P"), "");
  assert.equal(specLabel("에이스 항균롤백 大 120매", "大"), "");
});

test("빈 값·중복은 건너뛴다", () => {
  assert.equal(specLabel("모나리자 미용티슈", "", null, undefined, "  "), "");
  assert.equal(specLabel("머그컵", "500ml", "500 ml"), "500ml");
});

test("같은 이름, 다른 규격은 서로 다른 한 줄이 된다", () => {
  const a = specLabel("오쉘 항균위생장갑", "中 30매");
  const b = specLabel("오쉘 항균위생장갑", "大 30매");
  assert.notEqual(a, b);
});
