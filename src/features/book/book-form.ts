import { zodResolver } from '@hookform/resolvers/zod'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import type {
  CopyDetail,
  NewCopyForWork,
  NewWorkWithCopy,
  UpdateCopyInput,
  UpdateCopyPatch,
  UpdateWorkInput,
} from '@/features/library/queries'
import { FORMAT_SLUGS, GENRE_SLUGS, isFormatSlug, isGenreSlug } from '@/lib/vocab'

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

// The work and copy halves share one normalization for the add and the edit paths: NFC + trim, '' -> NULL,
// authors parsed from the single field, position dropped without a series.
export function toUpdateWorkInput(values: BookFormValues): UpdateWorkInput {
  const series = emptyToNull(values.series)
  const position = seriesPositionOf(values.series, values.seriesPosition)
  return {
    title: normalizeText(values.title),
    authors: parseAuthors(values.authorsRaw),
    genre: values.genre,
    series,
    seriesPosition: series !== null && position !== null && !Number.isNaN(position) ? position : null,
  }
}

export function toUpdateCopyInput(values: BookFormValues): UpdateCopyInput {
  return {
    format: values.format,
    publisher: emptyToNull(values.publisher),
    editionTitle: emptyToNull(values.editionTitle),
    note: emptyToNull(values.note),
  }
}

// WR-04: the edit form leaves the note out unless the user changed it, so a note saved meanwhile by the detail
// page's autosave is never overwritten by the (possibly stale) value the form was pre-filled with.
export function toEditCopyInput(values: BookFormValues, initialNote: string | null): UpdateCopyPatch {
  const { note, ...rest } = toUpdateCopyInput(values)
  return note === emptyToNull(initialNote) ? rest : { ...rest, note }
}

export function toCreateWorkWithCopyInput(values: BookFormValues): NewWorkWithCopy {
  return { ...toUpdateWorkInput(values), ...toUpdateCopyInput(values) }
}

// LIB-08: DB NULLs become '' so optional fields render genuinely empty (never a dash). genre and format are
// left unset when the stored value is NULL or unknown, so the user has to pick one before saving.
export function fromCopyDetail(detail: CopyDetail): Partial<BookFormValues> {
  const { work } = detail
  return {
    title: work.title,
    authorsRaw: work.authors.join(', '),
    ...(isGenreSlug(work.genre) ? { genre: work.genre } : {}),
    series: work.series ?? '',
    seriesPosition: work.series_position === null ? '' : String(work.series_position),
    ...(isFormatSlug(detail.format) ? { format: detail.format } : {}),
    publisher: detail.publisher ?? '',
    editionTitle: detail.edition_title ?? '',
    note: detail.note ?? '',
  }
}

export type CopyFormValues = Pick<BookFormValues, 'format' | 'publisher' | 'editionTitle' | 'note'>

// LIB-02: only the copy fields; the work is identified by id and never edited from the copy forms.
export function toAddCopyInput(workId: string, values: CopyFormValues): NewCopyForWork {
  return {
    workId,
    format: values.format,
    publisher: emptyToNull(values.publisher),
    editionTitle: emptyToNull(values.editionTitle),
    note: emptyToNull(values.note),
  }
}

// The copy forms share CopyFields with the full form, so they run on the full form's value type; this
// resolver validates the copy fields only. Work fields are neither validated nor required in that mode.
export const copyOnlyResolver = zodResolver(copyFieldsSchema) as unknown as Resolver<BookFormValues>
