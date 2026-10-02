import { describe, expect, it } from 'vitest'
import { fetchLibrary } from '@/features/library/queries'
import type { AppSupabaseClient } from '@/lib/supabase'

// A fake PostgREST client that serves `total` rows but never more than `serverCap` per request, like max_rows.
function fakeClient(total: number, serverCap: number, failAtCall?: number) {
  const ranges: Array<[number, number]> = []
  const builder = {
    select: () => builder,
    order: () => builder,
    range: (from: number, to: number) => {
      ranges.push([from, to])
      if (failAtCall === ranges.length) return Promise.resolve({ data: null, error: new Error('boom') })
      const end = Math.min(to + 1, from + serverCap, total)
      const data = Array.from({ length: Math.max(0, end - from) }, (_, i) => ({ id: String(from + i) }))
      return Promise.resolve({ data, error: null })
    },
  }
  const client = { from: () => builder } as unknown as AppSupabaseClient
  return { client, ranges }
}

describe('fetchLibrary pagination', () => {
  it('reads every page, so rows past the server row cap are not dropped', async () => {
    const { client, ranges } = fakeClient(2500, 1000)
    const rows = await fetchLibrary(client)
    expect(rows).toHaveLength(2500)
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
  })

  it('does one request for a small library', async () => {
    const { client, ranges } = fakeClient(110, 1000)
    expect(await fetchLibrary(client)).toHaveLength(110)
    expect(ranges).toHaveLength(1)
  })

  it('asks for one more page when the last page is exactly full, then stops on the empty one', async () => {
    const { client, ranges } = fakeClient(10, 5)
    expect(await fetchLibrary(client, 5)).toHaveLength(10)
    expect(ranges).toEqual([
      [0, 4],
      [5, 9],
      [10, 14],
    ])
  })

  it('returns an empty list for an empty library', async () => {
    const { client } = fakeClient(0, 1000)
    expect(await fetchLibrary(client)).toEqual([])
  })

  it('throws when any page fails instead of returning a partial library', async () => {
    const { client } = fakeClient(2500, 1000, 2)
    await expect(fetchLibrary(client)).rejects.toThrow('boom')
  })
})
