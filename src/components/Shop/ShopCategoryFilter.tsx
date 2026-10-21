"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import type { MajorCategory } from "./Shop";

interface ShopCategoryFilterProps {
  /** 피드에 실제로 있는 카테고리. 하드코딩하면 실제 데이터와 어긋난다. */
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  majorCategories: readonly MajorCategory[];
  activeMajorCategory: MajorCategory;
  onMajorCategoryChange: (category: MajorCategory) => void;
}

type CategoryIconVariant = "grid" | "tag" | "mail" | "pencil" | "eraser" | "book" | "pen" | "magnet" | "ruler" | "clip" | "scissors" | "palette" | "lab" | "shield" | "box";

const iconPalettes = [
  { strong: "#006CD1", soft: "#BFDCF6" },
  { strong: "#FF5D6C", soft: "#FFC9CF" },
  { strong: "#12AD80", soft: "#BDEBDD" },
  { strong: "#FF8A3D", soft: "#FFD7BC" },
  { strong: "#8E62E8", soft: "#DCCCF8" },
  { strong: "#00A5C8", soft: "#B9E8F1" },
];

/**
 * 세모 대분류 20개 → 아이콘. 목록이 DB 에서 고정되어 있으므로 추측하지 않고 못박는다.
 * (세모 items_v2_categories 의 최상위 계층. 2026-08-18 기준)
 *
 * 여기 없는 이름이 오면 아래 정규식으로 넘어간다 — 말단 카테고리 칩과, 대분류가
 * 새로 생겼는데 이 표를 아직 못 고친 경우를 함께 받아 준다.
 */
const MAJOR_CATEGORY_ICONS: Record<string, CategoryIconVariant> = {
  "실험/연구실": "lab",
  "사무용품": "tag",
  "필기구": "pen",
  "사무기기": "book",
  "복사용지&지류용품": "mail",
  "화일/바인더": "book",
  "잉크/토너/드럼": "pen",
  "디자인문구/학용품": "pencil",
  "미술/화방용품": "palette",
  "도장/상패": "clip",
  "금고/사무용가구": "box",
  "산업/MRO자재": "shield",
  "디지털/가전": "box",
  "생활/주방": "scissors",
  "식품/건강": "box",
  "패션/뷰티": "palette",
  "취미/레저/계절": "palette",
  "모바일쿠폰": "mail",
  "선장품": "box",
  "법적 구매": "shield",
  "기타": "box",
};

function iconForCategory(category: string): CategoryIconVariant {
  if (category === "전체") return "grid";
  // 법적 구매 칩(의무구매 제도 이름)
  if (/장애인|생산품|표준사업장|여성기업|사회적기업|창업기업|중소기업|기술개발제품|녹색제품|혁신제품/.test(category)) return "shield";

  const major = MAJOR_CATEGORY_ICONS[category];
  if (major) return major;

  if (/봉투|서식|장부/.test(category)) return "mail";
  if (/샤프|연필/.test(category)) return "pencil";
  if (/수정펜|지우개/.test(category)) return "eraser";
  if (/제본/.test(category)) return "book";
  if (/유성펜|수성펜|볼펜|마커/.test(category)) return "pen";
  if (/자석/.test(category)) return "magnet";
  if (/제도|자\/각도기/.test(category)) return "ruler";
  if (/집게|클립|크립|핀|책철/.test(category)) return "clip";
  if (/칼|가위/.test(category)) return "scissors";
  if (/미술|학용/.test(category)) return "palette";
  if (/시약|용액|화학|산|알코올|초자|유리|비커|플라스크/.test(category)) return "lab";
  if (/사무|문구|명찰|용지/.test(category)) return "tag";
  if (/위생|보호|장갑|마스크/.test(category)) return "shield";
  return "box";
}

function FilledCategoryIcon({ variant, active, palette }: { variant: CategoryIconVariant; active: boolean; palette: (typeof iconPalettes)[number] }) {
  const main = "fill-[var(--icon-main)]";
  const detail = "fill-[var(--icon-detail)]";
  const iconStyle = {
    "--icon-main": active ? palette.strong : palette.soft,
    "--icon-detail": active ? "#FFFFFF" : "var(--color-light-soft)",
  } as CSSProperties;
  const gesture = {
    grid: "rotate-[-2deg]",
    tag: "rotate-[4deg]",
    mail: "rotate-[-3deg]",
    pencil: "rotate-[2deg]",
    eraser: "rotate-[-4deg]",
    book: "rotate-[2deg]",
    pen: "rotate-[-2deg]",
    magnet: "rotate-[3deg]",
    ruler: "rotate-[-3deg]",
    clip: "rotate-[5deg]",
    scissors: "rotate-[-4deg]",
    palette: "rotate-[3deg]",
    lab: "rotate-[-2deg]",
    shield: "rotate-[2deg]",
    box: "rotate-[-2deg]",
  }[variant];

  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" style={iconStyle} className={`h-7 w-7 origin-center transition-transform duration-200 group-hover:scale-105 ${gesture}`}>
      {variant === "grid" && <><rect x="5" y="5" width="9" height="9" rx="3.5" className={main}/><rect x="18" y="5" width="9" height="9" rx="3.5" className={main}/><rect x="5" y="18" width="9" height="9" rx="3.5" className={main}/><rect x="18" y="18" width="9" height="9" rx="3.5" className={main}/></>}
      {variant === "tag" && <><path d="M4 9c0-3 2-5 5-5h7.2c1.3 0 2.5.5 3.4 1.4l7 7a5.5 5.5 0 0 1 0 7.8l-6.4 6.4a5.5 5.5 0 0 1-7.8 0l-7-7A5 5 0 0 1 4 16.2V9Z" className={main}/><circle cx="10.5" cy="10.5" r="2.7" className={detail}/></>}
      {variant === "mail" && <><rect x="3" y="7" width="26" height="18" rx="7" className={main}/><path d="M6 11.2c0-1.1 1.3-1.7 2.1-1L16 16.4l7.9-6.2c.9-.7 2.1-.1 2.1 1 0 .5-.2.9-.6 1.2l-7.2 5.7a3.6 3.6 0 0 1-4.4 0l-7.2-5.7c-.4-.3-.6-.7-.6-1.2Z" className={detail}/></>}
      {variant === "pencil" && <><path d="m6 23 2.2-7.2L21.5 2.5l8 8-13.3 13.3L9 26l-3-3Z" className={main}/><path d="m8.2 15.8 8 8-5.3 1.3-4-4 1.3-5.3ZM19.3 4.7l8 8-2.2 2.2-8-8 2.2-2.2Z" className={detail}/></>}
      {variant === "eraser" && <><path d="M5.4 19.2 17.2 7.4a4 4 0 0 1 5.6 0l2.8 2.8a4 4 0 0 1 0 5.6L15.4 26H9.2l-3.8-3.8a2.1 2.1 0 0 1 0-3Z" className={main}/><path d="m10.6 14 7.4 7.4-4.2 4.1H9.5l-3.2-3.2a1.7 1.7 0 0 1 0-2.4l4.3-5.9Z" className={detail}/></>}
      {variant === "book" && <><rect x="4" y="13" width="24" height="16" rx="5" className={main}/><rect x="7" y="9" width="17" height="9" rx="3.5" className={main}/><rect x="22" y="2" width="5" height="15" rx="2.5" transform="rotate(-12 22 2)" className={main}/><rect x="9" y="12" width="12" height="3" rx="1.5" className={detail}/><circle cx="9" cy="23" r="1.5" className={detail}/><circle cx="13.5" cy="23" r="1.5" className={detail}/><circle cx="18" cy="23" r="1.5" className={detail}/><circle cx="22.5" cy="23" r="1.5" className={detail}/></>}
      {variant === "pen" && <><path d="M7 25 9.5 16 22 3.5l6.5 6.5L16 22.5 7 25Z" className={main}/><path d="m9.5 16 6.5 6.5-4.2 1.2-3.5-3.5 1.2-4.2ZM20 5.5l6.5 6.5-2 2L18 7.5l2-2Z" className={detail}/></>}
      {variant === "magnet" && <><path d="M4 5h9v11a3 3 0 0 0 6 0V5h9v11a12 12 0 0 1-24 0V5Z" className={main}/><path d="M10 11h3v5a3 3 0 0 0 6 0v-5h3v5a6 6 0 0 1-12 0v-5Z" className={detail}/><rect x="4" y="5" width="9" height="6" rx="2.5" className={detail}/><rect x="19" y="5" width="9" height="6" rx="2.5" className={detail}/></>}
      {variant === "ruler" && <><path d="M4.8 19.2 19.2 4.8a4 4 0 0 1 5.6 0l2.4 2.4a4 4 0 0 1 0 5.6L12.8 27.2a4 4 0 0 1-5.6 0l-2.4-2.4a4 4 0 0 1 0-5.6Z" className={main}/><rect x="18.2" y="7.2" width="2.5" height="5" rx="1.25" transform="rotate(-45 18.2 7.2)" className={detail}/><rect x="14" y="11.4" width="2.5" height="4" rx="1.25" transform="rotate(-45 14 11.4)" className={detail}/><rect x="9.8" y="15.6" width="2.5" height="5" rx="1.25" transform="rotate(-45 9.8 15.6)" className={detail}/></>}
      {variant === "clip" && <path fillRule="evenodd" d="M21.8 3.3a7.2 7.2 0 0 1 5.1 12.3L14.7 27.8a5.8 5.8 0 0 1-8.2-8.2L17.4 8.7a4.2 4.2 0 1 1 5.9 5.9l-9.7 9.7-2.9-2.9 9.7-9.7a1.1 1.1 0 0 0-1.6-1.6L7.9 21a3.8 3.8 0 0 0 5.4 5.4l12.2-12.2a5.2 5.2 0 0 0-7.4-7.4L9.4 15.5l-2.9-2.9 8.7-8.7a7.2 7.2 0 0 1 6.6-.6Z" className={main}/>
      }
      {variant === "scissors" && <><path d="m14 14 14-8-2 6-9 5 9 5 2 6-14-8-4 4a5 5 0 1 1-3-3l4-4-4-4a5 5 0 1 1 3-3l4 4Z" className={main}/><circle cx="7" cy="9" r="2" className={detail}/><circle cx="7" cy="25" r="2" className={detail}/></>}
      {variant === "palette" && <><path d="M16 3C8.8 3 3 8.2 3 14.7 3 21 8 26 14.2 26H17a2.5 2.5 0 0 0 1.4-4.6 2.7 2.7 0 0 1 1.5-5h4.2c3 0 4.9-2.4 4.9-5C29 6.8 23.4 3 16 3Z" className={main}/><circle cx="10" cy="11" r="2" className={detail}/><circle cx="16" cy="8" r="2" className={detail}/><circle cx="22" cy="11" r="2" className={detail}/><circle cx="9" cy="17" r="2" className={detail}/></>}
      {variant === "lab" && <><path d="M11 3h10v3l-2 2v5l8 12a3 3 0 0 1-2.5 4h-17A3 3 0 0 1 5 25l8-12V8l-2-2V3Z" className={main}/><path d="M9 22h14l2.2 3.4c.4.7 0 1.6-.8 1.6H7.6c-.8 0-1.2-.9-.8-1.6L9 22Z" className={detail}/><circle cx="13" cy="20" r="1.5" className={detail}/></>}
      {variant === "shield" && <><path d="m16 2 12 5v8c0 7.5-5 12.5-12 15C9 27.5 4 22.5 4 15V7l12-5Z" className={main}/><path d="m10 16 4 4 8-9-3-2-5 6-2-2-2 3Z" className={detail}/></>}
      {variant === "box" && <><path d="m16 2 13 7-13 7L3 9l13-7Z" className={main}/><path d="M3 12.5 14 18v12L3 24.5v-12ZM29 12.5 18 18v12l11-5.5v-12Z" className={main}/><path d="m9 6 13 7-3 1.6L6 7.6 9 6Z" className={detail}/></>}
    </svg>
  );
}

export default function ShopCategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
  majorCategories,
  activeMajorCategory,
  onMajorCategoryChange,
}: ShopCategoryFilterProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const majorMenuRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isMajorMenuOpen, setIsMajorMenuOpen] = useState(false);

  const updateScrollControls = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    // snap padding과 브라우저의 소수점 보정값만으로 왼쪽 화살표가 나타나지 않게 한다.
    setCanScrollLeft(carousel.scrollLeft > 24);
    setCanScrollRight(carousel.scrollLeft + carousel.clientWidth < carousel.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    updateScrollControls();
    const resizeObserver = new ResizeObserver(updateScrollControls);
    resizeObserver.observe(carousel);
    window.addEventListener("resize", updateScrollControls);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollControls);
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [categories, updateScrollControls]);

  useEffect(() => {
    const closeMajorMenu = (event: PointerEvent) => {
      if (!majorMenuRef.current?.contains(event.target as Node)) setIsMajorMenuOpen(false);
    };
    const closeMajorMenuWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMajorMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeMajorMenu);
    document.addEventListener("keydown", closeMajorMenuWithKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeMajorMenu);
      document.removeEventListener("keydown", closeMajorMenuWithKeyboard);
    };
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollLeft = 0;
    updateScrollControls();
  }, [activeMajorCategory, updateScrollControls]);

  const scrollCategories = (direction: -1 | 1) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    const start = carousel.scrollLeft;
    const distance = Math.max(280, carousel.clientWidth * 0.72) * direction;
    const target = Math.max(0, Math.min(start + distance, carousel.scrollWidth - carousel.clientWidth));
    const startedAt = performance.now();
    const duration = 460;

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      carousel.scrollLeft = start + (target - start) * eased;
      updateScrollControls();

      if (progress < 1) animationRef.current = requestAnimationFrame(animate);
      else animationRef.current = null;
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <section className="border-b border-bg bg-white py-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-xl font-semibold text-text">카테고리</h2>
        <div ref={majorMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMajorMenuOpen(open => !open)}
            aria-haspopup="listbox"
            aria-expanded={isMajorMenuOpen}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-bg px-3.5 py-2 text-lg font-semibold text-text transition-colors hover:bg-bg-secondary"
          >
            {activeMajorCategory}
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-primary">
              <ChevronDown aria-hidden="true" size={17} strokeWidth={2} className={`transition-transform duration-200 ${isMajorMenuOpen ? "rotate-180" : ""}`} />
            </span>
          </button>

          {isMajorMenuOpen && (
            <div
              role="listbox"
              aria-label="대분류"
              className="absolute top-full left-0 z-30 mt-2 min-w-40 overflow-hidden rounded-xl bg-white p-1.5 shadow-[0_12px_32px_rgba(24,45,82,0.16)]"
            >
              {majorCategories.map(category => {
                const isSelected = category === activeMajorCategory;
                return (
                  <button
                    key={category}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onMajorCategoryChange(category);
                      setIsMajorMenuOpen(false);
                    }}
                    className={`block w-full cursor-pointer rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${isSelected ? "bg-highlight-soft font-semibold text-highlight-strong" : "text-muted hover:bg-primary hover:text-white"}`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="relative mt-5">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollCategories(-1)}
            aria-label="이전 카테고리 보기"
            /* 화살표는 컨테이너 밖으로 절반이 나와 있다. 데스크톱에선 여백이 받아 주지만
             * 모바일에선 컨테이너가 화면 폭 그대로라 오른쪽 화살표가 뷰포트를 22px 넘겨
             * **페이지에 가로 스크롤을 만든다**(390px 에서 문서 폭 392px 실측).
             * 손가락으로 미는 게 기본이고 화살표는 넓은 화면의 보조 수단이라는 게
             * DESIGN.md 의 규칙이므로, 좁은 화면에서는 아예 내린다. */
            className="absolute top-7 left-0 z-10 hidden h-11 w-11 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-primary shadow-[0_6px_22px_rgba(24,45,82,0.16)] transition-all duration-200 sm:flex"
          >
            <ChevronLeft aria-hidden="true" size={23} strokeWidth={2.2} />
          </button>
        )}

        <div
          ref={carouselRef}
          onScroll={updateScrollControls}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] sm:gap-4 [&::-webkit-scrollbar]:hidden"
        >
          {["전체", ...categories].map((category, index) => {
            const isActive = activeCategory === category;
            const iconVariant = iconForCategory(category);
            const palette = iconPalettes[index % iconPalettes.length];

            return (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryChange(category)}
                className="group w-20 shrink-0 snap-start cursor-pointer text-left"
              >
                <span
                  className="flex aspect-square items-center justify-center rounded-[26px] transition-all duration-200 sm:rounded-[30px]"
                  style={{ backgroundColor: isActive ? `${palette.strong}1F` : "var(--color-bg)" }}
                >
                  <FilledCategoryIcon variant={iconVariant} active={isActive} palette={palette} />
                </span>
                <span
                  className={`mt-2 block truncate text-center text-sm ${
                    isActive ? "font-semibold text-primary" : "font-medium text-muted"
                  }`}
                >
                  {category}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollCategories(1)}
          disabled={!canScrollRight}
          aria-label="다음 카테고리 보기"
          className={`absolute top-7 right-0 z-10 hidden h-11 w-11 translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-primary shadow-[0_6px_22px_rgba(24,45,82,0.16)] transition-all duration-200 disabled:pointer-events-none disabled:opacity-0 sm:flex ${canScrollRight ? "scale-100" : "scale-90"}`}
        >
          <ChevronRight aria-hidden="true" size={23} strokeWidth={2.2} />
        </button>
      </div>
    </section>
  );
}
