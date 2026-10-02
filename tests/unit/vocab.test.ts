import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FORMAT_SLUGS, GENRE_SLUGS, isFormatSlug, isGenreSlug } from '@/lib/vocab'

type Json = { [key: string]: string | Json }

function flatten(obj: Json, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else Object.assign(out, flatten(value, path))
  }
  return out
}

function loadCatalog(lng: 'tr' | 'en'): Record<string, string> {
  const url = new URL(`../../src/i18n/locales/${lng}.json`, import.meta.url)
  return flatten(JSON.parse(readFileSync(url, 'utf8')) as Json)
}

// Pulls the slug list of one CHECK constraint out of the migration, in declaration order.
function migrationList(constraint: string): string[] {
  const sql = readFileSync(new URL('../../supabase/migrations/20260926120000_init_schema.sql', import.meta.url), 'utf8')
  const match = new RegExp(`constraint ${constraint} check \\([\\s\\S]*?\\bin \\(([^)]*)\\)`).exec(sql)
  if (!match) throw new Error(`constraint ${constraint} not found in init_schema.sql`)
  return [...(match[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1] as string)
}

describe('vocab slugs vs the migration', () => {
  it('FORMAT_SLUGS equals the copies.format CHECK list', () => {
    expect([...FORMAT_SLUGS]).toEqual(migrationList('copies_format_check'))
  })

  it('GENRE_SLUGS equals the works.genre CHECK list', () => {
    expect([...GENRE_SLUGS]).toEqual(migrationList('works_genre_check'))
  })

  it('has the six D-02 formats and the 22 D-03 genres', () => {
    expect(FORMAT_SLUGS).toHaveLength(6)
    expect(GENRE_SLUGS).toHaveLength(22)
  })

  it('type guards accept slugs and reject anything else', () => {
    expect(isFormatSlug('hardcover')).toBe(true)
    expect(isFormatSlug('paperback')).toBe(false)
    expect(isGenreSlug('crime')).toBe(true)
    expect(isGenreSlug('romance')).toBe(false)
  })
})

describe('vocab slugs vs the catalogs', () => {
  for (const lng of ['tr', 'en'] as const) {
    it(`${lng}.json has a label for every slug and no extra format./genre. keys`, () => {
      const catalog = loadCatalog(lng)
      for (const slug of FORMAT_SLUGS) expect(catalog[`format.${slug}`], `format.${slug}`).toBeTruthy()
      for (const slug of GENRE_SLUGS) expect(catalog[`genre.${slug}`], `genre.${slug}`).toBeTruthy()
      const formatKeys = Object.keys(catalog).filter((k) => k.startsWith('format.'))
      const genreKeys = Object.keys(catalog).filter((k) => k.startsWith('genre.'))
      expect(formatKeys.sort()).toEqual(FORMAT_SLUGS.map((s) => `format.${s}`).sort())
      expect(genreKeys.sort()).toEqual(GENRE_SLUGS.map((s) => `genre.${s}`).sort())
    })
  }

  it('spot-checks the D-02 / D-03 labels', () => {
    expect(loadCatalog('tr')['format.standard']).toBe('Normal Baskı')
    expect(loadCatalog('en')['genre.crime']).toBe('Crime & mystery')
    expect(loadCatalog('tr')['genre.children']).toBe('Çocuk & Gençlik')
  })
})
