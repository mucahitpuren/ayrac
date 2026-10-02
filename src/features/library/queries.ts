// Client-injected data functions shared by the app and the integration tests. The client type is
// imported type-only so tests can load this module without the browser env vars (src/lib/supabase.ts
// throws at import time when VITE_ variables are missing).
import type { QueryClient } from '@tanstack/react-query'
import type { AppSupabaseClient } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/lib/database.types'

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

// PostgREST answers at most `max_rows` rows (supabase/config.toml, 1000) and truncates silently beyond that.
export const LIBRARY_PAGE_SIZE = 1000

// LIB-10: one row per copy, never per work. Newest first; id breaks ties so equal timestamps keep a stable order.
// The whole library is read page by page: a shelf past the server row cap must never be cut off without a sign.
export async function fetchLibrary(client: AppSupabaseClient, pageSize = LIBRARY_PAGE_SIZE): Promise<LibraryCopy[]> {
  const rows: LibraryCopy[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from('copies')
      .select(LIBRARY_SELECT)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...(data as unknown as LibraryCopy[]))
    if (data.length < pageSize) return rows
  }
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

export const copyKeys = { all: ['copy'] as const, detail: (id: string) => ['copy', id] as const }
export const workKeys = { all: ['work'] as const, summary: (id: string) => ['work', id] as const }

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

export type WorkSummaryRow = Pick<Tables<'works'>, 'id' | 'title' | 'authors' | 'genre' | 'series' | 'series_position'> & {
  copyCount: number
}

export type NewCopyForWork = {
  workId: string
  format: string
  publisher: string | null
  editionTitle: string | null
  note: string | null
}

// LIB-02: the work behind /eser/:workId/nusha-ekle. null (not an error) for a malformed id without any request,
// and for a work RLS hides, so a foreign id looks exactly like a missing one.
export async function fetchWorkSummary(client: AppSupabaseClient, workId: string): Promise<WorkSummaryRow | null> {
  if (!isUuid(workId)) return null
  const { data, error } = await client
    .from('works')
    .select('id, title, authors, genre, series, series_position, copies(count)')
    .eq('id', workId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const { copies, ...work } = data as unknown as Omit<WorkSummaryRow, 'copyCount'> & { copies: { count: number }[] }
  return { ...work, copyCount: copies[0]?.count ?? 0 }
}

// LIB-02: attach a new copy to an existing work. The payload carries work_id only; user_id is set by the
// invoker-rights trigger from the work the caller can see, so a foreign or unknown work fails with 'work not found'.
export async function addCopyToWork(client: AppSupabaseClient, input: NewCopyForWork): Promise<string> {
  const { data, error } = await client
    .from('copies')
    .insert({
      work_id: input.workId,
      format: input.format,
      publisher: input.publisher,
      edition_title: input.editionTitle,
      note: input.note,
    } as TablesInsert<'copies'>) // the generated type requires user_id, but the trigger always sets it
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

// After a copy was added every list that shows copies or copy counts is stale: the library, each copy's
// siblings and every work header. Prefix keys match all of them.
export async function invalidateCopyQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all(
    [libraryKeys.all, copyKeys.all, workKeys.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  )
}

export type UpdateWorkInput = {
  title: string
  authors: string[]
  genre: string | null
  series: string | null
  seriesPosition: number | null
}

export type UpdateCopyInput = {
  format: string
  publisher: string | null
  editionTitle: string | null
  note: string | null
}

// An edit sends `note` only when the user changed it. The note is also saved by its own autosave on the detail
// page, so writing an untouched (possibly stale) form value back would overwrite a newer note.
export type UpdateCopyPatch = Omit<UpdateCopyInput, 'note'> & { note?: string | null }

// LIB-08: every column the form edits is sent (the note only when it was changed, see UpdateCopyPatch), so
// re-submitting the same values is idempotent. Neither id nor user_id is ever part of the payload. Zero updated
// rows means the row is gone or not ours (RLS).
export async function updateWork(client: AppSupabaseClient, workId: string, input: UpdateWorkInput): Promise<void> {
  const { data, error } = await client
    .from('works')
    .update({
      title: input.title,
      authors: input.authors,
      genre: input.genre,
      series: input.series,
      series_position: input.seriesPosition,
    })
    .eq('id', workId)
    .select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('work not found')
}

export async function updateCopy(client: AppSupabaseClient, copyId: string, input: UpdateCopyPatch): Promise<void> {
  const { data, error } = await client
    .from('copies')
    .update({
      format: input.format,
      publisher: input.publisher,
      edition_title: input.editionTitle,
      ...(input.note !== undefined ? { note: input.note } : {}),
    })
    .eq('id', copyId)
    .select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('copy not found')
}

export type DeleteCopyResult = { copyDeleted: boolean; workDeleted: boolean; workId: string | null }

// LIB-09: one database function deletes the copy and, when it was the work's last copy, the work, in one
// transaction. copyDeleted=false means the copy was already gone (e.g. deleted in another tab): not an error.
export async function deleteCopy(client: AppSupabaseClient, copyId: string): Promise<DeleteCopyResult> {
  const { data, error } = await client.rpc('delete_copy', { p_copy_id: copyId }).single()
  if (error) throw error
  return { copyDeleted: data.copy_deleted, workDeleted: data.work_deleted, workId: data.parent_work_id ?? null }
}

// LIB-09: copies go with their work (ON DELETE CASCADE). Zero rows (already gone) is not an error.
export async function deleteWork(client: AppSupabaseClient, workId: string): Promise<void> {
  const { error } = await client.from('works').delete().eq('id', workId)
  if (error) throw error
}

// After a delete the library is stale, and so is every cached copy page and work header. The copy/work
// queries are only marked stale (no refetch): the page that is still mounted shows the row that was just
// deleted, and refetching it would flash a not-found screen before the redirect lands.
export async function invalidateAfterDelete(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
    queryClient.invalidateQueries({ queryKey: copyKeys.all, refetchType: 'none' }),
    queryClient.invalidateQueries({ queryKey: workKeys.all, refetchType: 'none' }),
  ])
}
