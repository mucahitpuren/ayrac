import { describe, expect, it } from 'vitest'
import { updateCopy } from '@/features/library/queries'
import type { AppSupabaseClient } from '@/lib/supabase'

// Captures the UPDATE payload; the chain mirrors from().update().eq().select().
function fakeClient() {
  const payloads: Record<string, unknown>[] = []
  const builder = {
    update: (payload: Record<string, unknown>) => {
      payloads.push(payload)
      return builder
    },
    eq: () => builder,
    select: () => Promise.resolve({ data: [{ id: 'c1' }], error: null }),
  }
  const client = { from: () => builder } as unknown as AppSupabaseClient
  return { client, payloads }
}

describe('updateCopy payload', () => {
  it('omits note when the patch has none, so the stored note is untouched', async () => {
    const { client, payloads } = fakeClient()
    await updateCopy(client, 'c1', { format: 'standard', publisher: null, editionTitle: null })
    expect(payloads).toEqual([{ format: 'standard', publisher: null, edition_title: null }])
  })

  it('sends note, including an explicit NULL, when the patch has one', async () => {
    const { client, payloads } = fakeClient()
    await updateCopy(client, 'c1', { format: 'standard', publisher: 'P', editionTitle: null, note: null })
    await updateCopy(client, 'c1', { format: 'standard', publisher: 'P', editionTitle: null, note: 'hi' })
    expect(payloads[0]).toHaveProperty('note', null)
    expect(payloads[1]).toHaveProperty('note', 'hi')
  })
})
