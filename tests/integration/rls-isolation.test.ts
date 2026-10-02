// AUTH-07: two-account isolation matrix on the dev project (never prod, see tests/setup/env.ts).
// Every negative assertion for account B is paired with a positive read by the owner and an admin-client check
// that the rows exist and are unchanged, so "RLS returns nothing for everybody" cannot pass as isolation.
// Ids are always compared as sorted sets, never as ordered lists.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkWithCopy, fetchLibrary } from '@/features/library/queries'
import {
  adminClient,
  anonClient,
  createTestUser,
  deleteTestUser,
  sweepTestUsers,
  type TestUser,
} from '../setup/clients'
import { schemaTables } from '../setup/schema-tables'

// AUTH-07 gate: a table added by a later migration fails this test until it is added here AND covered below.
const COVERED_TABLES = ['copies', 'works']

const NUTUK = {
  title: 'Nutuk',
  authors: ['Mustafa Kemal Atatürk'],
  genre: null,
  series: null,
  seriesPosition: null,
  format: 'standard',
  publisher: null,
  editionTitle: null,
  note: null,
}

const sorted = (ids: string[]) => [...ids].sort()
// Sorted ids of the rows owned by one user.
const idsOwnedBy = (rows: { id: string; user_id: string }[] | null, userId: string) =>
  sorted((rows ?? []).filter((row) => row.user_id === userId).map((row) => row.id))

describe('AUTH-07 two-account isolation', () => {
  const admin = adminClient()
  let a: TestUser
  let b: TestUser
  let c: TestUser
  let aWorkId: string
  let aCopy1: string
  let aCopy2: string
  let bWorkId: string
  let bCopy: string

  beforeAll(async () => {
    a = await createTestUser('iso-a')
    b = await createTestUser('iso-b')
    c = await createTestUser('iso-c')

    const first = await createWorkWithCopy(a.client, NUTUK)
    aWorkId = first.workId
    aCopy1 = first.copyId
    const second = await a.client
      .from('copies')
      .insert({ work_id: aWorkId, user_id: a.userId, format: 'hardcover' })
      .select('id')
      .single()
    if (second.error) throw second.error
    aCopy2 = second.data.id

    const bIds = await createWorkWithCopy(b.client, NUTUK)
    bWorkId = bIds.workId
    bCopy = bIds.copyId
  })

  afterAll(async () => {
    for (const user of [a, b, c]) {
      if (user) await deleteTestUser(user.userId).catch(() => undefined)
    }
    await sweepTestUsers()
  })

  it('covers exactly the tables created by the migrations', () => {
    expect([...COVERED_TABLES].sort()).toEqual(schemaTables())
  })

  describe('positive controls (the rows exist and the owners can see them)', () => {
    it('the admin client sees A with 1 work and 2 copies, B with 1 work and 1 copy', async () => {
      const works = await admin.from('works').select('id, user_id').in('user_id', [a.userId, b.userId])
      const copies = await admin.from('copies').select('id, user_id').in('user_id', [a.userId, b.userId])
      expect(works.error).toBeNull()
      expect(copies.error).toBeNull()
      expect(idsOwnedBy(works.data, a.userId)).toEqual([aWorkId])
      expect(idsOwnedBy(works.data, b.userId)).toEqual([bWorkId])
      expect(idsOwnedBy(copies.data, a.userId)).toEqual(sorted([aCopy1, aCopy2]))
      expect(idsOwnedBy(copies.data, b.userId)).toEqual([bCopy])
    })

    it('A reads own work and both copies; B reads own work and copy', async () => {
      const aWorks = await a.client.from('works').select('id')
      const aCopies = await a.client.from('copies').select('id')
      const bWorks = await b.client.from('works').select('id')
      const bCopies = await b.client.from('copies').select('id')
      expect(sorted((aWorks.data ?? []).map((row) => row.id))).toEqual([aWorkId])
      expect(sorted((aCopies.data ?? []).map((row) => row.id))).toEqual(sorted([aCopy1, aCopy2]))
      expect(sorted((bWorks.data ?? []).map((row) => row.id))).toEqual([bWorkId])
      expect(sorted((bCopies.data ?? []).map((row) => row.id))).toEqual([bCopy])
    })
  })

  describe('works: B against A', () => {
    it("cannot select A's work by id", async () => {
      const { data, error } = await b.client.from('works').select('id').eq('id', aWorkId)
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it("cannot update A's work (no row affected, values unchanged for the admin)", async () => {
      const { data, error } = await b.client.from('works').update({ title: 'Hijacked' }).eq('id', aWorkId).select('id')
      expect(error).toBeNull()
      expect(data).toEqual([])
      const check = await admin.from('works').select('title, authors').eq('id', aWorkId).single()
      expect(check.data).toEqual({ title: 'Nutuk', authors: ['Mustafa Kemal Atatürk'] })
    })

    it("cannot delete A's work (no row affected, still exists for the admin)", async () => {
      const { data, error } = await b.client.from('works').delete().eq('id', aWorkId).select('id')
      expect(error).toBeNull()
      expect(data).toEqual([])
      const check = await admin.from('works').select('id').eq('id', aWorkId)
      expect(check.data).toEqual([{ id: aWorkId }])
    })

    it("cannot insert a work carrying A's user_id", async () => {
      const { error } = await b.client.from('works').insert({ title: 'Forged', user_id: a.userId })
      expect(error).not.toBeNull()
      const check = await admin.from('works').select('id').eq('title', 'Forged')
      expect(check.data).toEqual([])
    })
  })

  describe('copies: B against A', () => {
    it("cannot select A's copy by id", async () => {
      const { data, error } = await b.client.from('copies').select('id').eq('id', aCopy1)
      expect(error).toBeNull()
      expect(data).toEqual([])
    })

    it("cannot update A's copy (no row affected, values unchanged for the admin)", async () => {
      const { data, error } = await b.client.from('copies').update({ note: 'Hijacked' }).eq('id', aCopy1).select('id')
      expect(error).toBeNull()
      expect(data).toEqual([])
      const check = await admin.from('copies').select('note, format').eq('id', aCopy1).single()
      expect(check.data).toEqual({ note: null, format: 'standard' })
    })

    it("cannot delete A's copy (no row affected, still exists for the admin)", async () => {
      const { data, error } = await b.client.from('copies').delete().eq('id', aCopy1).select('id')
      expect(error).toBeNull()
      expect(data).toEqual([])
      const check = await admin.from('copies').select('id').eq('id', aCopy1)
      expect(check.data).toEqual([{ id: aCopy1 }])
    })

    it("cannot attach a copy to A's work, even with a forged user_id", async () => {
      for (const userId of [a.userId, b.userId]) {
        const { error } = await b.client
          .from('copies')
          .insert({ work_id: aWorkId, user_id: userId, format: 'pocket', note: 'intruder' })
        expect(error).not.toBeNull()
      }
      const check = await admin.from('copies').select('id').eq('work_id', aWorkId)
      expect(sorted((check.data ?? []).map((row) => row.id))).toEqual(sorted([aCopy1, aCopy2]))
    })

    it("cannot move B's own copy under A's work", async () => {
      const { error } = await b.client.from('copies').update({ work_id: aWorkId }).eq('id', bCopy)
      expect(error).not.toBeNull()
      const check = await admin.from('copies').select('work_id, user_id').eq('id', bCopy).single()
      expect(check.data).toEqual({ work_id: bWorkId, user_id: b.userId })
    })
  })

  describe('RPCs: B against A', () => {
    it("delete_copy on A's copy deletes nothing", async () => {
      const { data, error } = await b.client.rpc('delete_copy', { p_copy_id: aCopy1 }).single()
      expect(error).toBeNull()
      expect(data).toEqual({ copy_deleted: false, work_deleted: false, parent_work_id: null })
      const check = await admin.from('copies').select('id').eq('work_id', aWorkId)
      expect(sorted((check.data ?? []).map((row) => row.id))).toEqual(sorted([aCopy1, aCopy2]))
    })
  })

  describe('anon (no session)', () => {
    it('reads zero rows from works and copies while rows exist', async () => {
      const anon = anonClient()
      const works = await anon.from('works').select('id')
      const copies = await anon.from('copies').select('id')
      expect(works.data ?? []).toEqual([])
      expect(copies.data ?? []).toEqual([])
      const exists = await admin.from('works').select('id', { count: 'exact', head: true })
      expect(exists.count).toBeGreaterThanOrEqual(2)
    })

    it('cannot insert into works or copies', async () => {
      const anon = anonClient()
      const work = await anon.from('works').insert({ title: 'Anon Intruder', user_id: a.userId })
      const copy = await anon.from('copies').insert({ work_id: aWorkId, user_id: a.userId, format: 'standard' })
      expect(work.error).not.toBeNull()
      expect(copy.error).not.toBeNull()
      const check = await admin.from('works').select('id').eq('title', 'Anon Intruder')
      expect(check.data).toEqual([])
    })

    it('cannot update or delete anything', async () => {
      const anon = anonClient()
      const update = await anon.from('works').update({ title: 'Anon Hijack' }).eq('id', aWorkId).select('id')
      const remove = await anon.from('copies').delete().eq('id', aCopy1).select('id')
      expect(update.error !== null || (update.data ?? []).length === 0).toBe(true)
      expect(remove.error !== null || (remove.data ?? []).length === 0).toBe(true)
      const work = await admin.from('works').select('title').eq('id', aWorkId).single()
      const copy = await admin.from('copies').select('id').eq('id', aCopy1)
      expect(work.data).toEqual({ title: 'Nutuk' })
      expect(copy.data).toEqual([{ id: aCopy1 }])
    })

    it('cannot call create_work_with_copy or delete_copy', async () => {
      const anon = anonClient()
      const create = await anon.rpc('create_work_with_copy', {
        p_title: 'Anon Intruder RPC',
        p_authors: [],
        p_genre: null as unknown as string,
        p_series: null as unknown as string,
        p_series_position: null as unknown as number,
        p_format: 'standard',
        p_publisher: null as unknown as string,
        p_edition_title: null as unknown as string,
        p_note: null as unknown as string,
      })
      const remove = await anon.rpc('delete_copy', { p_copy_id: aCopy1 })
      expect(create.error).not.toBeNull()
      expect(remove.error).not.toBeNull()
      const work = await admin.from('works').select('id').eq('title', 'Anon Intruder RPC')
      const copy = await admin.from('copies').select('id').eq('id', aCopy1)
      expect(work.data).toEqual([])
      expect(copy.data).toEqual([{ id: aCopy1 }])
    })
  })

  describe('adjacency and empty states', () => {
    it('two accounts adding the same title and authors get separate work ids', () => {
      expect(aWorkId).not.toBe(bWorkId)
    })

    it("each account's library returns only its own copy ids", async () => {
      const [aLibrary, bLibrary] = await Promise.all([fetchLibrary(a.client), fetchLibrary(b.client)])
      expect(sorted(aLibrary.map((copy) => copy.id))).toEqual(sorted([aCopy1, aCopy2]))
      expect(sorted(bLibrary.map((copy) => copy.id))).toEqual([bCopy])
      expect([...new Set(aLibrary.map((copy) => copy.work_id))]).toEqual([aWorkId])
      expect([...new Set(bLibrary.map((copy) => copy.work_id))]).toEqual([bWorkId])
      expect(aLibrary.every((copy) => copy.user_id === a.userId)).toBe(true)
      expect(bLibrary.every((copy) => copy.user_id === b.userId)).toBe(true)
    })

    it('a brand-new account has an empty library', async () => {
      expect(await fetchLibrary(c.client)).toEqual([])
    })
  })
})
