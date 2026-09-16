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
| `/shop/checkout` | 주문 방법 — **씨마켓 안전결제 / 공급사 직접 구매**(발주기관) · 결제수단(후불·카드·포인트) · 씨마켓 저장카드 선택 · 포인트 잔액 · 배송지 |
| `/shop/order-complete` | 영수증 — 상태·경로·결제수단·거래 형태(씨마켓 구매대행)·계약 상대·계산서 수·견적번호 |
| `/shop/orders` | 주문 내역 — 상태·결제수단·거래 형태·견적번호 · 접수/공급사 수락 대기 단계의 취소 |
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
  - **이 등급은 «보기» 만 가른다.** 주문 규칙은 2026-09-16 부터 역할로 정한다(아래 «씨마켓 직원 주문»).
  - 로컬은 `SHOP_DEMO_ROLE=SUPPLIER` 로 공급사 화면을 눌러 본다.
- **씨마켓 안전결제** = 씨마켓이 대금을 받아 공급사에 정산. 계약 상대 1곳·계산서 1장.
  엔씨하이는 이 거래에서 돈을 받지 않고 **플랫폼 수수료만 씨마켓에 별도 청구**한다.
- **공급사 직접 구매** = 세모 직거래 모델. 계약·계산서·결제가 공급사 수만큼. 결제는 공급사별 세금계산서 후불뿐.
- 두 경로의 **가격은 같다**(2026-09-14 대표 결정 D3). 결제 화면 비교표에 «두 경로 같은 가격» 으로 적는다.

## 2026-09-14 — 결제 화면 실연동 (씨마켓몰 개통 작업판 S6)

대표 결정(D1·D2·D5)이 화면에 그대로 실린다. 규칙의 정본은 세모 `open-mall-order-terms.ts` 이고,
몰은 같은 표를 `src/lib/order-types.ts` `allowedPaymentMethods` 에 두고 **미리 거른다**(서버가 최종 판정).

| 고객 유형 | 경로 | 결제수단 | 공급사 배정 |
| --- | --- | --- | --- |
| 발주기관(BUYER) | 안전결제 | 세금계산서 후불 · 카드 · 포인트 | 장바구니에서 고른 대로(최저가 조합·업체 최소화·직접 고르기) |
| 발주기관(BUYER) | 직접 구매 | 세금계산서 후불만 | 장바구니에서 고른 대로 |
| 공급기업(SUPPLIER) | 안전결제만(경로 선택 없음) | 카드 · 포인트 선불만(후불 불가) | **무조건 최저가** — 세모가 정하고 거래 형태 «씨마켓 구매대행»(`dealType=CMARKET_AGENCY`) |
| 씨마켓 직원(EMPLOYEE) — 09-16 | 공급기업과 같음 | 카드 · 포인트 선불만 — **소속 회원의** 카드·포인트 | 공급기업과 같음 |

- **카드·포인트는 주문 등록과 같은 요청에서 씨마켓이 승인한다.** 거절되면 주문은 남지 않고 세모의 402/400 문구
  (카드 거절·잔액 부족)가 결제 화면에 그대로 뜬다. 세모↔씨마켓 연동이 안 된 환경은 503 문구가 그대로 뜬다.
- 결제창 재료(저장카드·포인트 잔액)는 `GET /api/shop/payment-options` → 세모 `payment-options?ownerKey=` →
  씨마켓. ownerKey 는 세션의 memberKey 로만 채운다(`src/lib/semo-payment-options.ts`).
- 견적번호로 주문하면 세모가 **견적서의 오퍼·단가로 잠근다** — 장바구니 품목·수량이 견적서와 다르거나 유효기간이
  지나면 400(«다시 발급»).
- 상태 어휘(`ORDER_STATUS_LABEL`): 접수됨 → 공급사 수락 대기(MATCHED) → 공급사 수락(CONTRACTED) → 배송중 →
  배송완료 → 구매확정(INSPECTED) → 거래 완료 · 취소됨. 화면 취소는 접수·공급사 수락 대기까지(선불은 되돌림).
- 세모 주문 API 필드: `employeeNo`(=memberKey) · `items[].offeringId`(견적 API 는 `offerId` — 이름이 다르다) ·
  `route` · `paymentMethod` · `quoteNo` · `payment{cardId,cardPassword?}` · `clientOrderKey`. 모르는 필드는 세모가
  버리므로(whitelist, 거절 아님) 게이트 없이 항상 보낸다 — 옛 `SEMO_ORDER_EXT` 는 없어졌다.

**배포 순서: 세모 먼저, 몰 나중.** 몰 운영에는 세모 키가 있어, 몰이 먼저 나가면 (1) 견적 발급·조회가 404,
(2) 결제수단 조회가 404, (3) 주문의 경로·오퍼·결제수단 지정이 조용히 무시된 채 주문이 선다. 세모
`feat/mall-open-orderer`(물결 1~2 통합, 마이그레이션 20260915100000~20260916120000) 가 운영에 나간 뒤 몰을 배포한다.
씨마켓 쪽도 선행이다 — 발주기관 첫 주문에 `internal/semo/buyers/:memberId/profile`, 안전결제에 몰 원장
(`internal/points/mall-*`, 후불 POSTPAID 포함)이 있어야 한다.

**키 없는 로컬**은 그대로 돈다 — 스텁 원장(`src/lib/postpaid-mall-stub.ts`)이 같은 규칙으로 거절·수락하고,
결제창은 예시 카드 두 장(id 99 = 거절·비밀번호 123456)과 잔액 105,000P 를 준다. 데모 신원은 `SHOP_DEMO_MEMBER`
(발주기관) · `SHOP_DEMO_SUPPLIER_MEMBER`(공급기업, 없으면 `<SHOP_DEMO_MEMBER>-supplier`) · `/api/demo/role?role=SUPPLIER`.

**세모가 아직 안 주는 값 (전부 선택 필드, 없으면 화면이 그 칸을 안 그린다)**

| 값 | 어디에 쓰나 | 세모 피드 필드 |
| --- | --- | --- |
| 공급사 실명·id | 표·직접 구매·업체 최소화 | `offers[].supplierId/supplierName` |
| 수량 구간 단가 | 슬라이더에 따라 1위 업체가 바뀜 | `offers[].tiers[{minQuantity,price}]` |
| 6개월 추이 | 스파크라인 | `offers[].trend[]` |
| 신뢰·낙찰 건수·리드타임·직접구매 가능·배송비 | 대표 오퍼 근거·경로 판정·배송비 | `offers[].trustScore/recentAwards/leadDays/directPurchase/shippingFee/freeShippingOver` |
| 낙찰가 중앙값 | 밴드 기준선·등급 A/B/C | `items[].benchmark{medianPrice,sampleCount,windowDays,asOf}` |
| MD 순위·주문 수 | 큐레이션 탭 | `items[].mdRank/popularity` |

**몰 안에만 있는 것** — 관심 가격·월 예산(브라우저 저장)·구독 산식(`src/config/subscriptions.ts`)·
시즌 캘린더(`src/config/seasons.ts`). 견적서 원장은 세모다(`src/lib/semo-quotes.ts`, 키 없으면 `var/quotes-stub.json`).
예시 카탈로그는 `src/lib/catalog-stub.ts`(세모 키 없을 때 자동).

**금액 정본** `src/lib/cart-amounts.ts`(배송비 포함, 부가세는 합계에서 1회) ·
**단가 정본** `src/lib/offer-pricing.ts`(구간 단가·순위·등급) · **조합** `src/lib/cart-combination.ts`.

## 2026-09-16 — 씨마켓 직원(EMPLOYEE) 주문

대표 결정: «씨마켓 직원 계정도 주문할 수 있어야 함. 다만 기관이 아니기 때문에 기업과 같이 선불만 가능.»

- **보기는 그대로, 주문만 기업 규칙.** 보기 등급(`viewerTierOf`)은 09-07 규칙 그대로라 그룹 코드가 있는 직원은
  공급사 실명·업체별 단가를 본다. 주문 규칙은 세션 역할로 정한 `ShopMember.customerType`
  (`src/lib/shop-auth.ts` `customerTypeOf`: BUYER=발주기관, SUPPLIER·EMPLOYEE=공급기업)이 가른다 —
  안전결제만 · 카드·포인트 선불만 · 업체 선택 없음(장바구니 조합 카드·직접 고르기·상세의 업체 고르기가 없고,
  장바구니·결제 화면·견적서가 모두 최저가 조합으로 계산된다). 결제 화면은 공급기업과 같은 화면이다.
- **결제 명의 = 소속 회원.** 씨마켓은 저장카드·포인트 지갑을 회원(`b2b_member`) 단위로만 두고, 사번 id 는 회원 id 와
  공간이 겹친다. 그래서 직원은 씨마켓 SSO userinfo 의 `companyMemberId`(세션 `session.user.companyMemberId`)를
  `ShopMember.payerMemberId` 로 들고, 세모에 `payerMemberId` 로 보낸다 — 주문 `POST …/orders`, 결제수단
  `GET …/payment-options?ownerKey=&payerMemberId=`, 구독 신청 `POST …/subscriptions`. **직원만 보낸다**(세모가 직원에게는
  요구하고, 회원이 보내면 sub 의 회원 id 와 같은지 대조한다). 견적은 그대로다.
- 직원 세션에 소속 회원이 없으면 세 라우트가 **403** «소속 회원 정보가 없어 결제할 수 없습니다. 씨마켓에서 소속을
  확인해 주세요.» 를 내고, 결제 화면은 결제수단을 읽지 않고 그 문구를 먼저 보여 준다.
- 세모 응답의 `customerType` 은 직원 주문도 `COMPANY` 다. 키 없는 로컬 스텁도 같은 판정(직원=공급기업, 결제 명의 대조)을 한다.
- **배포 순서는 여전히 세모 먼저.** 세모가 `payerMemberId` 를 읽기 전에 몰이 나가면 모르는 필드로 버려져 직원 주문·
  결제수단 조회가 세모의 옛 규칙대로 판정된다.

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
| `src/lib/shop-auth.ts` | 입장 가능한 `group_code` · 설정이 성립하는지 · 보기 등급(`viewerTierOf`)·고객 유형(`customerTypeOf`) |
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

## 주문 — 세모 주문 파이프라인 위에서 전 구간 동작 (2026-09-14)

이 몰은 **씨마켓 회원이면 누구나**(그룹 제한 없음 — `CMARKET_GROUP_CODES` 는 비우면 전체 허용이고,
특정 기관 전용으로 좁힐 때만 채운다) 들어오되, **몰 전체가 로그인 필수**다(2026-09-07 결정,
`proxy.ts` 가 `/shop`·`/api/shop` 전부를 지킨다 — 옛 «열람은 공개, 주문만 로그인» 은 더 이상 사실이 아니다).
로그인은 씨마켓 SSO(OAuth 2.0 + PKCE) 하나뿐이다.

| 경로 | 화면 |
| --- | --- |
| `/shop/cart` | 장바구니 → 업체 조합 → 견적서 발급(선택) → [주문 방법 선택으로] |
| `/shop/checkout` | 경로·결제수단·(카드면) 저장카드·배송지 → [결제하고 주문 확정] |
| `/shop/order-complete` | 영수증 — 선불이면 «결제된 금액», 후불이면 «청구 예정 금액» |
| `/shop/orders` | 주문 내역 + 접수·공급사 수락 대기 단계의 취소(두 번 눌러 확정) |

**주문 정본은 세모다** — `SEMO_API_BASE`/`SEMO_API_KEY` 가 채워지면 주문이 세모를 탄다
(`src/lib/semo-orders.ts`): 접수 → (안전결제면) 씨마켓 원장 등록·선불 결제 → 공급사 수락 → 배송 →
구매확정(7일 자동) → 정산. 세모 모드에서는 **단가를 보내지 않는다** — 카탈로그(또는 견적서 잠금)가
재확정한다. 키가 없으면 로컬 스텁(`src/lib/postpaid-mall-stub.ts`)이 같은 규칙으로 자리를 지킨다.

SSO 키가 없는 동안은 `.env.local` 의 `SHOP_DEMO_MEMBER` 로 데모 신원을 켜고 눌러 본다
(`.env.example` 참고 — **운영에 넣으면 안 되는 값이다**). `.env` 파일을 못 만드는 세션이면
환경변수를 `next dev` 에 인라인으로 넘긴다.

## 아직 없는 것

- **씨마켓 SSO 실키** — 몰 전용 파트너 키(`sso:login`)와 authorize 호스트.
  모두 개방이라 허용 그룹 등록은 필요 없다.
- **배송 추적·구매확정 버튼** — 세모에 송장·검수 API 는 있으나 몰 화면에는 아직 없다(주문 내역은 상태만 보여 준다).
- **분류 접기** — 뎁스1 은 세모 최상단을 그대로 쓴다. C-POINT 품목이 채워지고
  「이 몰의 언어」가 정해지면 그때 매핑 층을 `Shop.tsx` 에 끼운다.
