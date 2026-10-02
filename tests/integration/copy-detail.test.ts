// LIB-06 / LIB-10 / READ-04 data path on the dev project (never prod, see tests/setup/env.ts):
// siblings of one work, not-found for malformed or foreign ids, and the note write.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkWithCopy, fetchCopyDetail, updateCopyNote } from '@/features/library/queries'
import { createTestUser, deleteTestUser, sweepTestUsers, type TestUser } from '../setup/clients'

const noWork = {
  genre: null,
  series: null,
  seriesPosition: null,
  publisher: null,
  editionTitle: null,
  note: null,
}

describe('copy detail data path', () => {
  let owner: TestUser
  let other: TestUser
  let firstCopyId: string
  let secondCopyId: string
  let otherWorkCopyId: string
  let foreignCopyId: string

  beforeAll(async () => {
    owner = await createTestUser('copydetail-a')
    other = await createTestUser('copydetail-b')

    const first = await createWorkWithCopy(owner.client, {
      ...noWork,
      title: '1984',
      authors: ['George Orwell'],
      format: 'standard',
      publisher: 'Can Yayınları',
    })
    firstCopyId = first.copyId
    const second = await owner.client
      .from('copies')
      .insert({ work_id: first.workId, user_id: owner.userId, format: 'graphic_novel' })
      .select('id')
      .single()
    if (second.error) throw second.error
    secondCopyId = second.data.id

    // Same title, different author: must be a separate work with a separate detail page.
    const sameTitle = await createWorkWithCopy(owner.client, {
      ...noWork,
      title: '1984',
      authors: ['Someone Else'],
      format: 'hardcover',
    })
    otherWorkCopyId = sameTitle.copyId

    const foreign = await createWorkWithCopy(other.client, {
      ...noWork,
      title: 'Private',
      authors: ['Other Reader'],
      format: 'standard',
    })
    foreignCopyId = foreign.copyId
  })

  afterAll(async () => {
    if (owner) await deleteTestUser(owner.userId).catch(() => undefined)
    if (other) await deleteTestUser(other.userId).catch(() => undefined)
    await sweepTestUsers()
  })

  it('lists exactly the copies of the same work, oldest first, from either copy', async () => {
    const viaFirst = await fetchCopyDetail(owner.client, firstCopyId)
    const viaSecond = await fetchCopyDetail(owner.client, secondCopyId)
    expect(viaFirst?.id).toBe(firstCopyId)
    expect(viaFirst?.siblings.map((s) => s.id)).toEqual([firstCopyId, secondCopyId])
    expect(viaSecond?.id).toBe(secondCopyId)
    expect(viaSecond?.siblings.map((s) => s.id)).toEqual([firstCopyId, secondCopyId])
    expect(viaFirst?.work.title).toBe('1984')
    expect(viaFirst?.work.authors).toEqual(['George Orwell'])
  })

  it('a different work with the same title has its own page and a single sibling', async () => {
    const detail = await fetchCopyDetail(owner.client, otherWorkCopyId)
    expect(detail?.work.authors).toEqual(['Someone Else'])
    expect(detail?.siblings.map((s) => s.id)).toEqual([otherWorkCopyId])
  })

  it('returns null for a malformed id, an unknown id and another account\'s copy', async () => {
    expect(await fetchCopyDetail(owner.client, 'not-a-uuid')).toBeNull()
    expect(await fetchCopyDetail(owner.client, '00000000-0000-4000-8000-000000000000')).toBeNull()
    expect(await fetchCopyDetail(owner.client, foreignCopyId)).toBeNull()
  })

  it('writes a note, then stores NULL when it is cleared', async () => {
    await updateCopyNote(owner.client, firstCopyId, 'Great translation')
    expect((await fetchCopyDetail(owner.client, firstCopyId))?.note).toBe('Great translation')
    await updateCopyNote(owner.client, firstCopyId, null)
    expect((await fetchCopyDetail(owner.client, firstCopyId))?.note).toBeNull()
  })

  it('refuses to write a note on a copy the user cannot see', async () => {
    await expect(updateCopyNote(owner.client, foreignCopyId, 'nope')).rejects.toThrow()
    expect((await fetchCopyDetail(other.client, foreignCopyId))?.note).toBeNull()
  })
})
