import { PRODUCT_IMAGES } from "@/components/Shop/image.data";

/**
 * 상품 카드에 들어갈 이미지 한 장을 고른다 — 실제 사진 → 분류 대표 사진 → 대분류 그림 → «사진 준비 중».
 *
 * `semo-feed.ts` 에서 떼어 낸 것은 화면·네트워크 없이 단위 테스트로 순서를 고정하려고다
 * (`product-image.test.mjs`).
 */

/**
 * 피드 사진을 그대로 쓸 수 있는 호스트. `next.config.ts` 의 `images.remotePatterns` 와
 * **같이 움직여야 한다** — 한쪽만 늘리면 `_next/image` 가 400 을 내고 이미지가 통째로
 * 사라진다(그때는 아래 대표 이미지로 떨어지는 게 낫다).
 */
const ALLOWED_IMAGE_HOSTS = new Set(["image.officedepot.co.kr"]);

/**
 * 피드의 `imageUrl` 을 화면에 쓸 수 있는지 판정한다.
 *
 * 세모 쪽 값은 세 가지 상태로 온다 — 정상 URL / `null` / **빈 문자열**. 빈 문자열은
 * 운영 카탈로그에 실제로 존재하고(2026-08-18 기준 81행) `""` 를 그대로 넘기면
 * next/image 가 런타임 에러를 던지므로, 여기서 걸러 대표 이미지로 떨어뜨린다.
 */
export function remoteImage(imageUrl: string | null | undefined): string | null {
  const raw = imageUrl?.trim();
  if (!raw) return null;

  let host: string;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return null;
    host = parsed.hostname;
  } catch {
    return null; // 상대경로·깨진 값
  }

  return ALLOWED_IMAGE_HOSTS.has(host) ? raw : null;
}

/**
 * 세모 대분류 → 대표 «그림»(2026-10-03, 사진 없는 상품이 77% 라 목록이 회색 판으로 덮인다는 대표 지적).
 *
 * 사진이 아니라 **선 그림 + «대표 이미지» 캡션**이다. 관계없는 스톡 사진은 손님이 상품
 * 사진으로 읽지만, 파스텔 바탕의 아이콘은 «이 분류의 상품» 으로만 읽힌다. 그래서 아래
 * `pickImage` 의 원칙(관계없는 사진은 안 붙인다)을 깨지 않는다.
 *
 * 키는 운영 세모의 대분류 이름 20개를 `normalizeCategory` 로 접은 값이다. 대분류 이름이
 * 바뀌거나 새로 생기면 여기 없으니 «사진 준비 중» 으로 떨어진다(틀린 그림보다 낫다).
 */
const CATEGORY_IMAGE_BY_ROOT: Record<string, string> = {
  금고사무용가구: "/images/category/office-furniture.svg",
  기타: "/images/category/etc.svg",
  도장상패: "/images/category/stamp-plaque.svg",
  디자인문구학용품: "/images/category/stationery.svg",
  디지털가전: "/images/category/digital-appliance.svg",
  모바일쿠폰: "/images/category/mobile-coupon.svg",
  미술화방용품: "/images/category/art-supplies.svg",
  복사용지지류용품: "/images/category/paper.svg",
  사무기기: "/images/category/office-machines.svg",
  사무용품: "/images/category/office-supplies.svg",
  산업mro자재: "/images/category/industrial-mro.svg",
  생활주방: "/images/category/living-kitchen.svg",
  식품건강: "/images/category/food-health.svg",
  실험연구실: "/images/category/lab-research.svg",
  잉크토너드럼: "/images/category/ink-toner.svg",
  취미레저계절: "/images/category/hobby-leisure.svg",
  패션뷰티: "/images/category/fashion-beauty.svg",
  필기구: "/images/category/writing-instruments.svg",
  화일바인더: "/images/category/file-binder.svg",
  선장품: "/images/category/seonjang.svg",
};

/** 대분류 이름 비교용 — 공백·`/`·`·`·`&` 를 걷고 영문은 소문자로. «생활·주방» = «생활/주방». */
export function normalizeCategory(name: string | null | undefined): string {
  return (name ?? "").replace(/[\s/·&]/g, "").toLowerCase();
}

/** 대분류 그림. 모르는 대분류면 `null`. */
export function categoryImage(rootCategoryName: string | null | undefined): string | null {
  const key = normalizeCategory(rootCategoryName);
  return key ? CATEGORY_IMAGE_BY_ROOT[key] ?? null : null;
}

/**
 * 세모 카탈로그엔 상품 이미지가 거의 없다. 카테고리·품명으로 가장 가까운 대표 이미지를
 * 고르되, 하나도 안 걸리면 대분류 그림, 그것도 없으면 «사진 없음» 판으로 떨어진다.
 *
 * 예전 몰은 여기서 이름 해시로 아무 사진이나 배정했다. 목록에서 상품이 구분되긴 하지만
 * 손님이 그 사진을 상품 사진으로 읽는다 — 관계없는 사진을 붙이느니 없다고 말하는 게 낫다.
 * 대분류 그림은 사진이 아니라 «대표 이미지» 라고 적힌 그림이라 이 원칙 안에 있다.
 */
export function pickImage(
  categoryName: string | null | undefined,
  rootCategoryName: string | null | undefined,
  name: string,
): string {
  const hay = `${categoryName ?? ""} ${name ?? ""}`.toLowerCase();

  // 선장품은 카테고리로만 가른다 — 품명(치약·세제·휴지…)으로 걸면 아래 규칙에 흩어진다.
  if (/선장품/.test(categoryName ?? "")) return PRODUCT_IMAGES.seonjang;
  if (/시약|reagent|용액|solution|acid|alcohol|산\b|수산화/.test(hay)) return PRODUCT_IMAGES.reagent;
  if (/초자|유리|glass|비커|플라스크|flask|beaker|메스/.test(hay)) return PRODUCT_IMAGES.glass;
  if (/세제|세정|린스|표백|살균|소독/.test(hay)) return PRODUCT_IMAGES.color;
  if (/장갑|마스크|보호|위생|ppe/.test(hay)) return PRODUCT_IMAGES.ppe;
  if (/배지|페트리|petri|샬레/.test(hay)) return PRODUCT_IMAGES.petri;
  if (/냄비|솥|팬|주방|용기|보관|밀폐|텀블러|컵/.test(hay)) return PRODUCT_IMAGES.ware;
  if (/장비|기기|instrument|장치|계측/.test(hay)) return PRODUCT_IMAGES.special;

  return categoryImage(rootCategoryName) ?? PRODUCT_IMAGES.placeholder;
}

/** 피드 한 줄의 이미지 — 피드가 준 실제 사진이 언제나 먼저다. */
export function productImage(row: {
  imageUrl?: string | null;
  categoryName?: string | null;
  rootCategoryName?: string | null;
  name: string;
}): string {
  return remoteImage(row.imageUrl) ?? pickImage(row.categoryName, row.rootCategoryName, row.name);
}
