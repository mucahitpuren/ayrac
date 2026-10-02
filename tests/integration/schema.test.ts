// LIB-01 / LIB-02 on the dev project (never prod): every column round-trips through the app's own data functions,
// Turkish text survives byte for byte, the CHECK constraints reject bad data, and the ownership trigger wins over
// a client-supplied user_id. Synthetic, public book data only (never the author's own library under data/).
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorkWithCopy, fetchLibrary, type LibraryCopy } from '@/features/library/queries'
import { createTestUser, deleteTestUser, sweepTestUsers, type TestUser } from '../setup/clients'

const CHECK_VIOLATION = '23514'

const hex = (value: string) => Buffer.from(value, 'utf8').toString('hex')
const sorted = (ids: string[]) => [...ids].sort()
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('LIB-01 / LIB-02 schema', () => {
  let user: TestUser
  let nutukWorkId: string
  let nutukStandard: string
  let nutukSpecial: string
  let nutukHardcover: string
  let orwellWorkId: string
  let orwellStandard: string
  let orwellGraphic: string
  let sekerWorkId: string
  let sekerCopy: string

  const library = () => fetchLibrary(user.client)
  const copyById = async (id: string): Promise<LibraryCopy> => {
    const found = (await library()).find((copy) => copy.id === id)
    if (!found) throw new Error(`copy ${id} not in the library`)
    return found
  }

  beforeAll(async () => {
    user = await createTestUser('schema')

    const nutuk = await createWorkWithCopy(user.client, {
      title: 'Nutuk',
      authors: ['Mustafa Kemal Atatürk'],
      genre: 'history',
      series: 'Test Serisi',
      seriesPosition: 2,
      format: 'standard',
      publisher: 'Yapı Kredi',
      editionTitle: null,
      note: null,
    })
    nutukWorkId = nutuk.workId
    nutukStandard = nutuk.copyId
    const special = await user.client
      .from('copies')
      .insert({
        work_id: nutukWorkId,
        user_id: user.userId,
        format: 'special_edition',
        edition_title: 'Gençler İçin Fotoğraflarla Nutuk',
        note: 'Fotoğraflı Nutuk, Grafik Roman Değil',
      })
      .select('id')
      .single()
    if (special.error) throw special.error
    nutukSpecial = special.data.id
    const hardcover = await user.client
      .from('copies')
      .insert({
        work_id: nutukWorkId,
        user_id: user.userId,
        format: 'hardcover',
        volume_coverage: [1, 2, 3],
      })
      .select('id')
      .single()
    if (hardcover.error) throw hardcover.error
    nutukHardcover = hardcover.data.id

    const orwell = await createWorkWithCopy(user.client, {
      title: '1984',
      authors: ['George Orwell'],
      genre: null,
      series: null,
      seriesPosition: null,
      format: 'standard',
      publisher: null,
      editionTitle: null,
      note: null,
    })
    orwellWorkId = orwell.workId
    orwellStandard = orwell.copyId
    const graphic = await user.client
      .from('copies')
      .insert({ work_id: orwellWorkId, user_id: user.userId, format: 'graphic_novel' })
      .select('id')
      .single()
    if (graphic.error) throw graphic.error
    orwellGraphic = graphic.data.id

    const seker = await createWorkWithCopy(user.client, {
      title: 'Şeker Portakalı',
      authors: ['Işık'],
      genre: 'novel',
      series: null,
      seriesPosition: null,
      format: 'pocket',
      publisher: null,
      editionTitle: null,
      note: null,
    })
    sekerWorkId = seker.workId
    sekerCopy = seker.copyId
  })

  afterAll(async () => {
    if (user) await deleteTestUser(user.userId).catch(() => undefined)
    await sweepTestUsers()
  })

  describe('LIB-01 round trip', () => {
    it('stores every work field and returns it through fetchLibrary', async () => {
      const copy = await copyById(nutukStandard)
      expect(copy.work).toEqual({
        id: nutukWorkId,
        title: 'Nutuk',
        authors: ['Mustafa Kemal Atatürk'],
        genre: 'history',
        series: 'Test Serisi',
        series_position: 2,
      })
    })

    it('stores every copy field and returns it through fetchLibrary', async () => {
      const standard = await copyById(nutukStandard)
      expect(standard.format).toBe('standard')
      expect(standard.publisher).toBe('Yapı Kredi')
      expect(standard.edition_title).toBeNull()
      expect(standard.volume_coverage).toBeNull()
      expect(standard.note).toBeNull()

      const special = await copyById(nutukSpecial)
      expect(special.format).toBe('special_edition')
      expect(special.edition_title).toBe('Gençler İçin Fotoğraflarla Nutuk')
      expect(special.note).toBe('Fotoğraflı Nutuk, Grafik Roman Değil')

      const hardcover = await copyById(nutukHardcover)
      expect(hardcover.format).toBe('hardcover')
      expect(hardcover.volume_coverage).toEqual([1, 2, 3])
    })

    it('returns the same values from direct selects on works and copies', async () => {
      const work = await user.client.from('works').select('*').eq('id', nutukWorkId).single()
      expect(work.data).toMatchObject({
        title: 'Nutuk',
        authors: ['Mustafa Kemal Atatürk'],
        genre: 'history',
        series: 'Test Serisi',
        series_position: 2,
        user_id: user.userId,
      })
      const copy = await user.client.from('copies').select('*').eq('id', nutukSpecial).single()
      expect(copy.data).toMatchObject({
        work_id: nutukWorkId,
        user_id: user.userId,
        format: 'special_edition',
        publisher: null,
        edition_title: 'Gençler İçin Fotoğraflarla Nutuk',
        volume_coverage: null,
        note: 'Fotoğraflı Nutuk, Grafik Roman Değil',
      })
    })

    it('accepts a work without a genre (D-04)', async () => {
      const copy = await copyById(orwellStandard)
      expect(copy.work.genre).toBeNull()
      expect(copy.work.series).toBeNull()
      expect(copy.work.series_position).toBeNull()
    })

    it('round-trips Turkish text byte-identical', async () => {
      const seker = await copyById(sekerCopy)
      expect(hex(seker.work.title)).toBe(hex('Şeker Portakalı'))
      expect(hex(seker.work.authors[0] ?? '')).toBe(hex('Işık'))

      const special = await copyById(nutukSpecial)
      expect(hex(special.edition_title ?? '')).toBe(hex('Gençler İçin Fotoğraflarla Nutuk'))
      expect(hex(special.note ?? '')).toBe(hex('Fotoğraflı Nutuk, Grafik Roman Değil'))
    })
  })

  describe('LIB-02 multiple copies of one work', () => {
    it('stores Nutuk x3 and 1984 x2 as two works sharing their work ids', async () => {
      const copies = await library()
      expect(copies).toHaveLength(3 + 2 + 1)

      const nutuk = copies.filter((copy) => copy.work.title === 'Nutuk')
      const orwell = copies.filter((copy) => copy.work.title === '1984')
      expect(sorted(nutuk.map((copy) => copy.id))).toEqual(sorted([nutukStandard, nutukSpecial, nutukHardcover]))
      expect(new Set(nutuk.map((copy) => copy.work_id))).toEqual(new Set([nutukWorkId]))
      expect(sorted(orwell.map((copy) => copy.id))).toEqual(sorted([orwellStandard, orwellGraphic]))
      expect(new Set(orwell.map((copy) => copy.work_id))).toEqual(new Set([orwellWorkId]))
      expect(new Set(copies.map((copy) => copy.work_id))).toEqual(new Set([nutukWorkId, orwellWorkId, sekerWorkId]))
    })

    it('keeps the 1984 formats distinct', async () => {
      const formats = (await library())
        .filter((copy) => copy.work_id === orwellWorkId)
        .map((copy) => copy.format)
        .sort()
      expect(formats).toEqual(['graphic_novel', 'standard'])
    })
  })

  describe('CHECK constraints reject bad data', () => {
    it("rejects format 'paperback' on a copy", async () => {
      const { error } = await user.client
        .from('copies')
        .insert({ work_id: nutukWorkId, user_id: user.userId, format: 'paperback' })
      expect(error?.code).toBe(CHECK_VIOLATION)
    })

    it("rejects genre 'romance' on a work, directly and through createWorkWithCopy", async () => {
      const direct = await user.client.from('works').insert({ title: 'Bad Genre', genre: 'romance' })
      expect(direct.error?.code).toBe(CHECK_VIOLATION)
      await expect(
        createWorkWithCopy(user.client, {
          title: 'Bad Genre',
          authors: [],
          genre: 'romance',
          series: null,
          seriesPosition: null,
          format: 'standard',
          publisher: null,
          editionTitle: null,
          note: null,
        }),
      ).rejects.toMatchObject({ code: CHECK_VIOLATION })
    })

    it('rejects a whitespace-only title', async () => {
      const { error } = await user.client.from('works').insert({ title: '   ' })
      expect(error?.code).toBe(CHECK_VIOLATION)
    })

    it('rejects series_position without a series', async () => {
      const { error } = await user.client.from('works').insert({ title: 'Orphan Volume', series_position: 3 })
      expect(error?.code).toBe(CHECK_VIOLATION)
    })

    it('rejects a note of 10001 characters and accepts exactly 10000', async () => {
      const tooLong = await user.client
        .from('copies')
        .insert({ work_id: orwellWorkId, user_id: user.userId, format: 'other', note: 'x'.repeat(10001) })
      expect(tooLong.error?.code).toBe(CHECK_VIOLATION)

      const exact = await user.client
        .from('copies')
        .insert({ work_id: orwellWorkId, user_id: user.userId, format: 'other', note: 'x'.repeat(10000) })
        .select('id')
        .single()
      expect(exact.error).toBeNull()
      if (exact.data) await user.client.from('copies').delete().eq('id', exact.data.id)
    })

    it('left no partial rows behind', async () => {
      const works = await user.client.from('works').select('title')
      const titles = (works.data ?? []).map((row) => row.title).sort()
      expect(titles).toEqual(['1984', 'Nutuk', 'Şeker Portakalı'].sort())
      expect(await library()).toHaveLength(6)
    })
  })

  describe('AUTH-07 trigger and updated_at', () => {
    it("stores a copy with a client-supplied user_id under the parent work's owner", async () => {
      const forged = randomUUID()
      const { data, error } = await user.client
        .from('copies')
        .insert({ work_id: orwellWorkId, user_id: forged, format: 'pocket' })
        .select('id, user_id')
        .single()
      expect(error).toBeNull()
      expect(data?.user_id).toBe(user.userId)
      expect(data?.user_id).not.toBe(forged)
      if (data) await user.client.from('copies').delete().eq('id', data.id)
    })

    it('advances updated_at on update, for copies and works', async () => {
      const copyBefore = await user.client.from('copies').select('updated_at').eq('id', orwellStandard).single()
      const workBefore = await user.client.from('works').select('updated_at').eq('id', orwellWorkId).single()
      await pause(50)
      const copyUpdate = await user.client.from('copies').update({ note: 'updated' }).eq('id', orwellStandard)
      const workUpdate = await user.client
        .from('works')
        .update({ authors: ['George Orwell', 'Eric Blair'] })
        .eq('id', orwellWorkId)
      expect(copyUpdate.error).toBeNull()
      expect(workUpdate.error).toBeNull()
      const copyAfter = await user.client.from('copies').select('updated_at, note').eq('id', orwellStandard).single()
      const workAfter = await user.client.from('works').select('updated_at').eq('id', orwellWorkId).single()
      expect(copyAfter.data?.note).toBe('updated')
      expect(new Date(copyAfter.data?.updated_at ?? 0).getTime()).toBeGreaterThan(
        new Date(copyBefore.data?.updated_at ?? 0).getTime(),
      )
      expect(new Date(workAfter.data?.updated_at ?? 0).getTime()).toBeGreaterThan(
        new Date(workBefore.data?.updated_at ?? 0).getTime(),
      )
    })
  })
})
