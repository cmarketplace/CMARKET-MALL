import { Repeat2, Users } from "lucide-react";

import type { SocialProof } from "@/lib/reaction-types";

/**
 * 사회적 증거 배지 — «대학 5곳이 최근 30일 재구매».
 *
 * 숫자는 세모가 실제 발주기관 주문에서 센 값 그대로다(기관명 없음, 2곳 미만이면 아예 오지 않는다).
 * 몰이 고치거나 반올림하지 않는다.
 */
export default function SocialProofBadge({ proof, className = "" }: { proof: SocialProof; className?: string }) {
  const Icon = proof.kind === "REORDER" ? Repeat2 : Users;
  return (
    <p
      className={`bg-blue-tint-2 text-primary inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
      title="세모네모 실제 주문 기준 · 기관 이름은 보이지 않습니다"
    >
      <Icon aria-hidden="true" size={12} strokeWidth={2} className="shrink-0" />
      <span className="truncate">{proof.text}</span>
    </p>
  );
}
