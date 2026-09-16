'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { cancelOrder } from '@/lib/place-order'

interface CancelOrderButtonProps {
  orderNo: string
  /** 카드·포인트로 이미 결제된 주문 — 취소하면 되돌아온다는 말을 버튼에 붙인다. */
  prepaid?: boolean
}

/**
 * 주문 취소 — 접수·공급사 수락 대기까지. 선불이면 세모가 취소 직후 카드 승인 취소·포인트
 * 반환까지 한다(몰은 부르기만 한다).
 *
 * confirm 창 대신 **두 번 누르게** 한다(누르면 「정말 취소」 확정 버튼으로 바뀐다).
 * 실수 클릭 한 번으로 주문이 사라지면 안 되는 화면이다.
 */
export default function CancelOrderButton({ orderNo, prepaid = false }: CancelOrderButtonProps) {
  const router = useRouter()
  const [isArmed, setIsArmed] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCancel = async () => {
    if (!isArmed) {
      setIsArmed(true)
      return
    }
    if (isCanceling) return

    setError(null)
    setIsCanceling(true)

    try {
      await cancelOrder(orderNo)
      // 서버 컴포넌트 목록을 다시 그린다 — 상태가 함께 갱신된다.
      router.refresh()
    } catch (cause) {
      setIsCanceling(false)
      setIsArmed(false)
      setError(cause instanceof Error ? cause.message : '주문을 취소하지 못했습니다.')
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <p role="alert" className="text-xs leading-5 text-[#B3261E]">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleCancel}
        disabled={isCanceling}
        className={`min-h-9 cursor-pointer rounded-full px-4 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          isArmed
            ? 'bg-[#B3261E] text-white hover:bg-[#9A1F19]'
            : 'text-muted-strong bg-bg hover:bg-bg-secondary'
        }`}
      >
        {isCanceling
          ? '취소하는 중…'
          : isArmed
            ? prepaid
              ? '정말 취소합니다 (결제 되돌림)'
              : '정말 취소합니다'
            : '주문 취소'}
      </button>
    </div>
  )
}
