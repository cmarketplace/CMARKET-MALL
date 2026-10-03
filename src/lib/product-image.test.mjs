// 상품 이미지 고르기 순서 고정 — `npm test` (node --test, 의존성 없음).
//
// 소스가 `@/…` 별칭과 확장자 없는 import 를 쓰므로, 노드 내장 타입 제거(strip-types)로
// 그대로 읽게 resolve 훅 하나만 건다.
import { registerHooks } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const SRC = new URL("../", import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      return next(new URL(`${specifier.slice(2)}.ts`, SRC).href, context);
    }
    return next(specifier, context);
  },
});

const { pickImage, productImage, normalizeCategory } = await import("./product-image.ts");
const { PRODUCT_IMAGES } = await import("../components/Shop/image.data.ts");

const PUBLIC = new URL("../../public", import.meta.url).pathname;

/** 운영 세모 대분류 20개(정확한 이름) → 그림 파일 */
const ROOTS = {
  "금고/사무용가구": "office-furniture",
  기타: "etc",
  "도장/상패": "stamp-plaque",
  "디자인문구/학용품": "stationery",
  "디지털/가전": "digital-appliance",
  모바일쿠폰: "mobile-coupon",
  "미술/화방용품": "art-supplies",
  "복사용지&지류용품": "paper",
  사무기기: "office-machines",
  사무용품: "office-supplies",
  "산업/MRO자재": "industrial-mro",
  "생활/주방": "living-kitchen",
  "식품/건강": "food-health",
  "실험/연구실": "lab-research",
  "잉크/토너/드럼": "ink-toner",
  "취미/레저/계절": "hobby-leisure",
  "패션/뷰티": "fashion-beauty",
  필기구: "writing-instruments",
  "화일/바인더": "file-binder",
  선장품: "seonjang",
};

// 품명은 어떤 키워드 규칙에도 안 걸리는 값으로 — 대분류 그림까지 내려가야 한다.
const NEUTRAL = "무지 제품 A-100";

for (const [root, slug] of Object.entries(ROOTS)) {
  test(`대분류 «${root}» → ${slug}.svg`, () => {
    const src = pickImage("세부분류", root, NEUTRAL);
    assert.equal(src, `/images/category/${slug}.svg`);
    const file = `${PUBLIC}${src}`;
    assert.ok(statSync(file).size < 4096, `${slug}.svg 는 4KB 미만`);
    const svg = readFileSync(file, "utf8");
    assert.match(svg, /대표 이미지/, "캡션이 있어야 실제 사진으로 오인되지 않는다");
    assert.doesNotMatch(svg, /<image|data:|@import|url\(http/, "래스터·외부 자원 금지");
  });
}

test("대분류 이름 정규화 — 공백·/·가운뎃점·& 무시, 영문 대소문자 무시", () => {
  const variants = {
    "생활·주방": "living-kitchen",
    "복사용지 & 지류용품": "paper",
    "복사용지·지류용품": "paper",
    " 금고 / 사무용가구 ": "office-furniture",
    "산업/mro자재": "industrial-mro",
    "잉크·토너·드럼": "ink-toner",
    "식품 건강": "food-health",
  };
  for (const [root, slug] of Object.entries(variants)) {
    assert.equal(pickImage(null, root, NEUTRAL), `/images/category/${slug}.svg`, root);
  }
  assert.equal(normalizeCategory("생활·주방"), normalizeCategory("생활/주방"));
});

test("기존 키워드 규칙이 대분류 그림보다 먼저다", () => {
  assert.equal(pickImage("선장품", "생활/주방", NEUTRAL), PRODUCT_IMAGES.seonjang);
  assert.equal(pickImage("시약", "실험/연구실", NEUTRAL), PRODUCT_IMAGES.reagent);
  assert.equal(pickImage(null, "실험/연구실", "비커 500ml"), PRODUCT_IMAGES.glass);
  assert.equal(pickImage(null, "생활/주방", "주방 세제 1L"), PRODUCT_IMAGES.color);
  assert.equal(pickImage(null, "산업/MRO자재", "니트릴 장갑 M"), PRODUCT_IMAGES.ppe);
  assert.equal(pickImage(null, "실험/연구실", "페트리 디시"), PRODUCT_IMAGES.petri);
  assert.equal(pickImage(null, "생활/주방", "스텐 냄비 24cm"), PRODUCT_IMAGES.ware);
  assert.equal(pickImage(null, "사무기기", "계측 장비"), PRODUCT_IMAGES.special);
});

test("모르는 대분류·대분류 없음 → «사진 준비 중»", () => {
  assert.equal(pickImage(null, "위생·청소", NEUTRAL), PRODUCT_IMAGES.placeholder);
  assert.equal(pickImage(null, "", NEUTRAL), PRODUCT_IMAGES.placeholder);
  assert.equal(pickImage(null, null, NEUTRAL), PRODUCT_IMAGES.placeholder);
  assert.equal(pickImage(null, undefined, NEUTRAL), PRODUCT_IMAGES.placeholder);
});

test("피드의 실제 사진이 언제나 이긴다", () => {
  const real = "https://image.officedepot.co.kr/goods/123.jpg";
  assert.equal(productImage({ imageUrl: real, rootCategoryName: "사무용품", name: NEUTRAL }), real);
  assert.equal(productImage({ imageUrl: real, categoryName: "시약", name: NEUTRAL }), real);
  // 못 믿을 값은 버리고 대분류 그림으로
  for (const bad of ["", "  ", "http://image.officedepot.co.kr/a.jpg", "https://evil.example/a.jpg", "/a.jpg"]) {
    assert.equal(
      productImage({ imageUrl: bad, rootCategoryName: "사무용품", name: NEUTRAL }),
      "/images/category/office-supplies.svg",
      JSON.stringify(bad),
    );
  }
});
