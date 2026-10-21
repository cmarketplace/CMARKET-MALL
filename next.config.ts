import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * 세모 피드가 내려주는 상품 사진의 호스트.
     *
     * next/image 는 allowlist 에 없는 원격 호스트를 최적화하지 않고 `_next/image` 가
     * 400 을 낸다 — 이미지가 «깨진» 게 아니라 요청 자체가 거부된다. 그래서 여기에
     * 올리지 않으면 피드에 URL 이 있어도 화면에는 안 나온다.
     *
     * **`product-image.ts` 의 `ALLOWED_IMAGE_SOURCES` 와 같이 움직여야 한다.** 한쪽만 늘리면
     * 그 호스트의 사진이 통째로 사라진다(그때는 대표 이미지로 떨어지는 게 낫다).
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.officedepot.co.kr",
        pathname: "/**",
      },
      // 우체국 B2B몰 — 선장품·생활/주방 사진
      {
        protocol: "https",
        hostname: "image.epost.go.kr",
        pathname: "/btob/**",
      },
      // 세모 저장소(운영·스테이징) — 공급사가 올려 승인된 사진
      {
        protocol: "https",
        hostname: "iznoxdtmpthtdjrzglsp.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "ywujufqyvpxmboxvqvhs.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
