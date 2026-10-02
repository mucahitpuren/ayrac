// LIB-02 data path on the dev project (never prod, see tests/setup/env.ts): a copy attached to an existing
// work, the work summary used by /eser/:workId/nusha-ekle, and the refusal to attach to a foreign work.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { addCopyToWork, createWorkWithCopy, fetchCopyDetail, fetchLibrary, fetchWorkSummary } from '@/features/library/queries'
import { createTestUser, deleteTestUser, sweepTestUsers, type TestUser } from '../setup/clients'

const noWork = {
  genre: null,
  series: null,
  seriesPosition: null,
  publisher: null,
  editionTitle: null,
  note: null,
}

describe('add copy to an existing work', () => {
  let owner: TestUser
  let other: TestUser
  let workId: string
  let firstCopyId: string
  let foreignWorkId: string

  beforeAll(async () => {
    owner = await createTestUser('addcopy-a')
    other = await createTestUser('addcopy-b')
    const created = await createWorkWithCopy(owner.client, {
      ...noWork,
      title: '1984',
      authors: ['George Orwell'],
      genre: 'novel',
      format: 'standard',
    })
    workId = created.workId
    firstCopyId = created.copyId
    foreignWorkId = (
      await createWorkWithCopy(other.client, { ...noWork, title: 'Private', authors: ['Other Reader'], format: 'standard' })
    ).workId
  })

  afterAll(async () => {
    if (owner) await deleteTestUser(owner.userId).catch(() => undefined)
    if (other) await deleteTestUser(other.userId).catch(() => undefined)
    await sweepTestUsers()
  })

  it('summarises the work with its copy count', async () => {
    const summary = await fetchWorkSummary(owner.client, workId)
    expect(summary).toMatchObject({ id: workId, title: '1984', authors: ['George Orwell'], genre: 'novel', copyCount: 1 })
  })

  it('returns null for a malformed id, an unknown id and another account\'s work', async () => {
    expect(await fetchWorkSummary(owner.client, 'not-a-uuid')).toBeNull()
    expect(await fetchWorkSummary(owner.client, '00000000-0000-4000-8000-000000000000')).toBeNull()
    expect(await fetchWorkSummary(owner.client, foreignWorkId)).toBeNull()
  })

  it('attaches a second copy to the same work without touching the work', async () => {
    const newCopyId = await addCopyToWork(owner.client, {
      workId,
      format: 'graphic_novel',
      publisher: 'Can Yayınları',
      editionTitle: null,
      note: null,
    })
    const detail = await fetchCopyDetail(owner.client, newCopyId)
    expect(detail?.work_id).toBe(workId)
    expect(detail?.format).toBe('graphic_novel')
    expect(detail?.siblings.map((s) => s.id)).toEqual([firstCopyId, newCopyId])
    expect(detail?.work).toMatchObject({ title: '1984', authors: ['George Orwell'], genre: 'novel' })
    expect((await fetchWorkSummary(owner.client, workId))?.copyCount).toBe(2)
    const library = await fetchLibrary(owner.client)
    expect(new Set(library.map((c) => c.work_id)).size).toBe(1)
    expect(library).toHaveLength(2)
  })

  it('refuses to attach a copy to another account\'s work or an unknown work', async () => {
    const base = { format: 'standard', publisher: null, editionTitle: null, note: null }
    await expect(addCopyToWork(owner.client, { ...base, workId: foreignWorkId })).rejects.toThrow()
    await expect(addCopyToWork(owner.client, { ...base, workId: '00000000-0000-4000-8000-000000000000' })).rejects.toThrow()
    expect((await fetchWorkSummary(other.client, foreignWorkId))?.copyCount).toBe(1)
  })
})
