import { z } from 'zod'
import type { NewWorkWithCopy } from '@/features/library/queries'
import { FORMAT_SLUGS, GENRE_SLUGS } from '@/lib/vocab'

// Limits mirror the database CHECK constraints. Postgres char_length counts code points, so the client
// counts code points too (never UTF-16 units, which would disagree for emoji and other astral characters).
const LIMITS = {
  title: 500,
  author: 200,
  authors: 20,
  series: 200,
  publisher: 200,
  editionTitle: 500,
  note: 10000,
  seriesPosition: 9999,
} as const

const REQUIRED = 'form.errors.required'
const TOO_LONG = 'form.errors.tooLong'
const POSITIVE_INTEGER = 'form.errors.positiveInteger'

// Text is stored as entered after trim + Unicode NFC (decomposed Turkish input from some keyboards composes).
export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').normalize('NFC').trim()
}

export function codePointLength(value: string): number {
  return [...value].length
}

export function emptyToNull(value: string | null | undefined): string | null {
  const normalized = normalizeText(value)
  return normalized === '' ? null : normalized
}

// D-06: one comma-separated field -> list of names. Duplicates are compared with Turkish lowercasing
// (İ/i, I/ı) and the first spelling wins.
export function parseAuthors(raw: string | null | undefined): string[] {
  const seen = new Set<string>()
  const authors: string[] = []
  for (const part of (raw ?? '').split(',')) {
    const name = normalizeText(part)
    if (name === '') continue
    const key = name.toLocaleLowerCase('tr')
    if (seen.has(key)) continue
    seen.add(key)
    authors.push(name)
  }
  return authors
}

// Messages are i18n keys, translated at render time so a language switch updates visible errors.
function text(max: number, options: { required: boolean }) {
  return z.string().superRefine((value, ctx) => {
    const normalized = normalizeText(value)
    if (normalized === '') {
      if (options.required) ctx.addIssue({ code: 'custom', message: REQUIRED })
      return
    }
    if (codePointLength(normalized) > max) ctx.addIssue({ code: 'custom', message: TOO_LONG })
  })
}

const workShape = {
  title: text(LIMITS.title, { required: true }),
  authorsRaw: z.string().superRefine((value, ctx) => {
    const authors = parseAuthors(value)
    if (authors.length === 0) {
      ctx.addIssue({ code: 'custom', message: REQUIRED })
    } else if (authors.length > LIMITS.authors || authors.some((a) => codePointLength(a) > LIMITS.author)) {
      ctx.addIssue({ code: 'custom', message: TOO_LONG })
    }
  }),
  // D-04: required in the form although the column is nullable; 'other' is the escape hatch.
  genre: z.enum(GENRE_SLUGS, { error: REQUIRED }),
  series: text(LIMITS.series, { required: false }),
  seriesPosition: z.string(),
}

const copyShape = {
  format: z.enum(FORMAT_SLUGS, { error: REQUIRED }),
  publisher: text(LIMITS.publisher, { required: false }),
  editionTitle: text(LIMITS.editionTitle, { required: false }),
  note: text(LIMITS.note, { required: false }),
}

// The position is only meaningful (and only validated) while a series name is present.
function seriesPositionOf(series: string, position: string): number | null {
  if (normalizeText(series) === '') return null
  const raw = normalizeText(position)
  if (raw === '') return null
  if (!/^[0-9]+$/.test(raw)) return Number.NaN
  const value = Number(raw)
  return value >= 1 && value <= LIMITS.seriesPosition ? value : Number.NaN
}

function checkSeriesPosition(values: { series: string; seriesPosition: string }, ctx: z.RefinementCtx) {
  if (Number.isNaN(seriesPositionOf(values.series, values.seriesPosition))) {
    ctx.addIssue({ code: 'custom', message: POSITIVE_INTEGER, path: ['seriesPosition'] })
  }
}

export const workFieldsSchema = z.object(workShape).superRefine(checkSeriesPosition)
export const copyFieldsSchema = z.object(copyShape)
export const bookFormSchema = z.object({ ...workShape, ...copyShape }).superRefine(checkSeriesPosition)

export type BookFormValues = z.input<typeof bookFormSchema>

export function toCreateWorkWithCopyInput(values: BookFormValues): NewWorkWithCopy {
  const series = emptyToNull(values.series)
  const position = seriesPositionOf(values.series, values.seriesPosition)
  return {
    title: normalizeText(values.title),
    authors: parseAuthors(values.authorsRaw),
    genre: values.genre,
    series,
    seriesPosition: series !== null && position !== null && !Number.isNaN(position) ? position : null,
    format: values.format,
    publisher: emptyToNull(values.publisher),
    editionTitle: emptyToNull(values.editionTitle),
    note: emptyToNull(values.note),
  }
}
