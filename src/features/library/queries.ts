// Client-injected data functions shared by the app and the integration tests. The client type is
// imported type-only so tests can load this module without the browser env vars (src/lib/supabase.ts
// throws at import time when VITE_ variables are missing).
import type { AppSupabaseClient } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export const libraryKeys = { all: ['library'] as const }

export type LibraryWork = Pick<
  Tables<'works'>,
  'id' | 'title' | 'authors' | 'genre' | 'series' | 'series_position'
>

export type LibraryCopy = Pick<
  Tables<'copies'>,
  | 'id'
  | 'work_id'
  | 'user_id'
  | 'format'
  | 'publisher'
  | 'edition_title'
  | 'volume_coverage'
  | 'cover_url'
  | 'note'
  | 'created_at'
  | 'updated_at'
> & { work: LibraryWork }

export type NewWorkWithCopy = {
  title: string
  authors: string[]
  genre: string | null
  series: string | null
  seriesPosition: number | null
  format: string
  publisher: string | null
  editionTitle: string | null
  note: string | null
}

const LIBRARY_SELECT =
  'id, work_id, user_id, format, publisher, edition_title, volume_coverage, cover_url, note, created_at, updated_at, ' +
  'work:works!inner(id, title, authors, genre, series, series_position)'

// LIB-10: one row per copy, never per work. Newest first; id breaks ties so equal timestamps keep a stable order.
export async function fetchLibrary(client: AppSupabaseClient): Promise<LibraryCopy[]> {
  const { data, error } = await client
    .from('copies')
    .select(LIBRARY_SELECT)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
  if (error) throw error
  return data as unknown as LibraryCopy[]
}

// The generated RPC argument types do not model SQL NULL (every argument is typed as non-null), but
// PostgREST binds a JSON null to NULL. This is the single place that bridges the two.
function sqlNull<T>(value: T | null): T {
  return value as T
}

// ADD-02 foundation: the work and its first copy are inserted by one database function, in one transaction.
export async function createWorkWithCopy(
  client: AppSupabaseClient,
  input: NewWorkWithCopy,
): Promise<{ workId: string; copyId: string }> {
  const { data, error } = await client
    .rpc('create_work_with_copy', {
      p_title: input.title,
      p_authors: input.authors,
      p_genre: sqlNull(input.genre),
      p_series: sqlNull(input.series),
      p_series_position: sqlNull(input.seriesPosition),
      p_format: input.format,
      p_publisher: sqlNull(input.publisher),
      p_edition_title: sqlNull(input.editionTitle),
      p_note: sqlNull(input.note),
    })
    .single()
  if (error) throw error
  return { workId: data.new_work_id, copyId: data.new_copy_id }
}

export const copyKeys = { detail: (id: string) => ['copy', id] as const }

export type CopySibling = Pick<Tables<'copies'>, 'id' | 'format' | 'publisher' | 'edition_title' | 'created_at'>

export type CopyDetail = Pick<
  Tables<'copies'>,
  'id' | 'work_id' | 'format' | 'publisher' | 'edition_title' | 'note' | 'created_at'
> & {
  work: Pick<Tables<'works'>, 'id' | 'title' | 'authors' | 'genre' | 'series' | 'series_position'>
  // Every copy of the same work (including this one), oldest first, id as the tie-break.
  siblings: CopySibling[]
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

const COPY_DETAIL_SELECT =
  'id, work_id, format, publisher, edition_title, note, created_at, ' +
  'work:works!inner(id, title, authors, genre, series, series_position, ' +
  'siblings:copies(id, format, publisher, edition_title, created_at))'

type CopyDetailRow = Omit<CopyDetail, 'siblings' | 'work'> & {
  work: CopyDetail['work'] & { siblings: CopySibling[] }
}

// Timestamps are compared as instants (Postgres trims trailing fraction zeros, so string order is unreliable).
function compareSiblings(a: CopySibling, b: CopySibling): number {
  return Date.parse(a.created_at) - Date.parse(b.created_at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

// LIB-06: null (not an error) when the id is malformed or the row is not visible to the signed-in user, so
// RLS and a bad URL both end in the same not-found screen. A malformed id never reaches the server.
export async function fetchCopyDetail(client: AppSupabaseClient, copyId: string): Promise<CopyDetail | null> {
  if (!isUuid(copyId)) return null
  const { data, error } = await client.from('copies').select(COPY_DETAIL_SELECT).eq('id', copyId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as unknown as CopyDetailRow
  const { siblings, ...work } = row.work
  return {
    id: row.id,
    work_id: row.work_id,
    format: row.format,
    publisher: row.publisher,
    edition_title: row.edition_title,
    note: row.note,
    created_at: row.created_at,
    work,
    siblings: [...siblings].sort(compareSiblings),
  }
}

// READ-04: a blank note is stored as NULL by the caller. Zero updated rows means the copy is gone or not ours.
export async function updateCopyNote(client: AppSupabaseClient, copyId: string, note: string | null): Promise<void> {
  const { data, error } = await client.from('copies').update({ note }).eq('id', copyId).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('copy not found')
}
