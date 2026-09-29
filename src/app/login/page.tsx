import { redirect } from 'next/navigation'
import Image from 'next/image'

import { signInWithCmarket } from '@/app/actions/auth'
import { SignInButton } from '@/app/login/SignInButton'
import { auth } from '@/auth'
import { TENANT } from '@/config/tenant'
import { IS_SSO_CONFIGURED, isAllowedGroup, safeNextPath } from '@/lib/shop-auth'

/**
 * 로그인 화면.
 *
 * 비로그인으로 몰(`/shop`)에 오면 `proxy.ts` 가 여기로 보낸다(2026-09-08). 이 몰은 씨마켓
 * 회원만 이용할 수 있고, 그 사실과 회원가입 문을 한 화면에서 보여 준 뒤 씨마켓 로그인으로
 * 넘긴다. 씨마켓 사이드바에서 오는 무클릭 진입(`/api/auth/start`)은 이 화면을 거치지 않는다.
 * 기관 자격 거절·설정 미비·로그인 취소 후 복귀도 여기서 사유를 보고 다시 시도한다.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  // 설정이 없으면 세션도 없다 — `auth()` 는 AUTH_SECRET 없이는 던진다. 먼저 접는다.
  if (!IS_SSO_CONFIGURED) {
    return (
      <LoginShell>
        <p className="text-muted mt-3 text-sm leading-6">
          로그인이 아직 열리지 않았습니다. 씨마켓 SSO 연동 값이 설정되면 이 화면에서 바로
          로그인할 수 있습니다.
        </p>
      </LoginShell>
    )
  }

  const session = await auth()

  // 이미 자격을 갖춘 세션이면 로그인 화면을 보여줄 이유가 없다.
  if (session?.user && isAllowedGroup(session.user.groupCode)) {
    redirect(safeNextPath(next))
  }

  return (
    <LoginShell>
      <p className="text-text mt-3 text-base font-semibold">씨마켓 회원 로그인이 필요합니다</p>
      <p className="text-muted mt-2 text-sm leading-6">
        세모네모는 씨마켓 회원만 이용할 수 있습니다. 발주기관은 공급사별 단가와 낙찰가 기준을
        비교해 주문하고, 공급사 회원은 세모네모 판매가로 안전결제 구매를 할 수 있습니다.
      </p>

      {error === 'not_allowed' ? (
        <p className="mt-6 rounded-2xl bg-[#fdecec] px-4 py-3 text-sm leading-6 text-[#b42318]">
          로그인은 되었지만 이 몰을 이용할 수 있는 기관 계정이 아닙니다. 담당자에게 문의해
          주세요.
        </p>
      ) : null}

      {error === 'not_configured' ? (
        <p className="mt-6 rounded-2xl bg-[#fdecec] px-4 py-3 text-sm leading-6 text-[#b42318]">
          로그인 설정이 완료되지 않아 지금은 입장할 수 없습니다.
        </p>
      ) : null}

      <form action={signInWithCmarket} className="mt-8">
        <input type="hidden" name="redirectTo" value={safeNextPath(next)} />
        <SignInButton label={error ? '다시 시도' : '씨마켓 계정으로 로그인'} />
      </form>

      <p className="text-muted mt-4 text-center text-xs leading-5">
        아직 씨마켓 회원이 아니라면{' '}
        <a
          href={TENANT.bidRegisterUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary font-semibold underline underline-offset-2"
        >
          씨마켓에서 회원가입
        </a>
        {' '}후 이용할 수 있습니다.
      </p>
    </LoginShell>
  )
}

/**
 * 로그인 화면의 껍데기. 자체 ID/PW 폼을 두지 않는다 — 자격증명이 두 벌로 갈리고,
 * 사용자가 씨마켓 비밀번호를 다른 도메인에 넣는 습관을 배운다(피싱 표면).
 */
function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-bg flex min-h-screen items-center justify-center px-6">
      <div className="rounded-md w-full max-w-md bg-white p-10 shadow-[0_18px_48px_rgba(1,35,80,0.10)]">
        <Image
          src="/images/cmarket-logo.png"
          alt={TENANT.orgName}
          width={525}
          height={105}
          priority
          className="h-auto w-[118px]"
        />

        <h1 className="text-text mt-6 text-2xl font-bold">{TENANT.shopName}</h1>

        {children}
      </div>
    </main>
  )
}
