"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, Flag, ThumbsUp, Trash2, X } from "lucide-react";

import { compressImage } from "@/lib/compress-image";
import { formatKDateTime } from "@/lib/kdate";
import {
  REPORT_REASONS,
  REVIEW_LIMITS,
  type ReportReason,
  type ReviewPage,
  type ShopReview,
} from "@/lib/reaction-types";

/**
 * 납품 사진 후기 — 반응 스위치가 켜졌을 때만 상세 화면이 그린다.
 *
 * - 쓰기는 **구매확정한 사람만**(세모가 주문 원장으로 판정해 «쓸 수 있는 주문» 을 준다). 사진은 선택, 4장까지.
 * - 작성자는 «대학 · 서울 담당자» 처럼만 보인다 — 기관명·이름은 세모가 애초에 주지 않는다.
 * - «도움돼요» 를 누르면 후기 쓴 사람에게 하루 한 번 알림이 간다(세모). 신고 3건이면 자동으로 숨겨진다.
 */
export default function ProductReviews({ productId }: { productId: string }) {
  const [page, setPage] = useState<ReviewPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/shop/reactions/reviews?itemId=${encodeURIComponent(productId)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(String(response.status));
      setPage((await response.json()) as ReviewPage);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [productId]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/shop/reactions/reviews?itemId=${encodeURIComponent(productId)}`, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as ReviewPage;
        if (alive) setPage(data);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [productId]);

  const act = async (review: ShopReview, action: "helpful" | "report" | "delete", extra: Record<string, unknown> = {}) => {
    const response = await fetch(`/api/shop/reactions/reviews/${encodeURIComponent(review.id)}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extra),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; helpfulCount?: number };
    if (!response.ok) {
      setNotice(data.message ?? "처리하지 못했습니다.");
      return;
    }
    if (action === "helpful" && page) {
      setPage({
        ...page,
        items: page.items.map(item =>
          item.id === review.id
            ? { ...item, helpedByMe: extra.on !== false, helpfulCount: data.helpfulCount ?? item.helpfulCount }
            : item,
        ),
      });
      return;
    }
    setNotice(action === "report" ? "신고가 접수됐습니다. 고맙습니다." : "후기를 지웠습니다.");
    await load();
  };

  if (failed) {
    return <p className="text-muted mt-5 text-sm">후기를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>;
  }
  if (!page) {
    return <p className="text-muted mt-5 text-sm">후기를 불러오는 중…</p>;
  }

  return (
    <div className="mt-5 space-y-5">
      {notice && (
        <p role="status" className="bg-bg text-text flex items-center justify-between rounded-xl px-4 py-3 text-sm">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="닫기" className="text-muted cursor-pointer">
            <X size={16} />
          </button>
        </p>
      )}

      {page.reviewableOrders.length > 0 && (
        <ReviewForm
          productId={productId}
          orders={page.reviewableOrders.map(order => order.orderNo)}
          onDone={async message => {
            setNotice(message);
            await load();
          }}
        />
      )}

      {page.items.length === 0 ? (
        <p className="bg-light-soft text-muted rounded-xl px-5 py-6 text-sm leading-6">
          아직 후기가 없습니다. 이 상품을 받아 <b className="text-text">구매확정</b>하면 납품 사진과 함께 후기를 남길 수 있어요.
        </p>
      ) : (
        <ul className="divide-bg divide-y">
          {page.items.map(review => (
            <ReviewItem key={review.id} review={review} onAct={act} />
          ))}
        </ul>
      )}
      {page.total > page.items.length && (
        <p className="text-muted text-xs">도움돼요가 많은 후기 {page.items.length}개를 먼저 보여 드려요(전체 {page.total}개).</p>
      )}
    </div>
  );
}

function ReviewItem({
  review,
  onAct,
}: {
  review: ShopReview;
  onAct: (review: ShopReview, action: "helpful" | "report" | "delete", extra?: Record<string, unknown>) => Promise<void>;
}) {
  const [reporting, setReporting] = useState(false);
  const photos = review.photoUrls.filter(url => url.startsWith("https://"));

  return (
    <li className="py-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-text text-sm font-semibold">{review.authorLabel}</p>
        <p className="text-muted text-xs">{formatKDateTime(review.createdAt).slice(0, 10)}</p>
      </div>
      <p className="text-text mt-2 text-sm leading-7 whitespace-pre-line">{review.body}</p>

      {photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map(url => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="shrink-0">
              {/* 세모 스토리지(공개 assets) 주소 — next/image 허용 호스트에 넣지 않으려고 img 로 그린다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="납품 사진" loading="lazy" className="bg-light-soft h-24 w-24 rounded-lg object-cover" />
            </a>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {review.mine ? (
          <>
            <span className="text-muted">내가 쓴 후기 · 도움돼요 {review.helpfulCount}</span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("이 후기를 지울까요?")) void onAct(review, "delete");
              }}
              className="text-muted hover:text-text inline-flex cursor-pointer items-center gap-1"
            >
              <Trash2 size={13} /> 지우기
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-pressed={review.helpedByMe}
              onClick={() => void onAct(review, "helpful", { on: !review.helpedByMe })}
              className={`inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full px-3 font-semibold transition-colors ${
                review.helpedByMe ? "bg-highlight-soft text-highlight-strong" : "bg-bg text-text hover:bg-bg-secondary"
              }`}
            >
              <ThumbsUp size={13} fill={review.helpedByMe ? "currentColor" : "none"} />
              도움돼요 {review.helpfulCount > 0 ? review.helpfulCount : ""}
            </button>
            {reporting ? (
              <span className="inline-flex flex-wrap items-center gap-1">
                {REPORT_REASONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setReporting(false);
                      void onAct(review, "report", { reason: option.value satisfies ReportReason });
                    }}
                    className="bg-bg text-muted hover:text-text cursor-pointer rounded-full px-2.5 py-1"
                  >
                    {option.label}
                  </button>
                ))}
                <button type="button" onClick={() => setReporting(false)} className="text-muted cursor-pointer px-1">
                  취소
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setReporting(true)}
                className="text-muted hover:text-text inline-flex cursor-pointer items-center gap-1"
              >
                <Flag size={13} /> 신고
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function ReviewForm({
  productId,
  orders,
  onDone,
}: {
  productId: string;
  orders: string[];
  onDone: (message: string) => Promise<void>;
}) {
  const [orderNo, setOrderNo] = useState(orders[0] ?? "");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    setError(null);
    const room = REVIEW_LIMITS.photosMax - photos.length;
    const picked = Array.from(files).slice(0, Math.max(room, 0));
    if (files.length > room) setError(`사진은 ${REVIEW_LIMITS.photosMax}장까지 올릴 수 있어요.`);
    const compressed = await Promise.all(picked.map(compressImage));
    const next = [...photos, ...compressed];
    const total = next.reduce((sum, file) => sum + file.size, 0);
    if (compressed.some(file => file.size > REVIEW_LIMITS.photoMaxBytes) || total > REVIEW_LIMITS.uploadTotalMaxBytes) {
      setError("사진이 너무 큽니다 — 장수를 줄이거나 다른 사진을 골라 주세요.");
      return;
    }
    setPhotos(next);
  };

  const submit = async () => {
    const text = body.trim();
    if (text.length < REVIEW_LIMITS.bodyMin) {
      setError(`후기는 ${REVIEW_LIMITS.bodyMin}자 이상 적어 주세요.`);
      return;
    }
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.set("itemId", productId);
    form.set("orderNo", orderNo);
    form.set("body", text);
    photos.forEach(photo => form.append("photos", photo, photo.name));
    try {
      const response = await fetch("/api/shop/reactions/reviews", { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "후기를 저장하지 못했습니다.");
        return;
      }
      setBody("");
      setPhotos([]);
      await onDone("후기를 남겼습니다. 다른 담당자에게 큰 도움이 돼요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-border rounded-xl border p-5">
      <p className="text-text text-sm font-semibold">받으신 상품은 어떠셨나요?</p>
      <p className="text-muted mt-1 text-xs">
        기관 이름은 보이지 않아요 — «기관 유형 · 지역 담당자» 로만 표시됩니다. 사진에 기관명·개인정보가 보이지 않게 해 주세요.
      </p>

      {orders.length > 1 && (
        <label className="text-muted mt-4 block text-xs">
          주문
          <select
            value={orderNo}
            onChange={event => setOrderNo(event.target.value)}
            className="bg-bg text-text mt-1 block w-full rounded-lg px-3 py-2 text-sm"
          >
            {orders.map(order => (
              <option key={order} value={order}>
                {order}
              </option>
            ))}
          </select>
        </label>
      )}

      <textarea
        value={body}
        onChange={event => setBody(event.target.value.slice(0, REVIEW_LIMITS.bodyMax))}
        rows={4}
        placeholder="포장·납기·품질 등 다음 담당자에게 도움이 될 이야기를 적어 주세요(10자 이상)."
        className="bg-bg text-text mt-4 block w-full rounded-lg px-3 py-2.5 text-sm leading-6"
      />
      <p className="text-muted mt-1 text-right text-[11px]">
        {body.trim().length} / {REVIEW_LIMITS.bodyMax}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {photos.map((photo, index) => (
          <span key={`${photo.name}-${index}`} className="bg-bg text-text inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs">
            {photo.name}
            <button
              type="button"
              aria-label={`${photo.name} 빼기`}
              onClick={() => setPhotos(photos.filter((_, at) => at !== index))}
              className="text-muted cursor-pointer"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {photos.length < REVIEW_LIMITS.photosMax && (
          <label className="bg-bg text-text hover:bg-bg-secondary inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold">
            <Camera size={14} /> 납품 사진(선택)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={event => {
                void addPhotos(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="bg-primary hover:bg-primary-dark mt-4 inline-flex min-h-10 cursor-pointer items-center rounded-full px-5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
      >
        {busy ? "올리는 중…" : "후기 남기기"}
      </button>
    </div>
  );
}
