// Stub for the RED step; the real matching arrives in the GREEN commit.
import type { LibraryCopy, LibraryWork } from '@/features/library/queries'

export type WorkSummary = LibraryWork & { copyCount: number }

export function summarizeWorks(copies: LibraryCopy[]): WorkSummary[] {
  void copies
  return []
}

export function matchWorks(works: WorkSummary[], query: string, limit = 5): WorkSummary[] {
  void [works, query, limit]
  return []
}
