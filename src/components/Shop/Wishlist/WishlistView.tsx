"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, Heart } from "lucide-react";

import { formatKDateTime } from "@/lib/kdate";
import type { ReactionAlert, WishlistEntry } from "@/lib/reaction-types";

import ProductCard from "../ProductCard";

interface WishlistPayload {
  items: WishlistEntry[];
  unavailableCount: number;
}

const won = (value: number) => `${Math.round(value).toLocaleString("ko-KR")}원`;

/** 찜할 때 값과 지금 값의 차이 — 정확한 숫자만 말한다(반올림·과장 없음). */
function PriceSince({ entry }: { entry: WishlistEntry }) {
  const then = entry.priceAtWish;
  const now = entry.product.basePrice;
  if (then === null || !now || then === now) return null;
  const diff = Math.abs(then - now);
  return now < then ? (
    <p className="text-highlight-strong mt-1 text-xs font-semibold">찜할 때보다 {won(diff)} 내렸어요</p>
  ) : (
    <p className="text-muted mt-1 text-xs">찜할 때보다 {won(diff)} 올랐어요</p>
  );
}

export default function WishlistView() {
  const [wishes, setWishes] = useState<WishlistPayload | null>(null);
  const [alerts, setAlerts] = useState<ReactionAlert[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/shop/reactions/wishes", { cache: "no-store" }).then(async response => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as WishlistPayload;
      }),
      fetch("/api/shop/reactions/alerts", { cache: "no-store" })
        .then(async response => (response.ok ? ((await response.json()) as { items: ReactionAlert[] }).items : []))
        .catch(() => [] as ReactionAlert[]),
    ])
      .then(([wishPayload, alertItems]) => {
        if (!alive) return;
        setWishes(wishPayload);
        setAlerts(alertItems);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-text flex items-center gap-2 text-2xl font-semibold">
        <Heart size={22} className="text-rose-500" fill="currentColor" /> 내 찜
      </h1>
      <p className="text-muted mt-2 text-sm leading-6">
        찜한 상품의 값이 내리거나 다시 들어오면 하루 한 번 알려 드려요(세모 앱 알림 · 이 화면).
      </p>

      {alerts.length > 0 && (
        <section aria-labelledby="alerts-heading" className="mt-6">
          <h2 id="alerts-heading" className="text-text flex items-center gap-1.5 text-sm font-semibold">
            <BellRing size={16} className="text-primary" /> 최근 알림
          </h2>
          <ul className="mt-2 space-y-2">
            {alerts.slice(0, 5).map(alert => (
              <li key={alert.id} className="bg-blue-tint rounded-xl px-4 py-3 text-sm">
                <p className="text-text font-semibold">{alert.title}</p>
                <p className="text-muted mt-0.5">{alert.body}</p>
                <p className="text-muted mt-1 text-[11px]">{formatKDateTime(alert.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {failed ? (
        <p className="text-muted mt-10 text-sm">찜 목록을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>
      ) : !wishes ? (
        <p className="text-muted mt-10 text-sm">불러오는 중…</p>
      ) : wishes.items.length === 0 ? (
        <div className="bg-light-soft mt-8 rounded-xl px-6 py-10 text-center">
          <p className="text-text font-semibold">아직 찜한 상품이 없습니다</p>
          <p className="text-muted mt-1 text-sm">상품 사진의 하트를 누르면 여기에 모여요.</p>
          <Link
            href="/shop/products"
            className="bg-primary hover:bg-primary-dark mt-5 inline-block rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          >
            상품 보러 가기
          </Link>
        </div>
      ) : (
        <section className="mt-8">
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {wishes.items.map(entry => (
              <div key={entry.product.id}>
                <ProductCard product={entry.product} />
                <PriceSince entry={entry} />
              </div>
            ))}
          </div>
          {wishes.unavailableCount > 0 && (
            <p className="text-muted mt-8 text-xs">
              지금 판매가 멈춘 찜 {wishes.unavailableCount}개는 다시 들어오면 알려 드려요.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
