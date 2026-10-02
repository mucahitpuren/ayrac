// delete_copy and create_work_with_copy semantics on the dev project (never prod): last-copy cascade, idempotency,
// concurrency on the last two copies of a work, and atomicity of the add. Synthetic titles only.
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkWithCopy } from '@/features/library/queries'
import {
  adminClient,
  anonClient,
  createTestUser,
  deleteTestUser,
  sweepTestUsers,
  type TestUser,
} from '../setup/clients'

const CHECK_VIOLATION = '23514'
const CONCURRENCY_ROUNDS = 3

const newWork = (title: string, format = 'standard') => ({
  title,
  authors: ['Test Yazar'],
  genre: null,
  series: null,
  seriesPosition: null,
  format,
  publisher: null,
  editionTitle: null,
  note: null,
})

describe('create_work_with_copy and delete_copy', () => {
  const admin = adminClient()
  let user: TestUser
  // A second, separately signed-in client of the same user: its own connection, so calls can truly overlap.
  let second: ReturnType<typeof anonClient>

  // A work with two copies owned by the test user; returns the ids.
  async function workWithTwoCopies(title: string) {
    const first = await createWorkWithCopy(user.client, newWork(title))
    const added = await user.client
      .from('copies')
      .insert({ work_id: first.workId, user_id: user.userId, format: 'hardcover' })
      .select('id')
      .single()
    if (added.error) throw added.error
    return { workId: first.workId, copyIds: [first.copyId, added.data.id] as const }
  }

  const copiesOf = async (workId: string) => {
    const { data, error } = await admin.from('copies').select('id').eq('work_id', workId)
    if (error) throw error
    return data ?? []
  }
  const worksWithId = async (workId: string) => {
    const { data, error } = await admin.from('works').select('id').eq('id', workId)
    if (error) throw error
    return data ?? []
  }

  beforeAll(async () => {
    user = await createTestUser('rpc')
    second = anonClient()
    const signedIn = await second.auth.signInWithPassword({ email: user.email, password: user.password })
    if (signedIn.error) throw signedIn.error
  })

  afterAll(async () => {
    if (user) await deleteTestUser(user.userId).catch(() => undefined)
    await sweepTestUsers()
  })

  describe('delete_copy', () => {
    it('deletes one copy, keeps the work, and deletes the work with its last copy', async () => {
      const { workId, copyIds } = await workWithTwoCopies('Two Copies')

      const first = await user.client.rpc('delete_copy', { p_copy_id: copyIds[0] }).single()
      expect(first.error).toBeNull()
      expect(first.data).toEqual({ copy_deleted: true, work_deleted: false, parent_work_id: workId })
      expect((await copiesOf(workId)).map((row) => row.id)).toEqual([copyIds[1]])
      expect(await worksWithId(workId)).toHaveLength(1)

      const last = await user.client.rpc('delete_copy', { p_copy_id: copyIds[1] }).single()
      expect(last.error).toBeNull()
      expect(last.data).toEqual({ copy_deleted: true, work_deleted: true, parent_work_id: workId })
      expect(await copiesOf(workId)).toEqual([])
      expect(await worksWithId(workId)).toEqual([])
    })

    it('is idempotent: a copy that is already gone yields false, false, null without an error', async () => {
      const { copyIds } = await workWithTwoCopies('Idempotent')
      await user.client.rpc('delete_copy', { p_copy_id: copyIds[0] }).single()
      await user.client.rpc('delete_copy', { p_copy_id: copyIds[1] }).single()

      const again = await user.client.rpc('delete_copy', { p_copy_id: copyIds[1] }).single()
      expect(again.error).toBeNull()
      expect(again.data).toEqual({ copy_deleted: false, work_deleted: false, parent_work_id: null })

      const unknown = await user.client.rpc('delete_copy', { p_copy_id: randomUUID() }).single()
      expect(unknown.error).toBeNull()
      expect(unknown.data).toEqual({ copy_deleted: false, work_deleted: false, parent_work_id: null })
    })

    it('deleting an already-deleted work affects 0 rows without an error', async () => {
      const { workId, copyIds } = await workWithTwoCopies('Deleted Twice')
      const removed = await user.client.from('works').delete().eq('id', workId).select('id')
      expect(removed.error).toBeNull()
      expect(removed.data).toEqual([{ id: workId }])
      expect(await copiesOf(workId)).toEqual([])

      const again = await user.client.from('works').delete().eq('id', workId).select('id')
      expect(again.error).toBeNull()
      expect(again.data).toEqual([])
      // The copies went with the work (cascade), so delete_copy on them is a no-op too.
      const afterCascade = await user.client.rpc('delete_copy', { p_copy_id: copyIds[0] }).single()
      expect(afterCascade.data).toEqual({ copy_deleted: false, work_deleted: false, parent_work_id: null })
    })

    it.each(Array.from({ length: CONCURRENCY_ROUNDS }, (_, round) => round + 1))(
      'two concurrent calls on the last two copies leave no zero-copy work (round %i)',
      async (round) => {
        const { workId, copyIds } = await workWithTwoCopies(`Concurrent ${round}`)

        const [one, two] = await Promise.all([
          user.client.rpc('delete_copy', { p_copy_id: copyIds[0] }).single(),
          second.rpc('delete_copy', { p_copy_id: copyIds[1] }).single(),
        ])

        expect(one.error).toBeNull()
        expect(two.error).toBeNull()
        expect(one.data?.copy_deleted).toBe(true)
        expect(two.data?.copy_deleted).toBe(true)
        // Exactly one of the two calls observed the work as empty and removed it.
        expect([one.data?.work_deleted, two.data?.work_deleted].sort()).toEqual([false, true])
        expect(await copiesOf(workId)).toEqual([])
        expect(await worksWithId(workId)).toEqual([])
      },
    )
  })

  describe('create_work_with_copy', () => {
    it('is atomic: a failing copy (format paperback) leaves no work row behind', async () => {
      const title = `Atomicity Probe ${randomUUID()}`
      await expect(createWorkWithCopy(user.client, newWork(title, 'paperback'))).rejects.toMatchObject({
        code: CHECK_VIOLATION,
      })
      const leftovers = await admin.from('works').select('id').eq('user_id', user.userId).eq('title', title)
      expect(leftovers.error).toBeNull()
      expect(leftovers.data).toEqual([])
    })

    it('creates the work and its first copy together on success', async () => {
      const title = `Atomic Success ${randomUUID()}`
      const { workId, copyId } = await createWorkWithCopy(user.client, newWork(title))
      expect(await worksWithId(workId)).toHaveLength(1)
      expect((await copiesOf(workId)).map((row) => row.id)).toEqual([copyId])
    })
  })
})
