import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import ShopNav from "@/components/Shop/ShopNav";
import DetailStatusIcon from "@/components/Shop/ProductDetail/DetailStatusIcon";
import ProductPurchase from "@/components/Shop/ProductDetail/ProductPurchase";
import ProductDetailTabs from "@/components/Shop/ProductDetail/ProductDetailTabs";
import {
  fetchProductWithOffers,
  fetchRelatedProducts,
  isStubCatalog,
  maskForViewer,
  maskProducts,
  SemoFeedError,
} from "@/lib/catalog";
import { getShopMember } from "@/lib/shop-member";

interface ProductDetailPageProps {
  params: Promise<{ productId: string }>;
}

// «누가 보는가» 에 따라 실명이 가려지므로 요청마다 그린다.
export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId } = await params;

  /*
   * 필요한 것만 부른다 — 상품+공급사별 값 / 같은 카테고리 추천 / 보는 사람.
   * 실명 가림은 **서버**에서 한다: 비로그인 응답에 이름이 실리면 소스보기로 보인다.
   */
  let loaded;
  let member;
  try {
    [loaded, member] = await Promise.all([fetchProductWithOffers(productId), getShopMember()]);
  } catch (error) {
    // 피드 장애는 목록·홈처럼 여기서도 화면으로 접는다. 던지면 상세만 500 이 되고, 손님은
    // «이 상품이 사라졌다» 로 읽는다(운영에서 실제로 났던 사고 — 키는 있는데 피드가 거절).
    if (!(error instanceof SemoFeedError)) throw error;
    console.error("[shop/detail]", error.message);
    return <FeedUnavailable />;
  }
  if (!loaded) notFound();

  const tier = member?.tier ?? null;
  const product = maskForViewer(loaded, tier);
  // 추천은 곁들이는 칸이다 — 못 받아도 상세는 떠야 한다.
  const related = await fetchRelatedProducts(product.categoryId).catch((error: unknown) => {
    if (!(error instanceof SemoFeedError)) throw error;
    console.error("[shop/detail related]", error.message);
    return [];
  });
  const products = maskProducts(related, tier).filter(item => item.id !== product.id);

  const detailSpecs = [
    ["제조사", product.manufacturer],
    ["브랜드", product.brand],
    ["단위", product.unit],
    ["규격", product.spec1],
    [product.codeLabel === "CAS" ? "CAS" : "재질·타입", product.spec2],
    ["패키징", product.spec3],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <main className="min-h-screen bg-white">
      <ShopNav showBack />

      <div className="container-shop pb-24 pt-6">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,.9fr)_minmax(460px,1.1fr)] lg:gap-14 xl:gap-20">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-xl bg-light-soft">
              <Image
                src={product.img}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.015]"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-primary">{product.tag}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-highlight-soft px-2.5 py-1 text-xs font-semibold text-highlight-strong">
                <DetailStatusIcon variant="availability" className="h-[15px] w-[15px]" />
                {product.offerCount > 1 ? `${product.offerCount}개 공급사 판매 중` : "구매 가능"}
              </span>
            </div>

            <h1 className="mt-5 max-w-2xl text-2xl font-semibold leading-[1.3] text-text sm:text-3xl">
              {product.name}
            </h1>

            {product.code && (
              <p className="mt-3 text-xs text-muted">
                {product.codeLabel || "품번"} <span className="ml-2 font-medium text-text">{product.code}</span>
              </p>
            )}

            {/* 가림은 보기 등급(tier), 업체 선택은 고객 유형 — 실명이 보이는 직원도 업체는 고르지 않는다. */}
            <ProductPurchase
              product={product}
              isStub={isStubCatalog()}
              restricted={tier !== "FULL"}
              canChooseSupplier={member?.customerType === "INSTITUTION"}
            />
          </div>
        </section>

        <ProductDetailTabs product={product} products={products} detailSpecs={detailSpecs} />
      </div>
    </main>
  );
}

function FeedUnavailable() {
  return (
    <main className="min-h-screen bg-white">
      <ShopNav showBack />
      <div className="container-shop py-16 text-center">
        <h1 className="text-text text-xl font-semibold">상품 정보를 불러오지 못했습니다</h1>
        <p className="text-muted mt-2 text-sm leading-6">
          세모 물품관리시스템 연결이 잠시 끊겼습니다. 잠시 후 다시 열어 주세요.
        </p>
        <Link
          href="/shop"
          className="bg-primary hover:bg-primary-dark mt-6 inline-block rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
