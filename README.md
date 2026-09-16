# 씨마켓몰 (저장소명 C-POINT)

씨마켓몰 쇼핑몰. 상품은 **세모(SEMO) 큐레이션 피드**에서 온다 —
세모 마스터가 「이 쇼핑몰 × 품목 × 공급사」로 승인한 것만 내려온다.
2026-08-30 결정으로 이름이 «씨마켓몰» 이다(포인트 미사용). 저장소·디렉터리는 c-point 그대로.

KCL MRO → FITI MRO 로 이어진 몰의 세 번째다. 화면 구조와 데이터 경로는 같고,
기관 종속값만 `src/config/tenant.ts` 와 `globals.css` 의 브랜드 색으로 갈라진다.

## 실행

```bash
npm install
cp .env.example .env.local   # SEMO_API_KEY 를 채운다
npm run dev
```

## 지금 있는 화면

| 경로 | 화면 |
| --- | --- |
| `/` | 랜딩 — 히어로 · 지표 · 근거 3칸 · AS-IS/TO-BE · 마무리 CTA |
| `/shop` | 몰 홈 — 정기구독(인원수→월 예산·구독 견적서) · 시즌 D-day · MD 큐레이션 · 우리 기관 재주문·예산 |
| `/shop/products` | 상품 목록 — 대분류/소분류·검색·정렬·찜·더 보기 |
| `/shop/[productId]` | 상품 상세 — **가격 밴드**(공급사 단가 점 + 낙찰가 중앙값 선 + 등급) · 수량 구간 단가 · 공급사별 표(실명은 로그인 후) · 관심 가격 |
| `/shop/cart` | 장바구니 — **조합 3모드**(최저가 조합 / 업체 최소화 / 직접 고르기) · 업체·배송·계산서 수 · 견적서 발급(7일 잠금) |
| `/shop/checkout` | 주문 방법 — **씨마켓 안전결제 / 공급사 직접 구매** · 비교표 · 결제수단 · 배송지 |
| `/shop/order-complete` | 영수증 — 경로·계약 상대·계산서 수·견적번호 |
| `/shop/orders` | 주문 내역 |
| `/login` | 로그인 — 「씨마켓 계정으로 로그인」 버튼 하나 |

## 2026-09-07 — 가격 밴드 · 조합 · 결제 2경로 (이 브랜치)

설계 목업: https://claude.ai/code/artifact/44397ae1-a6b1-4e90-be12-7b3f13d1ccba

**결정 사항**
- **몰 전체가 로그인 필수**(2026-09-07 오후 결정, `proxy.ts`). 랜딩만 공개. 이유: 공급사도 고객으로
  사는 몰이라 비로그인이 가격을 보면 공급사가 로그아웃하고 경쟁사 단가를 본다.
- **손님 등급 2종**(`src/lib/shop-auth.ts` `viewerTierOf`, 가림은 서버 `src/lib/catalog.ts` `maskForViewer`):
  - 발주기관(BUYER · 기관 그룹 코드가 있는 EMPLOYEE) = 공급사 실명·업체별 단가·낙찰가 기준선·등급·조합·직접 구매 전부.
  - 공급사 고객(SUPPLIER · 그룹 없는 EMPLOYEE) = **몰 판매가 한 값만**. 오퍼를 «수량별 전 업체 최저» 익명 오퍼
    하나로 접고, 실명·«N곳»·표·밴드 점·낙찰가 기준선·등급·조합 모드를 전부 뺀다. 주문은 **안전결제만**
    (서버가 route 를 SAFE 로 강제). 견적서·영수증에도 공급사명이 실리지 않는다.
  - 직원(EMPLOYEE) 소속은 씨마켓 userinfo 에 «소속 회사 역할» 이 실리기 전까지 그룹 코드 유무로 임시 판정.
  - 로컬은 `SHOP_DEMO_ROLE=SUPPLIER` 로 공급사 화면을 눌러 본다.
- **씨마켓 안전결제** = 씨마켓이 대금을 받아 공급사에 정산. 계약 상대 1곳·계산서 1장·카드 가능.
  엔씨하이는 이 거래에서 돈을 받지 않고 **플랫폼 수수료만 씨마켓에 별도 청구**한다.
- **공급사 직접 구매** = 세모 직거래 모델. 계약·계산서·결제가 공급사 수만큼.
- 두 경로의 **가격 정책은 미정** — 지금은 같은 총액이고 결제 화면에 «경로별 가격 정책 결정 필요» 표시.

**세모가 아직 안 주는 값 (전부 선택 필드, 없으면 화면이 그 칸을 안 그린다)**

| 값 | 어디에 쓰나 | 세모 피드 필드 |
| --- | --- | --- |
| 공급사 실명·id | 표·직접 구매·업체 최소화 | `offers[].supplierId/supplierName` |
| 수량 구간 단가 | 슬라이더에 따라 1위 업체가 바뀜 | `offers[].tiers[{minQuantity,price}]` |
| 6개월 추이 | 스파크라인 | `offers[].trend[]` |
| 신뢰·낙찰 건수·리드타임·직접구매 가능·배송비 | 대표 오퍼 근거·경로 판정·배송비 | `offers[].trustScore/recentAwards/leadDays/directPurchase/shippingFee/freeShippingOver` |
| 낙찰가 중앙값 | 밴드 기준선·등급 A/B/C | `items[].benchmark{medianPrice,sampleCount,windowDays,asOf}` |
| MD 순위·주문 수 | 큐레이션 탭 | `items[].mdRank/popularity` |

**세모 주문 API 확장(미착수)** — `route`(SAFE/DIRECT)·`paymentMethod`·`quoteNo`·`items[].offerId`.
세모가 받기 전에는 `SEMO_ORDER_EXT` 를 끄고 둔다(켜면 whitelist 400). 그동안 몰의 경로 선택은
세모에 전달되지 않고 로그에만 남는다(`src/lib/semo-orders.ts`).

**몰 안에만 있는 것** — 견적서 원장(`src/lib/quotes.ts`, `var/quotes-stub.json`)·관심 가격·
월 예산(브라우저 저장)·구독 산식(`src/config/subscriptions.ts`)·시즌 캘린더(`src/config/seasons.ts`).
예시 카탈로그는 `src/lib/catalog-stub.ts`(세모 키 없을 때 자동).

**금액 정본** `src/lib/cart-amounts.ts`(배송비 포함, 부가세는 합계에서 1회) ·
**단가 정본** `src/lib/offer-pricing.ts`(구간 단가·순위·등급) · **조합** `src/lib/cart-combination.ts`.

## 구조

```
세모 백엔드  GET /external/storefronts/{slug}/items        ← X-API-Key (서버 전용)
                 /external/storefronts/{slug}/categories
                 /external/storefronts/{slug}/items/{id}
                 /external/storefronts/{slug}/items/{id}/offers
        │
  src/lib/semo-feed.ts        세모와 닿는 유일한 파일
        │
  ├── 서버 컴포넌트가 직접 호출  (app/shop/page.tsx, app/shop/[productId]/page.tsx,
  │                              app/shop/cart/page.tsx)
  └── /api/shop/items · /api/shop/categories   브라우저용 창구
        │
  components/Shop/Shop.tsx    분류·검색·정렬·페이지 상태
  lib/cart.ts · lib/bookmarks.ts   장바구니·찜 (localStorage 외부 스토어)
```

지켜야 하는 두 가지:

1. **파트너 키는 브라우저로 내보내지 않는다.** 그 키는 이 몰 전용이 아니라 씨마켓 연동
   전체가 쓰는 키다. `NEXT_PUBLIC_` 을 붙이지 말고, 브라우저는 `/api/shop/*` 만 부른다.
2. **필터·정렬·페이징은 서버가 한다.** 카탈로그가 만 단위가 되면 «전부 받아서 브라우저가
   거르기» 는 성립하지 않는다.

## 지금 상태에서 알아 둘 것

- **세모에 `c-point` 스토어프론트는 등록되어 있지만 승인 품목이 0건이다**
  (2026-08-24 확인). 그래서 목록은 「아직 등록된 상품이 없습니다」로 뜬다 — 피드 장애와는
  다른 화면이다(장애면 「불러오지 못했습니다」). 세모에서 품목을 승인해 주면 그대로 채워진다.
  화면을 데이터가 있는 상태로 확인하려면 `.env.local` 의 `STOREFRONT_SLUG` 를 잠깐
  `kclmro` 로 바꿔 띄운다.
- **몰 이름·운영 주체 표기는 임시값이다.** `src/config/tenant.ts` 한 곳에 모여 있으니
  확정되면 그 파일만 고친다.
- **로고는 씨마켓 로고를 그대로 쓴다**(`public/images/cmarket-logo.png`).
  C-POINT 전용 마크가 나오면 그 파일과 `ShopNav.tsx` 만 갈아 끼운다.

## 랜딩의 숫자

랜딩의 「N품목 · N대분류 · N소분류」는 빌드할 때 세지 않는다. `src/data/landing-stats.json`
스냅샷을 읽을 뿐이고, 갱신은 사람이 돌린다.

```bash
npm run landing:stats -- --base http://localhost:3000   # 띄워 둔 몰에서 세어 파일을 덮어쓴다
npm run landing:stats -- --dry                          # 세기만 한다
```

품목이 0건이면 `getLandingStats()` 가 `null` 을 주고 **지표 섹션이 통째로 빠진다.**
「0품목」을 그리면 «상품이 없는 몰» 로 읽히고, 임시 숫자를 채워 넣는 것은 씨마켓
디자인 시스템이 가장 강하게 금지하는 것이다(§2 「근거 없는 최상급 표현」).

랜딩의 디자인 규칙은 `~/Desktop/씨마켓_디자인_시스템.md` 를 따른다 — 타이틀 2줄,
핵심어만 파랑, 수치와 단위 분리, 수치 옆 기준일, AS-IS/TO-BE 대비, 장식용 영문 카피 금지.

## 로그인 — 씨마켓 SSO

KCL MRO 몰과 같은 문이다. OAuth 2.0 `authorization_code` + PKCE(S256) 로 씨마켓에서 신원을
받아 **이 도메인의 first-party 세션**을 새로 발급한다. 씨마켓 쿠키를 읽는 방식이 아니다 —
씨마켓(`c-market.kr`)과 이 몰은 별도 등록 도메인이라 그 쿠키가 여기로 전송될 경로가 없다.

```
방문자 → 보호된 주문 화면 → proxy.ts (세션 없음)
      → /api/auth/start
      → {테넌트}.c-market.kr/sso/authorize        ← 기관 브랜딩 로그인 화면
      → /api/auth/callback/cmarket?code=…
      → partner-api.c-market.net/oauth/token · /oauth/userinfo
      → 이 몰 세션 쿠키 발급 → /shop
```

| 파일 | 역할 |
| --- | --- |
| `src/auth.ts` | 씨마켓 provider 정의 · 세션에 실을 신원 축 |
| `src/proxy.ts` | 주문 내역·주문 완료 화면 게이트(세션 + 소속 기관) |
| `src/lib/shop-auth.ts` | 입장 가능한 `group_code` · 설정이 성립하는지 |
| `src/app/login/page.tsx` | 로그인 화면. 자체 ID/PW 폼은 두지 않는다 |
| `src/app/actions/auth.ts` | 로그인·로그아웃 서버 액션 |
| `src/components/Shop/ShopUserMenu.tsx` | 헤더의 «누가 로그인했나» + 로그아웃 |

### 입장 자격은 씨마켓 어드민이 정본이다

이 몰은 **여러 기관을 받는다.** 어느 기관이 들어올지는 씨마켓 어드민에서 파트너 키의
「SSO 클라이언트 > 허용 기관」에 `group_code` 를 넣어 정하고, 기관이 늘면 거기에 번호를
더한다 — **몰은 배포하지 않는다.** 씨마켓은 그 목록을 캐시하지 않아 다음 로그인부터 바로 걸린다.

몰의 `CMARKET_GROUP_CODES` 는 그래서 **선택값**이다. 비워 두는 것이 기본이고, 씨마켓 등록이
잘못 넓어져도 이 몰만은 막고 싶을 때만 채운다. 두 곳에 같은 목록을 두면 기관을 추가할 때
한쪽만 고쳐지고, 어긋난 것이 화면 어디에도 안 드러난다 — 씨마켓이 `SSO_CLIENTS` 환경변수를
테이블로 승격한 이유가 정확히 그 결함이었다.

`CMARKET_AUTHORIZE_URL` 은 아직 비어 있다. 이 몰은 기관 한 곳의 테넌트 몰이 아니므로 본진
호스트(`https://www.c-market.net/sso/authorize`)를 쓴다 — 본진은 로그인 때 호스트↔기관 일치를
따지지 않아서 어느 기관 회원이든 들어올 수 있다(테넌트 호스트는 그 기관 사람만 통과시킨다).
확정되면 채운다. 여기에 더해 씨마켓 어드민에서 이 몰용 파트너 키를 발급받아야 한다
(`sso:login` 스코프, `redirect_uri` 는 `https://<몰 도메인>/api/auth/callback/cmarket` 정확일치).

설정이 하나라도 비면 **운영에서는 보호된 주문 화면이 닫히고**(로그인 화면이 사유를 밝힌다)
**로컬에서는 게이트를 통과한다** — 자격증명 없이도 화면을 볼 수 있어야 하기 때문이다.

세션 수명은 1시간이다. 씨마켓은 back-channel logout 을 제공하지 않아서, 정지·탈퇴·그룹
이탈은 만료 후 다음 authorize 왕복에서 반영된다(최대 1시간). 씨마켓 세션이 살아 있으면
사용자에겐 화면 전환으로만 보인다.

## 주문 — 후불 (2026-08-25, 스텁 원장 위에서 전 구간 동작)

이 몰은 **모두 개방**(확정 결정)이다: 열람은 로그인 없이 공개, **주문에만** 씨마켓
로그인이 필요하다(그룹 제한 없음 — `CMARKET_GROUP_CODES` 는 비우면 전체 허용이고,
특정 기관 전용으로 좁힐 때만 채운다). 게이트는 «내 기록» 두 화면만 지킨다(`proxy.ts`).

주문 시점에 돈이 오가지 않는다 — 공급사는 저장 단가 최저 조합으로 자동매칭(세모)되고,
결제(현금/카드)와 세금계산서(엔씨하이·팝빌)는 **배송완료 뒤**다.

| 경로 | 화면 |
| --- | --- |
| `/shop/cart` | 장바구니 → 배송지 직접 입력(마지막 값 기억) → [후불로 주문하기] |
| `/shop/order-complete` | 영수증 — 청구 예정 금액 · «지금 결제된 금액 없음» 안내 |
| `/shop/orders` | 주문 내역 + 접수·공급사 확정 단계의 취소(두 번 눌러 확정) |

**주문 정본은 세모다** — `SEMO_API_BASE`/`SEMO_API_KEY` 가 채워지면 주문이 세모를
탄다(`src/lib/semo-orders.ts`): 접수 → 자동매칭(«공급사 확정») → 계약·배송·후불
결제는 다음 단계. 세모 모드에서는 **단가를 보내지 않는다** — 카탈로그가 재확정한다
(로컬 실측: 화면이 1원을 보내도 서버가 2,288원으로 잡았다). 키가 없으면 로컬 스텁
(`src/lib/postpaid-mall-stub.ts`)이 같은 규약으로 자리를 지킨다. FITI 포인트몰과
달리 포인트 축이 없어 이음새도 `orders.ts` 하나다.

SSO 키가 없는 동안은 `.env.local` 의 `SHOP_DEMO_MEMBER` 로 데모 신원을 켜고 눌러 본다
(`.env.example` 참고 — **운영에 넣으면 안 되는 값이다**).

## 조달 허브 — 랜딩 섹션 + 몰 요청 원장 (2026-09-16)

랜딩(`/`) 히어로 아래에 **[공공기관 / 기업]** 선택(`?for=biz`)이 있고, 고른 쪽에 맞춰 섹션 순서가 바뀐다
(`src/app/page.tsx` 의 `ORDER`). 섹션은 전부 설정 파일에서 그려지고, 공개 화면이라 **단가는 그리지 않는다.**

| 섹션 | 설정(사람이 고치는 곳) | 몰 안 화면 |
| --- | --- | --- |
| 이번 달 공동구매 | `config/group-buys.ts` — **매달** 품목 3개·일정 | `/shop/group-buy` (수요조사 참여) |
| 연간 단가계약 | `config/annual-contracts.ts` — 회차·품목, 낙찰 후 `unitPrice` | `/shop/annual` |
| 사무실 관리 구독(20종) | `config/office-services.ts` — 계약 끝난 업체만 `vendor` | `/shop/services` (여러 서비스 한 장 견적) |
| 법정 점검 달력 | `config/legal-inspections.ts` — 법령 확인값만 | 서비스 견적·구해드림으로 연결 |
| 시즌 베스트 | `config/season-bests.ts` | 몰 검색 + 서비스 선예약 |
| 기관 유형별 품목 | `config/org-favorites.ts` — `basis: 'md'` 동안 «MD 정리» 표기 | 몰 검색 |
| 의무구매 계산기 | `config/mandatory-purchase.ts` — 비율 둘은 **고시** 값 | `/shop/request?type=mandatory` |
| 기관 담당자 도구 | `config/seasons.ts` 의 연말 행사 | `/shop/budget` · `/shop/orders`(CSV) |
| 구해드림·긴급·토너 | — | `/shop/request?type=sourcing` |
| 갈아타기(기업) | — | `/shop/request?type=switch` |
| 꾸러미 | `config/kits.ts` | `/shop/request?type=kit` |
| 연계구매(기업) | — | `/shop/request?type=social` |
| 절감액 계산 | — | `/shop/savings` (엑셀 붙여 넣기) |

**요청의 정본은 세모다** — `/external/storefronts/{slug}/requests`(접수·목록·취소·집계). 세모 쪽 구현은
SEMO_MVP `feat/mall-requests`(마이그레이션 `20260919100000_storefront_requests.sql`, 어드민 쇼핑몰 상세
«손님 요청» 탭, 접수 알림 메일 `STOREFRONT_REQUEST_NOTIFY_EMAIL`). 칸 검증은 몰이 한다
(`src/lib/request-validate.ts`) — 세모는 `details` 를 해석하지 않는다. 세모 키가 없으면
`var/mall-requests-stub.json` 에 남고 화면이 «전달되지 않습니다» 를 적는다. 담당자는 `/shop/requests` 에서
진행 상황·견적서 번호·회신을 본다.

## 아직 없는 것

- **씨마켓 SSO 실키** — 몰 전용 파트너 키(`sso:login`)와 테넌트 authorize 호스트.
  모두 개방이라 허용 그룹 등록은 필요 없다.
- **세모 연동** — 주문이 세모 자동매칭·계약으로 이어지지 않는다. 배송완료 후
  카드결제창·팝빌 계산서도 그 축의 일이다.
- **분류 접기** — 뎁스1 은 세모 최상단을 그대로 쓴다. C-POINT 품목이 채워지고
  「이 몰의 언어」가 정해지면 그때 매핑 층을 `Shop.tsx` 에 끼운다.
