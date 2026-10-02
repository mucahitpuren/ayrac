import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BookCover } from '@/components/book-cover'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { fetchLibrary, libraryKeys, type LibraryCopy } from './queries'

const SKELETON_TILES = 8

// phone: 3 columns, minmax(0,1fr) so a long title can never stretch one; sm: up uses the locked .grid pattern.
const GRID_CLASS =
  'grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-[repeat(auto-fill,minmax(132px,1fr))] sm:gap-x-5 sm:gap-y-7'

function CopyTile({ copy, hasSiblings }: { copy: LibraryCopy; hasSiblings: boolean }) {
  const { t } = useTranslation()
  const formatLabel = t(`format.${copy.format}`)
  const meta = copy.publisher ? `${formatLabel} · ${copy.publisher}` : formatLabel

  return (
    <li className="min-w-0">
      <div className="transition-transform duration-150 hover:-translate-y-1">
        <BookCover size="tile" formatTag={hasSiblings ? formatLabel : undefined} />
        <p className="mt-2 line-clamp-2 font-display text-base leading-tight [overflow-wrap:anywhere]">
          {copy.edition_title ?? copy.work.title}
        </p>
        {copy.work.authors.length > 0 ? (
          <p className="mt-1 truncate text-[13px] leading-[1.3] text-muted-foreground">
            {copy.work.authors.join(', ')}
          </p>
        ) : null}
        <p className="mt-1 truncate text-[13px] leading-[1.3] text-muted-foreground">{meta}</p>
      </div>
    </li>
  )
}

function SkeletonTile() {
  return (
    <li className="min-w-0" aria-hidden>
      <Skeleton className="aspect-[2/3] w-full rounded-[var(--radius-cover)]" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <Skeleton className="mt-2 h-3 w-3/5" />
    </li>
  )
}

export function LibraryPage() {
  const { t } = useTranslation()
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: libraryKeys.all,
    queryFn: () => fetchLibrary(supabase),
  })

  // LIB-10: tiles are copies. A format pill only helps when the same work appears more than once.
  const { copyCount, workCount, copiesPerWork } = useMemo(() => {
    const perWork = new Map<string, number>()
    for (const copy of data ?? []) perWork.set(copy.work_id, (perWork.get(copy.work_id) ?? 0) + 1)
    return { copyCount: data?.length ?? 0, workCount: perWork.size, copiesPerWork: perWork }
  }, [data])

  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="font-display text-[44px] leading-[1.15]">{t('library.title')}</h1>
        {data ? (
          <p className="text-base text-muted-foreground">
            {t('library.countBooks', { count: copyCount })} · {t('library.countWorks', { count: workCount })}
          </p>
        ) : (
          <Skeleton className="h-6 w-48" aria-hidden />
        )}
      </header>

      {isPending ? (
        <ul className={GRID_CLASS} aria-busy="true">
          {Array.from({ length: SKELETON_TILES }, (_, index) => (
            <SkeletonTile key={index} />
          ))}
        </ul>
      ) : isError ? (
        <div role="alert" className="flex flex-col items-start gap-4 py-8">
          <p className="text-base">{t('common.errorGeneric')}</p>
          <Button variant="outline" loading={isFetching} onClick={() => void refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col gap-2 py-16 text-center">
          <h2 className="font-display text-[22px] leading-tight">{t('library.empty.title')}</h2>
          <p className="text-base text-muted-foreground">{t('library.empty.body')}</p>
        </div>
      ) : (
        <ul className={GRID_CLASS}>
          {data.map((copy) => (
            <CopyTile key={copy.id} copy={copy} hasSiblings={(copiesPerWork.get(copy.work_id) ?? 0) > 1} />
          ))}
        </ul>
      )}
    </main>
  )
}
