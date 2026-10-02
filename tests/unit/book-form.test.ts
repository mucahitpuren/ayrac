import { describe, expect, it } from 'vitest'
import {
  bookFormSchema,
  codePointLength,
  fromCopyDetail,
  normalizeText,
  parseAuthors,
  toCreateWorkWithCopyInput,
  toUpdateCopyInput,
  toUpdateWorkInput,
  type BookFormValues,
} from '@/features/book/book-form'
import type { CopyDetail } from '@/features/library/queries'

const valid: BookFormValues = {
  title: 'Nutuk',
  authorsRaw: 'Mustafa Kemal Atatürk',
  genre: 'history',
  series: '',
  seriesPosition: '',
  format: 'standard',
  publisher: '',
  editionTitle: '',
  note: '',
}

function messages(values: Partial<BookFormValues>): string[] {
  const result = bookFormSchema.safeParse({ ...valid, ...values })
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('parseAuthors', () => {
  it('trims, drops empty entries and removes case-insensitive duplicates keeping the first spelling', () => {
    expect(parseAuthors(' George Orwell ,  , george orwell, Aldous Huxley')).toEqual(['George Orwell', 'Aldous Huxley'])
  })

  it('uses Turkish lowercasing for the duplicate check', () => {
    expect(parseAuthors('İlber Ortaylı, ilber ortaylı')).toEqual(['İlber Ortaylı'])
  })

  it('returns an empty list for an empty or comma-only field', () => {
    expect(parseAuthors('')).toEqual([])
    expect(parseAuthors(' , ,')).toEqual([])
  })
})

describe('normalizeText / codePointLength', () => {
  it('trims and NFC-composes', () => {
    expect(normalizeText('İstanbul ')).toBe('İstanbul')
    expect(normalizeText('İstanbul')).toBe('İstanbul')
  })

  it('counts code points like Postgres char_length, not UTF-16 units', () => {
    expect(codePointLength('😀'.repeat(500))).toBe(500)
    expect(codePointLength('Gençler')).toBe(7)
  })
})

describe('bookFormSchema', () => {
  it('accepts a minimal valid form and an edition-style title', () => {
    expect(messages({})).toEqual([])
    expect(messages({ title: 'Gençler İçin Fotoğraflarla Nutuk' })).toEqual([])
  })

  it('rejects a whitespace-only title as required', () => {
    expect(messages({ title: '   ' })).toContain('form.errors.required')
  })

  it('rejects a 501 code point title as too long and accepts 500 emoji', () => {
    expect(messages({ title: 'a'.repeat(501) })).toContain('form.errors.tooLong')
    expect(messages({ title: '😀'.repeat(500) })).toEqual([])
    expect(messages({ title: '😀'.repeat(501) })).toContain('form.errors.tooLong')
  })

  it('rejects an author field that yields no names', () => {
    expect(messages({ authorsRaw: ' , ' })).toContain('form.errors.required')
    expect(messages({ authorsRaw: '' })).toContain('form.errors.required')
  })

  it('rejects more than 20 authors and an author over 200 code points', () => {
    const many = Array.from({ length: 21 }, (_, i) => `Yazar ${i}`).join(',')
    expect(messages({ authorsRaw: many })).toContain('form.errors.tooLong')
    expect(messages({ authorsRaw: 'a'.repeat(201) })).toContain('form.errors.tooLong')
  })

  it('requires genre (D-04) and only accepts slugs', () => {
    expect(messages({ genre: '' as BookFormValues['genre'] })).not.toEqual([])
    expect(messages({ genre: 'romance' as BookFormValues['genre'] })).not.toEqual([])
  })

  it('requires format and only accepts slugs', () => {
    expect(messages({ format: '' as BookFormValues['format'] })).not.toEqual([])
    expect(messages({ format: 'paperback' as BookFormValues['format'] })).not.toEqual([])
  })

  it('enforces the optional field length limits', () => {
    expect(messages({ series: 'a'.repeat(201) })).toContain('form.errors.tooLong')
    expect(messages({ publisher: 'a'.repeat(201) })).toContain('form.errors.tooLong')
    expect(messages({ editionTitle: 'a'.repeat(501) })).toContain('form.errors.tooLong')
    expect(messages({ note: 'a'.repeat(10001) })).toContain('form.errors.tooLong')
    expect(messages({ note: 'a'.repeat(10000) })).toEqual([])
  })

  it('series position: integers 1..9999 only', () => {
    expect(messages({ series: 'Test', seriesPosition: '2' })).toEqual([])
    for (const bad of ['0', '2.5', 'abc', '-1', '10000']) {
      expect(messages({ series: 'Test', seriesPosition: bad }), bad).toContain('form.errors.positiveInteger')
    }
  })
})

describe('toCreateWorkWithCopyInput', () => {
  it('maps blank optional fields to null and parses authors', () => {
    expect(toCreateWorkWithCopyInput({ ...valid, authorsRaw: ' A , a, B ' })).toEqual({
      title: 'Nutuk',
      authors: ['A', 'B'],
      genre: 'history',
      series: null,
      seriesPosition: null,
      format: 'standard',
      publisher: null,
      editionTitle: null,
      note: null,
    })
  })

  it('keeps the series position as a number when the series is set', () => {
    const input = toCreateWorkWithCopyInput({ ...valid, series: ' Test ', seriesPosition: '2' })
    expect(input.series).toBe('Test')
    expect(input.seriesPosition).toBe(2)
  })

  it('drops a series position without a series name', () => {
    const input = toCreateWorkWithCopyInput({ ...valid, series: '  ', seriesPosition: '3' })
    expect(input.series).toBeNull()
    expect(input.seriesPosition).toBeNull()
  })

  it('stores publisher, edition title and note trimmed and NFC-normalized', () => {
    const input = toCreateWorkWithCopyInput({
      ...valid,
      publisher: ' Can Yayınları ',
      editionTitle: 'Gençler İçin Nutuk ',
      note: ' notum ',
    })
    expect(input.publisher).toBe('Can Yayınları')
    expect(input.editionTitle).toBe('Gençler İçin Nutuk')
    expect(input.note).toBe('notum')
  })
})

const detail: CopyDetail = {
  id: 'c1',
  work_id: 'w1',
  format: 'graphic_novel',
  publisher: null,
  edition_title: null,
  note: null,
  created_at: '2026-10-02T10:00:00Z',
  work: { id: 'w1', title: '1984', authors: ['George Orwell', 'Fromm'], genre: 'novel', series: null, series_position: null },
  siblings: [],
}

describe('fromCopyDetail', () => {
  it('renders NULL optional fields as genuinely empty strings, never a dash', () => {
    const values = fromCopyDetail(detail)
    expect(values).toMatchObject({ publisher: '', editionTitle: '', note: '', series: '', seriesPosition: '' })
  })

  it('joins authors and stringifies the series position', () => {
    const values = fromCopyDetail({
      ...detail,
      work: { ...detail.work, series: 'Seri', series_position: 3 },
    })
    expect(values.authorsRaw).toBe('George Orwell, Fromm')
    expect(values.seriesPosition).toBe('3')
  })

  it('leaves genre unset when the stored genre is NULL so one must be chosen before saving', () => {
    const values = fromCopyDetail({ ...detail, work: { ...detail.work, genre: null } })
    expect(values.genre).toBeUndefined()
  })

  it('round-trips through the update inputs: cleared optional fields go back to NULL', () => {
    const values = { ...valid, ...fromCopyDetail(detail) } as BookFormValues
    expect(toUpdateCopyInput(values)).toEqual({ format: 'graphic_novel', publisher: null, editionTitle: null, note: null })
    expect(toUpdateWorkInput(values)).toEqual({
      title: '1984',
      authors: ['George Orwell', 'Fromm'],
      genre: 'novel',
      series: null,
      seriesPosition: null,
    })
  })
})
