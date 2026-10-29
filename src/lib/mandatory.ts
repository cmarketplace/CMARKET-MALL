/**
 * 의무구매(법적 구매) 제도 — 세모 피드의 코드 → 화면 이름.
 *
 * 판정(어떤 인증·표시가 어느 제도인지)은 세모가 DB 함수 하나로 한다. 몰은 코드를 받아 그리기만 한다.
 *
 * 업체 제도(여성·장애인·창업·사회적·중증·표준사업장·중소)는 «그 업체에게 사야» 실적이다 — 상세 판매처 줄에
 * 배지가 붙은 판매처를 골라야 한다. 제품 제도(기술개발·녹색·혁신)는 품명·규격에 인증 표시가 있는 상품이다.
 */
export const MANDATORY_LABELS: Readonly<Record<string, string>> = {
  severe: "중증장애인생산품",
  disabled: "장애인기업",
  standard: "장애인표준사업장",
  women: "여성기업",
  social: "사회적기업",
  startup: "창업기업",
  sme: "중소기업",
  tech: "기술개발제품",
  green: "녹색제품",
  innovation: "혁신제품",
};

/** 섹션 칩 한 칸(세모 `GET …/mandatory-programs`) */
export interface MandatoryProgramCount {
  code: string;
  label: string;
  scope: "company" | "product";
  itemCount: number;
}

export interface MandatoryProgramIndex {
  programs: MandatoryProgramCount[];
  /** 제도 하나라도 해당하는 상품 수(겹침 제외) */
  total: number;
}

/** «법적 구매» 탭 전체 = 제도 하나라도 해당 */
export const ANY_PROGRAM = "any";

/**
 * 상품 카드 배지. 중소기업은 몰 상품의 절반 이상이 해당해 배지로 달면 소음이라 뺀다(칩으로는 고를 수 있다).
 */
const CARD_HIDDEN = new Set(["sme"]);

export function cardBadges(programs: readonly string[] | undefined, max = 2): string[] {
  return (programs ?? [])
    .filter(code => !CARD_HIDDEN.has(code) && MANDATORY_LABELS[code])
    .slice(0, max)
    .map(code => MANDATORY_LABELS[code]);
}

/** 판매처 줄 배지 — 업체 제도 전부(중소기업 포함: 판매처를 고를 때는 그것도 실적이다) */
export function offerBadges(programs: readonly string[] | undefined): string[] {
  return (programs ?? []).filter(code => MANDATORY_LABELS[code]).map(code => MANDATORY_LABELS[code]);
}
