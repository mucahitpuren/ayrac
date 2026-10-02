// Walking-skeleton tracer on the dev project (never prod, see tests/setup/env.ts):
// sign up the way the app does -> empty library -> atomic work+copy add -> own row visible, other user sees nothing.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkWithCopy, fetchLibrary } from '@/features/library/queries'
import {
  anonClient,
  createTestUser,
  deleteTestUser,
  sweepTestUsers,
  testEmail,
  type TestUser,
} from '../setup/clients'

describe('tracer: sign up -> own RLS-scoped library', () => {
  let userA: { client: ReturnType<typeof anonClient>; userId: string }
  let userB: TestUser

  beforeAll(async () => {
    // User A goes through auth.signUp on a fresh anon client: the app's own path (D-05, no confirmation step).
    const client = anonClient()
    const password = 'tracer-pass-' + Math.random().toString(36).slice(2, 10)
    const signedUp = await client.auth.signUp({ email: testEmail('tracer-a'), password })
    if (signedUp.error || !signedUp.data.session || !signedUp.data.user) {
      throw new Error(`tracer user A sign-up did not return a session: ${signedUp.error?.message ?? 'no session'}`)
    }
    userA = { client, userId: signedUp.data.user.id }
    userB = await createTestUser('tracer-b')
  })

  afterAll(async () => {
    if (userA) await deleteTestUser(userA.userId).catch(() => undefined)
    if (userB) await deleteTestUser(userB.userId).catch(() => undefined)
    await sweepTestUsers()
  })

  it('a new user starts with an empty library', async () => {
    expect(await fetchLibrary(userA.client)).toEqual([])
  })

  it('createWorkWithCopy inserts a work and its first copy in one call and returns both ids', async () => {
    const ids = await createWorkWithCopy(userA.client, {
      title: '1984',
      authors: ['George Orwell'],
      genre: 'novel',
      series: null,
      seriesPosition: null,
      format: 'standard',
      publisher: 'Can Yayınları',
      editionTitle: null,
      note: null,
    })
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    expect(ids.workId).toMatch(uuid)
    expect(ids.copyId).toMatch(uuid)
  })

  it('the owner reads exactly that copy with its work, owned by their own user id', async () => {
    const library = await fetchLibrary(userA.client)
    expect(library).toHaveLength(1)
    const [copy] = library
    expect(copy?.work.title).toBe('1984')
    expect(copy?.work.authors).toEqual(['George Orwell'])
    expect(copy?.format).toBe('standard')
    expect(copy?.publisher).toBe('Can Yayınları')
    expect(copy?.user_id).toBe(userA.userId)
  })

  it('another user sees nothing of it (RLS)', async () => {
    expect(await fetchLibrary(userB.client)).toEqual([])
  })
})
