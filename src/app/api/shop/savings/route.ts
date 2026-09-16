import { NextResponse } from 'next/server'

import type { Product } from '@/components/Shop/product.data'
import { fetchStorefrontPage, maskForViewer, SemoFeedError } from '@/lib/catalog'
import { matchScore, MAX_PASTE_ROWS, nameTokens } from '@/lib/purchase-paste'
import { getShopMember } from '@/lib/shop-member'

/**
 * 절감액 계산 — 붙여 넣은 줄마다 몰에서 후보 상품을 찾아 돌려준다.
 *
 * 계산(절감액)은 화면이 한다. 서버는 «후보 찾기» 만 한다 — 후보를 담당자가 바꿀 수 있어야 해서,
 * 합계를 서버에서 굳히면 «이 상품 아닌데» 를 고칠 수 없다.
 *
 * 피드 호출을 줄마다 한 번(0건이면 첫 낱말로 한 번 더) 하므로 줄 수와 동시성에 상한을 둔다.
 */

const CONCURRENCY = 5
const CANDIDATES = 3

interface Row {
  name?: unknown
  spec?: unknown
}

export async function POST(request: Request) {
  const member = await getShopMember()
  if (!member) {
    return NextResponse.json({ message: '로그인하면 몰 판매가로 계산할 수 있습니다.' }, { status: 401 })
  }

  let rows: Row[]
  try {
    const body = (await request.json()) as { rows?: Row[] }
    rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_PASTE_ROWS) : []
  } catch {
    return NextResponse.json({ message: '요청 본문을 읽지 못했습니다.' }, { status: 400 })
  }
  if (rows.length === 0) {
    return NextResponse.json({ message: '계산할 줄이 없습니다.' }, { status: 400 })
  }

  const results: { index: number; candidates: Product[] }[] = []
  try {
    for (let start = 0; start < rows.length; start += CONCURRENCY) {
      const batch = rows.slice(start, start + CONCURRENCY)
      const found = await Promise.all(
        batch.map(async (row, offset) => {
          const name = typeof row.name === 'string' ? row.name.trim().slice(0, 80) : ''
          if (!name) return { index: start + offset, candidates: [] }

          let items = (await fetchStorefrontPage({ q: name, limit: 8 })).items
          if (items.length === 0) {
            const [first] = nameTokens(name).sort((a, b) => b.length - a.length)
            if (first && first !== name) items = (await fetchStorefrontPage({ q: first, limit: 8 })).items
          }

          const ranked = items
            .map(item => ({ item, score: matchScore(name, item.name) }))
            .sort((a, b) => b.score - a.score || a.item.basePrice - b.item.basePrice)
            .slice(0, CANDIDATES)
            .map(entry => maskForViewer(entry.item, member.tier))

          return { index: start + offset, candidates: ranked }
        }),
      )
      results.push(...found)
    }
  } catch (error) {
    const message = error instanceof SemoFeedError ? error.message : '상품을 찾지 못했습니다.'
    console.error('[shop/api savings]', message)
    return NextResponse.json({ message }, { status: 502 })
  }

  return NextResponse.json({ results })
}
