import { describe, expect, it } from 'vitest'
import { matchWorks, summarizeWorks, type WorkSummary } from '@/features/book/work-picker'
import type { LibraryCopy } from '@/features/library/queries'

function copy(id: string, workId: string, title: string, authors: string[]): LibraryCopy {
  return {
    id,
    work_id: workId,
    user_id: 'u1',
    format: 'standard',
    publisher: null,
    edition_title: null,
    volume_coverage: null,
    cover_url: null,
    note: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    work: { id: workId, title, authors, genre: null, series: null, series_position: null },
  }
}

function work(id: string, title: string, authors: string[]): WorkSummary {
  return { id, title, authors, genre: null, series: null, series_position: null, copyCount: 1 }
}

const library: WorkSummary[] = [
  work('w1', '1984', ['George Orwell']),
  work('w2', 'Nutuk', ['Mustafa Kemal Atatürk']),
  work('w3', 'Kanun', ['Ahmet Nuri']),
  work('w4', 'İstanbul Hatırası', ['Ahmet Ümit']),
  work('w5', 'Işık', ['Biri']),
]

describe('summarizeWorks', () => {
  it('returns one entry per work with its copy count', () => {
    const copies = [
      copy('c1', 'w1', '1984', ['George Orwell']),
      copy('c2', 'w1', '1984', ['George Orwell']),
      copy('c3', 'w2', 'Nutuk', ['Mustafa Kemal Atatürk']),
    ]
    const summary = summarizeWorks(copies)
    expect(summary).toHaveLength(2)
    expect(summary.find((w) => w.id === 'w1')).toMatchObject({ title: '1984', copyCount: 2 })
    expect(summary.find((w) => w.id === 'w2')).toMatchObject({ title: 'Nutuk', copyCount: 1 })
  })
})

describe('matchWorks', () => {
  it('matches a substring of an author', () => {
    expect(matchWorks(library, 'orw').map((w) => w.id)).toEqual(['w1'])
  })

  it('is case-insensitive', () => {
    expect(matchWorks(library, 'NUTUK').map((w) => w.id)).toEqual(['w2'])
  })

  it('ranks title-prefix matches before other matches', () => {
    // "nu" is a prefix of Nutuk and only inside the author of Kanun (Ahmet Nuri).
    expect(matchWorks(library, 'nu').map((w) => w.id)).toEqual(['w2', 'w3'])
  })

  it('matches İstanbul with a plain "istanbul" and Işık with "ışık"', () => {
    expect(matchWorks(library, 'istanbul').map((w) => w.id)).toEqual(['w4'])
    expect(matchWorks(library, 'ışık').map((w) => w.id)).toEqual(['w5'])
  })

  it('does NOT fold ı to i: "isik" does not match Işık (Phase 2 normalize module owns full folding)', () => {
    expect(matchWorks(library, 'isik')).toEqual([])
  })

  it('shows nothing for fewer than 2 characters after trimming', () => {
    expect(matchWorks(library, 'a')).toEqual([])
    expect(matchWorks(library, ' a ')).toEqual([])
    expect(matchWorks(library, '')).toEqual([])
  })

  it('caps results at the limit (default 5)', () => {
    const many = Array.from({ length: 8 }, (_, i) => work(`m${i}`, `Masal ${i}`, ['Anonim']))
    expect(matchWorks(many, 'masal')).toHaveLength(5)
    expect(matchWorks(many, 'masal', 3)).toHaveLength(3)
  })
})
