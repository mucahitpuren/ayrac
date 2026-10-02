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
