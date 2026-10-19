"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { Product } from "../product.data";
import RecommendedProducts from "./RecommendedProducts";

type SectionId = "overview" | "specifications" | "delivery" | "reviews";

interface ProductDetailTabsProps {
  product: Product;
  products: Product[];
  detailSpecs: [string, string][];
  /**
   * 납품 사진 후기 칸 — 반응 스위치(`SHOP_REACTIONS`)가 켜졌을 때만 상세 화면이 넘긴다.
   * 없으면 탭·섹션이 지금과 똑같다.
   */
  reviewsSection?: React.ReactNode;
}

export default function ProductDetailTabs({
  product,
  products,
  detailSpecs,
  reviewsSection,
}: ProductDetailTabsProps) {
  const hasSpecifications = detailSpecs.length > 0;
  const hasRecommendations = products.some(item => item.id !== product.id);
  const hasReviews = Boolean(reviewsSection);
  const sections = useMemo(
    () => [
      ...(hasSpecifications ? [{ id: "specifications" as const, label: "규격 정보" }] : []),
      { id: "overview" as const, label: "상품 정보" },
      { id: "delivery" as const, label: "배송 안내" },
      ...(hasReviews ? [{ id: "reviews" as const, label: "후기" }] : []),
    ],
    [hasSpecifications, hasReviews],
  );
  const [activeSection, setActiveSection] = useState<SectionId>(
    hasSpecifications ? "specifications" : "overview",
  );

  useEffect(() => {
    const detailPathname = window.location.pathname;

    const updateActiveSection = () => {
      if (window.location.pathname !== detailPathname) return;

      const activationLine = 160;
      let currentSection = sections[0].id;
      let closestDistance = Number.POSITIVE_INFINITY;

      sections.forEach(section => {
        const element = document.getElementById(section.id);
        if (!element) return;

        const distance = Math.abs(element.getBoundingClientRect().top - activationLine);
        if (distance < closestDistance) {
          closestDistance = distance;
          currentSection = section.id;
        }
      });

      setActiveSection(previous => (previous === currentSection ? previous : currentSection));
      const nextHash = `#${currentSection}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}${nextHash}`,
        );
      }
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [sections]);

  const selectSection = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${sectionId}`,
    );
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mt-14">
      <nav
        aria-label="상품 상세 바로가기"
        // 좁은 화면에서 탭이 넘치면 밀어서 볼 수 있어야 하므로 overflow-x-auto 는
        // 남기되, 막대 3개짜리 내비에 스크롤바가 그려지는 건 군더더기라 감춘다.
        className="sticky top-16 z-40 flex overflow-x-auto border-b border-bg bg-white/95 text-center text-sm backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map(section => (
          <button
            key={section.id}
            type="button"
            aria-current={activeSection === section.id ? "location" : undefined}
            onClick={() => selectSection(section.id)}
            /* 120px × 3 = 360px 이라 320~375px 화면에서는 탭바가 화면을 넘겼다.
             * nav 가 `overflow-x-auto` 라 «밀어서» 볼 수는 있지만, 세 개짜리 탭을
             * 옆으로 밀게 만들 이유가 없다 — 좁은 화면에서는 최소폭을 줄여 세 개가
             * 한 화면에 들어오게 하고, 넓은 화면에서만 기존 120px 를 유지한다. */
            className={`relative min-w-[88px] flex-1 cursor-pointer px-3 py-4 transition-colors sm:min-w-[120px] sm:px-4 ${
              activeSection === section.id
                ? "font-semibold text-primary"
                : "font-medium text-muted hover:text-text"
            }`}
          >
            {section.label}

            {/* 탭 폭 전체가 아니라 짧은 막대로 표시한다. 버튼 안쪽(bottom-0)에 두어야
              * 음수 마진 없이 기준선에 닿는다 — 밖으로 밀면 overflow-x-auto 인 nav 가
              * 넘친 만큼을 스크롤로 잡아 세로 스크롤바가 생긴다. */}
            {activeSection === section.id && (
              <span
                aria-hidden="true"
                className="bg-primary absolute bottom-0 left-1/2 h-[3px] w-9 -translate-x-1/2 rounded-full"
              />
            )}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {hasSpecifications && (
          <section
            id="specifications"
            aria-labelledby="specifications-heading"
            style={{ scrollMarginTop: "10rem" }}
          >
            <h2 id="specifications-heading" className="text-xl font-semibold text-text">
              상품 규격
            </h2>
            <div className="mt-5 overflow-x-auto">
              {/* 두 칸짜리 표에 480px 최소폭을 걸어 두어 **모든 휴대폰에서 표가 옆으로
                * 잘렸다**(390px 화면의 본문 폭은 350px). 값은 `break-words` 로 이미
                * 접히므로 좁은 화면에서는 최소폭을 풀어 화면 안에 넣고, 여유가 생기는
                * 화면에서만 기존 480px 를 지킨다. */}
              <table className="w-full table-fixed text-sm sm:min-w-[480px]">
                <thead className="bg-light-soft text-left text-muted">
                  <tr>
                    <th scope="col" className="w-1/3 px-5 py-3 font-medium sm:w-2/5">
                      항목
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      상세 정보
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bg">
                  {detailSpecs.map(([label, value]) => (
                    <tr key={label} className="bg-white">
                      <th
                        scope="row"
                        className="px-5 py-4 text-left font-medium text-muted"
                      >
                        {label}
                      </th>
                      <td className="break-words px-5 py-4 text-left font-semibold text-text">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section
          id="overview"
          aria-labelledby="overview-heading"
          style={{ scrollMarginTop: "10rem" }}
          className={hasSpecifications ? "mt-14" : undefined}
        >
          <div>
            <h2 id="overview-heading" className="rounded-xl bg-light-soft px-5 py-4 text-xl font-semibold text-text">
              상품 설명
            </h2>
            <p className="mt-5 text-sm leading-7 text-muted">{product.desc}</p>
            <ul className="mt-6 space-y-3">
              {product.features.map(feature => (
                <li key={feature} className="flex items-center gap-3 text-sm text-text">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 space-y-4">
            {[0, 1, 2].map(index => (
              <div
                key={index}
                className="relative aspect-[16/9] w-full overflow-hidden bg-light-soft"
              >
                <Image
                  src={product.img}
                  alt={`${product.name} 상세 ${index + 1}`}
                  fill
                  sizes="(max-width: 1256px) 100vw, 1136px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>

        <section
          id="delivery"
          aria-labelledby="delivery-heading"
          style={{ scrollMarginTop: "10rem" }}
          className="mt-14"
        >
          <h2 id="delivery-heading" className="text-xl font-semibold text-text">
            배송 및 주문 안내
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-bg p-5">
              <p className="text-xs font-semibold text-primary">납품 안내</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                주문 확정 후 승인 공급사를 통해 납기 일정이 안내됩니다.
              </p>
            </div>
            <div className="rounded-xl bg-bg p-5">
              <p className="text-xs font-semibold text-primary">문의 안내</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                규격 및 대량 구매 문의는 주문 요청 시 함께 남겨주세요.
              </p>
            </div>
          </div>
        </section>

        {hasReviews && (
          <section
            id="reviews"
            aria-labelledby="reviews-heading"
            style={{ scrollMarginTop: "10rem" }}
            className="mt-14"
          >
            <h2 id="reviews-heading" className="text-xl font-semibold text-text">
              납품 사진 후기
            </h2>
            {reviewsSection}
          </section>
        )}

        {hasRecommendations && (
          <div id="recommendations" className="scroll-mt-36">
            <RecommendedProducts products={products} currentProductId={product.id} />
          </div>
        )}
      </div>
    </div>
  );
}
