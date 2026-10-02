// LIB-08 / LIB-09 data path on the dev project (never prod, see tests/setup/env.ts): editing a work or a copy
// through the client wrappers, and deleting a copy or a work with the results the dialogs rely on.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  addCopyToWork,
  createWorkWithCopy,
  deleteCopy,
  deleteWork,
  fetchCopyDetail,
  fetchLibrary,
  updateCopy,
  updateWork,
} from '@/features/library/queries'
import { createTestUser, deleteTestUser, sweepTestUsers, type TestUser } from '../setup/clients'

const noExtras = { genre: null, series: null, seriesPosition: null, publisher: null, editionTitle: null, note: null }
const copyBase = { format: 'standard', publisher: null, editionTitle: null, note: null }

// noUncheckedIndexedAccess: the tests only index ids they created.
function at(ids: string[], index: number): string {
  const id = ids[index]
  if (id === undefined) throw new Error(`no id at ${index}`)
  return id
}

describe('edit and delete', () => {
  let owner: TestUser
  let other: TestUser

  beforeAll(async () => {
    owner = await createTestUser('editdel-a')
    other = await createTestUser('editdel-b')
  })

  afterAll(async () => {
    if (owner) await deleteTestUser(owner.userId).catch(() => undefined)
    if (other) await deleteTestUser(other.userId).catch(() => undefined)
    await sweepTestUsers()
  })

  async function newWork(title: string, copies: number) {
    const created = await createWorkWithCopy(owner.client, {
      ...noExtras,
      title,
      authors: ['Author'],
      genre: 'novel',
      series: 'Series',
      seriesPosition: 2,
      format: 'standard',
      publisher: 'Old Publisher',
      editionTitle: 'Edition',
    })
    const copyIds = [created.copyId]
    for (let i = 1; i < copies; i += 1) {
      copyIds.push(await addCopyToWork(owner.client, { ...copyBase, workId: created.workId }))
    }
    return { workId: created.workId, copyIds }
  }

  describe('updateWork / updateCopy', () => {
    it('changes work fields for every copy and copy fields for that copy only, clearing optional fields to NULL', async () => {
      const { workId, copyIds } = await newWork('1984', 2)
      await updateWork(owner.client, workId, {
        title: 'Bin Dokuz Yüz Seksen Dört',
        authors: ['George Orwell', 'Second Author'],
        genre: 'classics',
        series: null,
        seriesPosition: null,
      })
      await updateCopy(owner.client, at(copyIds, 0), {
        format: 'hardcover',
        publisher: 'New Publisher',
        editionTitle: null,
        note: 'edited',
      })

      const first = await fetchCopyDetail(owner.client, at(copyIds, 0))
      const second = await fetchCopyDetail(owner.client, at(copyIds, 1))
      for (const detail of [first, second]) {
        expect(detail?.work).toMatchObject({
          title: 'Bin Dokuz Yüz Seksen Dört',
          authors: ['George Orwell', 'Second Author'],
          genre: 'classics',
          series: null,
          series_position: null,
        })
      }
      expect(first).toMatchObject({ format: 'hardcover', publisher: 'New Publisher', edition_title: null, note: 'edited' })
      expect(second).toMatchObject({ format: 'standard', publisher: null, edition_title: null, note: null })
    })

    it('is idempotent: re-applying the same edit converges to the same row', async () => {
      const { workId, copyIds } = await newWork('Idempotent', 1)
      const work = { title: 'Same', authors: ['A'], genre: 'novel', series: null, seriesPosition: null }
      const copy = { format: 'pocket', publisher: null, editionTitle: null, note: null }
      await updateWork(owner.client, workId, work)
      await updateCopy(owner.client, at(copyIds, 0), copy)
      const once = await fetchCopyDetail(owner.client, at(copyIds, 0))
      await updateWork(owner.client, workId, work)
      await updateCopy(owner.client, at(copyIds, 0), copy)
      const twice = await fetchCopyDetail(owner.client, at(copyIds, 0))
      expect(twice).toEqual(once)
    })

    it("refuses to edit another account's work or copy", async () => {
      const { workId, copyIds } = await newWork('Mine', 1)
      const work = { title: 'Hijacked', authors: ['X'], genre: 'novel', series: null, seriesPosition: null }
      await expect(updateWork(other.client, workId, work)).rejects.toThrow()
      await expect(updateCopy(other.client, at(copyIds, 0), { ...copyBase, publisher: 'Hijacked' })).rejects.toThrow()
      const detail = await fetchCopyDetail(owner.client, at(copyIds, 0))
      expect(detail?.work.title).toBe('Mine')
      expect(detail?.publisher).toBe('Old Publisher')
    })
  })

  describe('deleteCopy / deleteWork', () => {
    it('deleting one of several copies leaves the work and reports no work deletion', async () => {
      const { workId, copyIds } = await newWork('Nutuk', 3)
      const result = await deleteCopy(owner.client, at(copyIds, 1))
      expect(result).toEqual({ copyDeleted: true, workDeleted: false, workId })
      const detail = await fetchCopyDetail(owner.client, at(copyIds, 0))
      expect(detail?.siblings.map((s) => s.id)).toEqual([at(copyIds, 0), at(copyIds, 2)])
    })

    it('deleting the last copy deletes the work in the same call, and repeating it is a no-op', async () => {
      const { workId, copyIds } = await newWork('Last', 1)
      const result = await deleteCopy(owner.client, at(copyIds, 0))
      expect(result).toEqual({ copyDeleted: true, workDeleted: true, workId })
      expect((await fetchLibrary(owner.client)).some((c) => c.work_id === workId)).toBe(false)

      const again = await deleteCopy(owner.client, at(copyIds, 0))
      expect(again.copyDeleted).toBe(false)
      expect(again.workDeleted).toBe(false)
    })

    it('deleting a work removes all its copies, and deleting it again is a silent no-op', async () => {
      const { workId, copyIds } = await newWork('Whole work', 2)
      await deleteWork(owner.client, workId)
      expect(await fetchCopyDetail(owner.client, at(copyIds, 0))).toBeNull()
      expect(await fetchCopyDetail(owner.client, at(copyIds, 1))).toBeNull()
      await expect(deleteWork(owner.client, workId)).resolves.toBeUndefined()
    })

    it("cannot delete another account's copy or work", async () => {
      const { workId, copyIds } = await newWork('Protected', 2)
      const result = await deleteCopy(other.client, at(copyIds, 0))
      expect(result.copyDeleted).toBe(false)
      await deleteWork(other.client, workId)
      const detail = await fetchCopyDetail(owner.client, at(copyIds, 0))
      expect(detail?.siblings).toHaveLength(2)
    })
  })
})
