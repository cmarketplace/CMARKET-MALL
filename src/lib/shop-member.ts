import { cookies } from 'next/headers'

import { auth } from '@/auth'
import {
  customerTypeOf,
  IS_SSO_CONFIGURED,
  viewerTierOf,
  type ShopRole,
  type ViewerTier,
} from '@/lib/shop-auth'
import { isDemoMode } from '@/lib/demo-mode'
import type { CustomerType } from '@/lib/order-types'

/**
 * 서버 라우트·서버 컴포넌트가 「누가」를 정하는 유일한 자리.
 *
 * 주문자·견적서 명의는 반드시 **세션**에서 온다 — 본문으로 받으면 남의 사번으로
 * 주문한다(`/api/shop/orders` 주석 참고).
 *
 * ## 데모 신원 (SHOP_DEMO_MEMBER)
 *
 * 씨마켓 SSO 는 몰 전용 파트너 키가 발급돼야 열린다. 그 전에 주문·견적 화면을
 * 실제로 눌러 보려면 신원이 하나 필요해서, `.env` 에 `SHOP_DEMO_MEMBER` 가 있으면
 * 그 아이디를 로그인한 것으로 친다(`proxy.ts` 의 게이트도 함께 열린다).
 *
 * **운영 환경변수에는 절대 넣지 않는다** — 넣는 순간 주문이 익명이 된다.
 * 실세션이 있으면 언제나 실세션이 이긴다(데모는 빈자리만 채운다).
 *
 * ## SSO 미설정이면 `auth()` 를 부르지 않는다
 *
 * AUTH_SECRET 없이 `auth()` 는 던진다. 그러면 로컬에서 상세·장바구니(공개 화면)까지
 * 500 이 된다 — 공개 화면이 «누가» 를 묻는 건 실명 단가를 보여 줄지 정하기 위해서일
 * 뿐이라, 설정이 없으면 «비로그인» 으로 접는 게 맞다.
 */

export interface ShopMember {
  /**
   * 이 몰의 **전역 유일 신원 키**. 씨마켓 `sub`(`role:groupCode:memberId`)다.
   *
   * 주문·견적의 소유는 전부 이 값으로 가른다. `memberId` 만으로 가르면 안 되는 이유:
   * 씨마켓에는 회원(`b2b_member`)과 사번(`b2b_employee`) 두 원장이 있고 **id 공간이
   * 겹친다**. 전체 개방 몰은 양쪽을 다 받으므로, 같은 문자열 id 를 가진 다른 두 사람의
   * 장바구니·견적·주문이 한 키에 섞인다. 세모의 `employeeNo` 로도 이 값이 나간다 —
   * 소유 검증(`semoGetOrder`)이 그 필드를 대조하기 때문이다.
   */
  memberKey: string
  /** 화면·프리필용 씨마켓 회원/사번 id. **소유 판정에 쓰지 않는다.** */
  memberId: string
  displayName: string
  /** 씨마켓 원장 역할 — 회원(BUYER·SUPPLIER) / 사번(EMPLOYEE). */
  role: ShopRole
  /**
   * «무엇을 보여 줄 것인가» — 발주기관(FULL) / 공급사 고객(RESTRICTED). `shop-auth.ts` `viewerTierOf`.
   * **주문 규칙에 쓰지 않는다** — 그건 `customerType` 이다. 둘은 갈라질 수 있다: 그룹 코드가 있는 직원은
   * FULL 로 보지만 주문은 공급기업 규칙이다(2026-09-16 결정).
   */
  tier: ViewerTier
  /**
   * «어떻게 살 수 있는가» — 발주기관(INSTITUTION) / 공급기업(COMPANY). `shop-auth.ts` `customerTypeOf`.
   * 경로(직접 구매)·결제수단(후불)·업체 조합 선택을 이 값 하나로 가른다. 세모가 같은 판정을 다시 한다.
   */
  customerType: CustomerType
  /**
   * 카드·포인트의 주인 — 씨마켓 회원(`b2b_member`) id. 씨마켓은 저장카드·포인트 지갑을 회원 단위로만 두고
   * 사번 id 는 회원 id 공간과 겹치므로, 직원은 **소속 회원**(세션 `companyMemberId`)의 것으로 결제한다.
   * 회원은 자기 자신. 직원인데 소속이 비어 있으면 null — 결제가 걸린 라우트가 403 으로 막는다(`payerMissing`).
   */
  payerMemberId: string | null
}

/** 직원 세션에 소속 회원이 없을 때 — 결제가 걸린 라우트(주문·결제수단·구독 신청)와 결제 화면이 같은 말을 한다. */
export const PAYER_MISSING_MESSAGE =
  '소속 회원 정보가 없어 결제할 수 없습니다. 씨마켓에서 소속을 확인해 주세요.'

/** 결제할 카드·포인트의 주인을 정할 수 없는 신원인가(소속 회원이 없는 직원). */
export function payerMissing(member: ShopMember): boolean {
  return member.role === 'EMPLOYEE' && !member.payerMemberId
}

/**
 * 세모에 실어 보낼 `payerMemberId` — **직원만** 보낸다(세모는 직원 주문에 이 값을 요구한다).
 * 회원은 sub 가 곧 결제 명의라 보내지 않는다 — 보내면 세모가 sub 의 회원 id 와 같은지 대조해야 한다.
 */
export function semoPayerMemberId(member: ShopMember): string | null {
  return member.role === 'EMPLOYEE' ? member.payerMemberId : null
}

/** 데모 역할을 바꾸는 쿠키 — `/api/demo/role?role=SUPPLIER` 가 심는다. 데모 신원이 켜진 환경에서만 읽는다. */
export const DEMO_ROLE_COOKIE = 'cpoint.demoRole'

export { isDemoMode } from '@/lib/demo-mode'

/**
 * 데모 신원의 등급. 기본은 `SHOP_DEMO_ROLE`(없으면 BUYER)이고, 쿠키가 있으면 그게 이긴다 —
 * `next dev` 는 디렉터리당 한 인스턴스라 발주기관·공급사 화면을 나란히 띄우려면 역할을
 * 요청 단위로 바꿀 수 있어야 한다.
 *
 * 공급기업 데모의 회원 id 는 `SHOP_DEMO_SUPPLIER_MEMBER`(없으면 `<SHOP_DEMO_MEMBER>-supplier`).
 * 따로 두는 이유: 로컬 세모+가짜 씨마켓으로 결제까지 눌러 보려면 그쪽이 아는 회원 id
 * (카드·포인트 지갑이 있는)여야 하고, 발주기관 id 와 같은 사람이 아니어야 한다.
 */
export async function demoMember(): Promise<ShopMember | null> {
  if (!isDemoMode()) return null
  const memberId = process.env.SHOP_DEMO_MEMBER?.trim()
  if (!memberId) return null

  const jar = await cookies()
  const fromCookie = jar.get(DEMO_ROLE_COOKIE)?.value?.toUpperCase()
  const role = fromCookie || process.env.SHOP_DEMO_ROLE?.trim().toUpperCase() || 'BUYER'
  const tier = viewerTierOf(role, role === 'EMPLOYEE' ? 1000 : null)
  // 데모 신원은 회원 둘뿐이다 — 등급으로 역할을 정한다(FULL=발주기관, RESTRICTED=공급기업). 결제 명의는 자기 자신.
  const demoRole: ShopRole = tier === 'FULL' ? 'BUYER' : 'SUPPLIER'
  const demoId =
    tier === 'FULL'
      ? memberId
      : process.env.SHOP_DEMO_SUPPLIER_MEMBER?.trim() || `${memberId}-supplier`
  return {
    // 데모도 실제와 같은 모양의 키를 쓴다 — 모양이 다르면 데모에서만 통과하는 코드가 생긴다.
    memberKey: `${demoRole}::${demoId}`,
    memberId: demoId,
    displayName:
      tier === 'FULL'
        ? process.env.SHOP_DEMO_MEMBER_NAME?.trim() || '데모 담당자'
        : '예시공급사 박대리',
    role: demoRole,
    tier,
    customerType: customerTypeOf(demoRole),
    payerMemberId: demoId,
  }
}

export async function getShopMember(): Promise<ShopMember | null> {
  if (IS_SSO_CONFIGURED) {
    const session = await auth()
    const user = session?.user

    // `id`(=`sub`) 가 없으면 신원이 성립하지 않는다 — 소유를 가를 키가 없다는 뜻이라
    // 「비로그인」으로 접는다. `memberId` 만 있는 세션을 통과시키면 소유가 겹친다.
    if (user?.id && user.memberId) {
      // 소속 회원 — 씨마켓 userinfo 의 `companyMemberId`(회원은 자기 자신, 직원은 상위 회원). 이 값이 실리기
      // 전에 발급된 세션에는 없을 수 있다: 회원은 자기 id 로 채우고, 직원은 비워 둬 결제에서 403 을 받게 한다.
      const companyMemberId = user.companyMemberId?.trim() || null
      return {
        memberKey: user.id,
        memberId: user.memberId,
        displayName: user.name?.trim() || user.memberId,
        role: user.role,
        tier: viewerTierOf(user.role, user.groupCode),
        customerType: customerTypeOf(user.role),
        payerMemberId: user.role === 'EMPLOYEE' ? companyMemberId : (companyMemberId ?? user.memberId),
      }
    }
  }

  return demoMember()
}
