/**
 * 상품 카드에 보일 «규격» 한 줄.
 *
 * 대표 2026-10-21 «제품리스트에 규격이 안 보여서 규격만 다른 제품들이 같은 제품명으로 반복돼 보임».
 * 세모 품목은 이름이 같고 규격(spec1~3)만 다른 경우가 많다(몰 기준 288묶음) — 카드에 규격이 없으면
 * 같은 상품이 여러 번 보이는 것처럼 읽힌다.
 *
 * 이름에 이미 들어 있는 규격은 다시 쓰지 않는다(«각티슈 200매*3p» 에 «200매*3p» 를 또 붙이지 않음).
 * 비교는 띄어쓰기·기호를 빼고 한다.
 */

const keyOf = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣一-龥]/g, "");

export function specLabel(
  name: string | null | undefined,
  ...specs: Array<string | null | undefined>
): string {
  const nameKey = keyOf(name ?? "");
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const raw of specs) {
    const spec = raw?.trim();
    if (!spec) continue;
    const k = keyOf(spec);
    if (!k || seen.has(k) || nameKey.includes(k)) continue;
    seen.add(k);
    parts.push(spec);
  }
  return parts.join(" · ");
}
