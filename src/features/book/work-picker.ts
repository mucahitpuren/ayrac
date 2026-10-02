// D-08 / D-09: suggestions of the user's own works under the Title field of the add form.
//
// Matching is intentionally simple: a case-insensitive substring match with Turkish-locale lowercasing
// (İ -> i, I -> ı) over the already-loaded library. It does NOT fold ı/ş/ç/ğ/ö/ü to ASCII, so "isik" does not
// find "Işık"; tests/unit/work-picker.test.ts pins that. It is meant to be superseded by Phase 2's shared
// normalize module, which is also where ADD-03's duplicate warning hooks into this spot.
import type { LibraryCopy, LibraryWork } from '@/features/library/queries'

export type WorkSummary = LibraryWork & { copyCount: number }

const MIN_QUERY_LENGTH = 2

function fold(value: string): string {
  return value.toLocaleLowerCase('tr')
}

// One entry per work id, in the order the works first appear in the list.
export function summarizeWorks(copies: LibraryCopy[]): WorkSummary[] {
  const byId = new Map<string, WorkSummary>()
  for (const copy of copies) {
    const existing = byId.get(copy.work.id)
    if (existing) existing.copyCount += 1
    else byId.set(copy.work.id, { ...copy.work, copyCount: 1 })
  }
  return [...byId.values()]
}

export function matchWorks(works: WorkSummary[], query: string, limit = 5): WorkSummary[] {
  const needle = fold(query.trim())
  if ([...needle].length < MIN_QUERY_LENGTH) return []

  const matches: { work: WorkSummary; titleStarts: boolean }[] = []
  for (const work of works) {
    const title = fold(work.title)
    const inTitle = title.includes(needle)
    if (!inTitle && !work.authors.some((author) => fold(author).includes(needle))) continue
    matches.push({ work, titleStarts: title.startsWith(needle) })
  }

  matches.sort(
    (a, b) =>
      Number(b.titleStarts) - Number(a.titleStarts) || a.work.title.localeCompare(b.work.title, 'tr'),
  )
  return matches.slice(0, limit).map((match) => match.work)
}
