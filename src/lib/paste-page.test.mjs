import { test } from "node:test";
import assert from "node:assert/strict";

const { sanitizePastedHtml, capBytes, looksLikePage, preparePastedPage } = await import("./paste-page.ts");

test("스크립트·스타일·이벤트·위험한 주소를 지우고 class·a[href]·img[src] 만 남긴다", () => {
  const html =
    '<div class="prod" style="color:red" onclick="steal()"><script>alert(1)</script><style>.x{}</style>' +
    '<a href="javascript:alert(1)">나쁜 링크</a><a href="https://www.coupang.com/vp/products/1" target="_blank">공유</a>' +
    '<img src="https://thumbnail10.coupangcdn.com/thumbnails/remote/492x492ex/a.jpg" width="410" onerror="x()" data-x="1">' +
    '<iframe src="https://evil.example"></iframe><input value="비밀"></div>';
  const out = sanitizePastedHtml(html);
  assert.ok(!/script|style=|onclick|onerror|javascript:|iframe|<input|data-x|target=/i.test(out), out);
  assert.match(out, /<div class="prod">/);
  assert.match(out, /<a href="https:\/\/www\.coupang\.com\/vp\/products\/1">공유<\/a>/);
  assert.match(out, /<img src="https:\/\/thumbnail10\.coupangcdn\.com\/[^"]+" width="410">/);
  assert.match(out, /<a>나쁜 링크<\/a>/);
});

test("바이트 상한 — 한글 중간에서 자르지 않는다", () => {
  const text = "가".repeat(10);
  assert.equal(capBytes(text, 7), "가가");
  assert.equal(capBytes("abc", 10), "abc");
});

test("링크(공유 글)는 페이지가 아니고, 긴 글·많은 줄은 페이지", () => {
  assert.equal(looksLikePage("", "https://www.coupang.com/vp/products/1"), false);
  assert.equal(looksLikePage("", "[쿠팡] 더블에이 A4 80g https://link.coupang.com/a/x"), false);
  const page = ["쿠팡", "로그인", "더블에이 A4 복사용지 80g, 2500매, 1개", "12,345개 상품평", "판매자: 쿠팡", "24%62,000원", "46,900원", "무료배송"].join("\n");
  assert.equal(looksLikePage("", page), true);
});

test("비어 있으면 문구, 아니면 정리본 + 글", () => {
  assert.ok("error" in preparePastedPage("", "   "));
  const ok = preparePastedPage('<div class="a">더블에이<script>x</script></div>', "더블에이");
  assert.deepEqual(ok, { html: '<div class="a">더블에이 </div>', text: "더블에이", chars: 4 });
});
