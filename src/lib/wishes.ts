/**
 * 찜(서버 저장) 외부 스토어 — 반응 스위치(`SHOP_REACTIONS`)가 켜졌을 때 `bookmarks.ts`(브라우저 저장) 대신 쓴다.
 *
 * 모양은 `bookmarks.ts` 와 같다(useSyncExternalStore). 다른 점은 원본이 세모라는 것:
 *   * 첫 구독 때 한 번 `/api/shop/reactions/wishes?view=ids` 로 내 찜 id 를 받는다.
 *   * 누르면 화면은 바로 바뀌고(낙관적), 서버가 거절하면 되돌린 뒤 이유를 `lastError` 에 남긴다.
 *
 * 스위치가 꺼져 있으면 이 파일은 아무도 부르지 않는다 — ShopProvider 가 `ensureWishesLoaded()` 를 켜졌을 때만 부른다.
 */

const EMPTY: string[] = []

let snapshot: string[] = EMPTY
let loadState: 'idle' | 'loading' | 'loaded' = 'idle'
let lastError: string | null = null

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(notify => notify())
}

export function subscribeWishes(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getWishSnapshot(): string[] {
  return snapshot
}

export function getWishServerSnapshot(): string[] {
  return EMPTY
}

export function getWishError(): string | null {
  return lastError
}

/** 한 번만 받는다. 실패하면 다음 화면 이동 때 다시 시도할 수 있게 idle 로 돌린다. */
export function ensureWishesLoaded(): void {
  if (loadState !== 'idle') return
  loadState = 'loading'
  fetch('/api/shop/reactions/wishes?view=ids', { cache: 'no-store' })
    .then(async response => {
      if (!response.ok) throw new Error(String(response.status))
      const data = (await response.json()) as { ids?: unknown }
      snapshot = Array.isArray(data.ids) ? data.ids.filter((id): id is string => typeof id === 'string') : EMPTY
      loadState = 'loaded'
      emit()
    })
    .catch(() => {
      loadState = 'idle'
    })
}

async function messageOf(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { message?: unknown } | null
  return typeof data?.message === 'string' && data.message ? data.message : fallback
}

export async function toggleWish(productId: string): Promise<void> {
  const wasWished = snapshot.includes(productId)
  snapshot = wasWished ? snapshot.filter(id => id !== productId) : [...snapshot, productId]
  lastError = null
  emit()

  try {
    const response = wasWished
      ? await fetch(`/api/shop/reactions/wishes/${encodeURIComponent(productId)}`, { method: 'DELETE' })
      : await fetch('/api/shop/reactions/wishes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: productId }),
        })
    if (!response.ok) {
      throw new Error(await messageOf(response, wasWished ? '찜을 해제하지 못했습니다.' : '찜을 저장하지 못했습니다.'))
    }
  } catch (error) {
    // 되돌린다 — 화면이 서버와 다른 채로 남으면 «찜했는데 없다» 가 된다.
    snapshot = wasWished ? [...snapshot, productId] : snapshot.filter(id => id !== productId)
    lastError = error instanceof Error ? error.message : '찜을 저장하지 못했습니다.'
    emit()
  }
}
