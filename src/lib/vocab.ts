// Single TypeScript source of the controlled vocabularies (D-01..D-03). The CHECK lists in
// supabase/migrations/20260926120000_init_schema.sql and the format.* / genre.* i18n keys in both
// catalogs must change in the same commit as this file; tests/unit/vocab.test.ts fails on any drift.

// D-02, in display order.
export const FORMAT_SLUGS = ['standard', 'graphic_novel', 'hardcover', 'pocket', 'special_edition', 'other'] as const

// D-03, in declaration order (the form sorts by translated label at render time).
export const GENRE_SLUGS = [
  'novel',
  'short_stories',
  'poetry',
  'drama',
  'essay',
  'classics',
  'science_fiction',
  'fantasy',
  'crime',
  'humor',
  'children',
  'biography',
  'history',
  'philosophy',
  'psychology',
  'politics_society',
  'religion_mythology',
  'science',
  'art',
  'self_help',
  'travel',
  'other',
] as const

export type FormatSlug = (typeof FORMAT_SLUGS)[number]
export type GenreSlug = (typeof GENRE_SLUGS)[number]

export function isFormatSlug(value: unknown): value is FormatSlug {
  return typeof value === 'string' && (FORMAT_SLUGS as readonly string[]).includes(value)
}

export function isGenreSlug(value: unknown): value is GenreSlug {
  return typeof value === 'string' && (GENRE_SLUGS as readonly string[]).includes(value)
}
