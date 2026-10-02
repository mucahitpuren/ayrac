import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { copyKeys, fetchCopyDetail } from '@/features/library/queries'
import { supabase } from '@/lib/supabase'
import { CopyHero } from './CopyHero'
import { NoteCard } from './NoteCard'
import { SiblingsSection } from './SiblingsSection'

const CONTENT_CLASS = 'mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-5 py-8 sm:px-8'

// Same footprint as the loaded hero (cover + text rows + padding) so nothing jumps when data arrives.
function DetailSkeleton() {
  return (
    <div aria-busy="true">
      <Skeleton className="h-[600px] w-full rounded-none sm:h-[450px]" aria-hidden />
      <div className={CONTENT_CLASS} aria-hidden>
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
          <Skeleton className="h-52 w-full rounded-lg" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function CopyDetailPage() {
  const { t } = useTranslation()
  const { copyId = '' } = useParams()
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: copyKeys.detail(copyId),
    queryFn: () => fetchCopyDetail(supabase, copyId),
  })

  if (isPending) return <DetailSkeleton />

  if (isError) {
    return (
      <main className={CONTENT_CLASS}>
        <div role="alert" className="flex flex-col items-start gap-4 py-8">
          <p className="text-base">{t('common.errorGeneric')}</p>
          <Button variant="outline" loading={isFetching} onClick={() => void refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      </main>
    )
  }

  // Malformed ids and rows hidden by RLS (another account's copy) land here and reveal nothing.
  if (data === null) {
    return (
      <main className={CONTENT_CLASS}>
        <div className="flex flex-col items-start gap-4 py-8">
          <p className="text-base">{t('common.notFound')}</p>
          <Link to="/" className="text-base font-semibold text-primary underline-offset-4 hover:underline">
            {t('common.backToLibrary')}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main>
      <CopyHero detail={data} />
      <div className={CONTENT_CLASS}>
        <NoteCard key={data.id} copyId={data.id} initialNote={data.note} />
        <SiblingsSection detail={data} />
      </div>
    </main>
  )
}
