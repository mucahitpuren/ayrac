import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { addCopyToWork, fetchWorkSummary, invalidateCopyQueries, workKeys } from '@/features/library/queries'
import { supabase } from '@/lib/supabase'
import { CopyFields } from './BookFormFields'
import { copyOnlyResolver, toAddCopyInput, type BookFormValues } from './book-form'

const PAGE_CLASS = 'mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8'

// Final-size placeholders for the work header and the copy fields (G5): nothing is editable, and no submit
// button exists, until the work is known.
function AddCopySkeleton() {
  return (
    <main className={PAGE_CLASS}>
      <Card className="mx-auto w-full max-w-[640px]" aria-busy="true">
        <div className="flex flex-col gap-2" aria-hidden>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <div className="flex flex-col gap-4" aria-hidden>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Card>
    </main>
  )
}

function NotFoundMessage() {
  const { t } = useTranslation()
  return (
    <main className={PAGE_CLASS}>
      <div className="flex flex-col items-start gap-4 py-8">
        <p className="text-base">{t('common.notFound')}</p>
        <Link to="/" className="text-base font-semibold text-primary underline-offset-4 hover:underline">
          {t('common.backToLibrary')}
        </Link>
      </div>
    </main>
  )
}

// LIB-02 / D-07 entry 1: a copy-only form that attaches a new copy to an existing work.
export function AddCopyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { workId = '' } = useParams()

  const work = useQuery({
    queryKey: workKeys.summary(workId),
    queryFn: () => fetchWorkSummary(supabase, workId),
  })

  const form = useForm<BookFormValues>({
    resolver: copyOnlyResolver,
    mode: 'onBlur',
    shouldFocusError: true,
    defaultValues: { publisher: '', editionTitle: '', note: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: BookFormValues) => addCopyToWork(supabase, toAddCopyInput(workId, values)),
    onSuccess: async (newCopyId) => {
      await invalidateCopyQueries(queryClient)
      void navigate(`/kitap/${newCopyId}`)
    },
  })

  const onValid = (values: BookFormValues) => {
    if (mutation.isPending) return
    mutation.mutate(values)
  }

  if (work.isPending) return <AddCopySkeleton />

  if (work.isError) {
    return (
      <main className={PAGE_CLASS}>
        <div role="alert" className="flex flex-col items-start gap-4 py-8">
          <p className="text-base">{t('common.errorGeneric')}</p>
          <Button variant="outline" loading={work.isFetching} onClick={() => void work.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      </main>
    )
  }

  // Malformed ids and works hidden by RLS (another account's work) both end here and reveal nothing.
  if (work.data === null) return <NotFoundMessage />

  const { title, authors } = work.data

  return (
    <main className={PAGE_CLASS}>
      <Card className="mx-auto w-full max-w-[640px]">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-[22px] leading-tight [overflow-wrap:anywhere]">
            {t('book.addCopy.title', { work: title })}
          </h1>
          <p className="text-base text-muted-foreground [overflow-wrap:anywhere]">{authors.join(', ')}</p>
        </div>
        <form noValidate onSubmit={form.handleSubmit(onValid)} className="flex flex-col gap-6">
          <CopyFields form={form} autoFocusFormat />

          {mutation.isError ? (
            <p role="alert" className="text-[13px] leading-[1.3] text-destructive">
              {t('common.errorGeneric')}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" loading={mutation.isPending} className="w-full sm:w-auto">
              {t('book.addCopy.submit')}
            </Button>
            <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => void navigate(-1)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  )
}
