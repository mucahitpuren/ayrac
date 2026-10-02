import { Book } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type BookCoverSize = 'tile' | 'sibling' | 'hero'

type BookCoverProps = {
  size: BookCoverSize
  /** Short format label (e.g. "Hardcover") that tells copies of the same work apart. */
  formatTag?: string
  className?: string
}

const GLYPH_SIZE: Record<BookCoverSize, number> = {
  tile: 32,
  sibling: 24,
  hero: 64,
}

/**
 * Phase 1 cover: no copy has an image before COVR-01 (Phase 4), so every slot renders this solid
 * tile. It is deliberately NOT striped; the striped ghost tile is the Phase 6 missing-volume tile.
 */
export function BookCover({ size, formatTag, className }: BookCoverProps) {
  return (
    <div
      data-slot="book-cover"
      data-size={size}
      className={cn(
        'relative flex aspect-[2/3] w-full items-center justify-center rounded-[var(--radius-cover)] bg-surface-2 shadow-cover',
        className,
      )}
    >
      <Book aria-hidden size={GLYPH_SIZE[size]} className="text-muted-foreground" />
      {formatTag ? (
        <span className="absolute right-1 bottom-1 max-w-[calc(100%-0.5rem)] truncate rounded-full bg-white px-2 py-1 text-[13px] leading-none font-semibold text-[#2b2620]">
          {formatTag}
        </span>
      ) : null}
    </div>
  )
}
