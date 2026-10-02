import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  copyKeys,
  fetchCopyDetail,
  invalidateCopyQueries,
  updateCopy,
  updateWork,
  type CopyDetail,
} from '@/features/library/queries'
import { supabase } from '@/lib/supabase'
import { CopyFields, WorkFields } from './BookFormFields'
import { bookFormSchema, fromCopyDetail, toUpdateCopyInput, toUpdateWorkInput, type BookFormValues } from './book-form'

const PAGE_CLASS = 'mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8'

// Final-size placeholders for every field (G5): nothing is editable, and no submit button exists, until the
// current values are known, so stale or empty values can never be saved.
function EditSkeleton() {
  return (
    <main className={PAGE_CLASS}>
      <Card className="mx-auto w-full max-w-[640px]" aria-busy="true">
        <Skeleton className="h-7 w-1/2" aria-hidden />
        <div className="flex flex-col gap-4" aria-hidden>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
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

// UI-C overflow (G7): after a failed validation the first invalid field is brought into view.
function scrollActiveFieldIntoView() {
  requestAnimationFrame(() => {
    document.activeElement?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

// Mounted only once the current values are known, so defaultValues are the real ones from the first render.
function EditBookForm({ detail }: { detail: CopyDetail }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    mode: 'onBlur',
    shouldFocusError: true,
    defaultValues: fromCopyDetail(detail),
  })

  // LIB-08: both updates are idempotent, so a retry after a partial failure re-applies the same values and converges.
  const mutation = useMutation({
    mutationFn: async (values: BookFormValues) => {
      await updateWork(supabase, detail.work_id, toUpdateWorkInput(values))
      await updateCopy(supabase, detail.id, toUpdateCopyInput(values))
    },
    onSuccess: async () => {
      await invalidateCopyQueries(queryClient)
      void navigate(`/kitap/${detail.id}`)
    },
  })

  const onValid = (values: BookFormValues) => {
    if (mutation.isPending) return
    mutation.mutate(values)
  }

  return (
    <main className={PAGE_CLASS}>
      <Card className="mx-auto w-full max-w-[640px]">
        <h1 className="font-display text-[22px] leading-tight">{t('book.edit.title')}</h1>
        <form noValidate onSubmit={form.handleSubmit(onValid, scrollActiveFieldIntoView)} className="flex flex-col gap-6">
          <WorkFields form={form} autoFocusTitle />
          <CopyFields form={form} />

          {mutation.isError ? (
            <p role="alert" className="text-[13px] leading-[1.3] text-destructive">
              {t('common.errorGeneric')}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" loading={mutation.isPending} className="w-full sm:w-auto">
              {t('book.edit.submit')}
            </Button>
            <Button asChild variant="ghost" className="w-full sm:w-auto">
              <Link to={`/kitap/${detail.id}`}>{t('common.cancel')}</Link>
            </Button>
          </div>
        </form>
        {/* Danger zone slot: the delete-work entry is added below the form. */}
      </Card>
    </main>
  )
}

// LIB-08 / D-07: /kitap/:copyId/duzenle. The same combined fields as the add form, pre-filled.
export function EditBookPage() {
  const { t } = useTranslation()
  const { copyId = '' } = useParams()
  const [mountedAt] = useState(() => Date.now())

  // refetchOnMount 'always' + the dataUpdatedAt check below: a copy cached by the detail page is never used
  // to pre-fill the form, only data fetched after this page opened. Focus refetches are off so a background
  // refresh can never replace the form the user is typing in.
  const { data, dataUpdatedAt, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: copyKeys.detail(copyId),
    queryFn: () => fetchCopyDetail(supabase, copyId),
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  })

  if (isError) {
    return (
      <main className={PAGE_CLASS}>
        <div role="alert" className="flex flex-col items-start gap-4 py-8">
          <p className="text-base">{t('common.errorGeneric')}</p>
          <Button variant="outline" loading={isFetching} onClick={() => void refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      </main>
    )
  }

  if (isPending || dataUpdatedAt < mountedAt) return <EditSkeleton />

  // Malformed ids and copies hidden by RLS (another account's copy) both end here and reveal nothing.
  if (data === null) return <NotFoundMessage />

  return <EditBookForm key={data.id} detail={data} />
}
