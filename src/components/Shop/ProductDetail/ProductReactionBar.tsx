"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { useShop } from "@/app/providers/ShopProvider";
import type { SocialProof } from "@/lib/reaction-types";

import SocialProofBadge from "../SocialProofBadge";

/**
 * 상세 화면 찜·사회적 증거 줄 — 반응 스위치가 켜졌을 때만 상세 화면이 그린다.
 *
 * 찜하면 가격이 내리거나 다시 들어올 때 하루 한 번 알려 준다(세모 앱 벨·«내 찜» 화면).
 */
export default function ProductReactionBar({
  productId,
  productName,
  socialProof,
}: {
  productId: string;
  productName: string;
  socialProof: SocialProof | null;
}) {
  const { isBookmarked, toggleBookmark } = useShop();
  const wished = isBookmarked(productId);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => toggleBookmark(productId)}
        aria-pressed={wished}
        aria-label={`${productName} 찜 ${wished ? "해제" : "하기"}`}
        className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${
          wished ? "bg-rose-50 text-rose-600" : "bg-bg text-text hover:bg-bg-secondary"
        }`}
      >
        <Heart size={16} strokeWidth={1.8} fill={wished ? "currentColor" : "none"} />
        {wished ? "찜함" : "찜하기"}
      </button>
      {wished && (
        <Link href="/shop/wishlist" className="text-muted hover:text-primary text-xs underline-offset-2 hover:underline">
          가격이 내리거나 다시 들어오면 알려 드려요 · 내 찜 보기
        </Link>
      )}
      {socialProof && <SocialProofBadge proof={socialProof} />}
    </div>
  );
}
