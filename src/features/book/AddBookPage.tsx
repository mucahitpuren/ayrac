import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  addCopyToWork,
  createWorkWithCopy,
  fetchLibrary,
  invalidateCopyQueries,
  libraryKeys,
} from '@/features/library/queries'
import { supabase } from '@/lib/supabase'
import { CopyFields, WorkContext, WorkFields } from './BookFormFields'
import {
  bookFormSchema,
  copyOnlyResolver,
  toAddCopyInput,
  toCreateWorkWithCopyInput,
  type BookFormValues,
} from './book-form'
import { summarizeWorks, type WorkSummary } from './work-picker'

// UI-C overflow (G7): after a failed validation the first invalid field is brought into view. RHF has
// already focused it (shouldFocusError); this makes sure it is not left under the sticky top bar.
function scrollActiveFieldIntoView() {
  requestAnimationFrame(() => {
    document.activeElement?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

export function AddBookPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // D-08: the work picked under the Title field. While set, the form is a copy-only form for that work.
  const [pickedWork, setPickedWork] = useState<WorkSummary | null>(null)

  // The picker reads the already cached library (RLS-scoped to this user): no request per keystroke.
  const library = useQuery({ queryKey: libraryKeys.all, queryFn: () => fetchLibrary(supabase) })
  const works = useMemo(() => summarizeWorks(library.data ?? []), [library.data])

  const form = useForm<BookFormValues>({
    // react-hook-form re-reads the options on every render, so the schema follows pickedWork: copyFieldsSchema
    // only (copyOnlyResolver) while a work is picked, the full bookFormSchema otherwise.
    resolver: pickedWork ? copyOnlyResolver : zodResolver(bookFormSchema),
    mode: 'onBlur',
    shouldFocusError: true,
    defaultValues: {
      title: '',
      authorsRaw: '',
      series: '',
      seriesPosition: '',
      publisher: '',
      editionTitle: '',
      note: '',
    },
  })

  // ADD-02: one RPC call creates the work and its first copy in a single transaction.
  const createMutation = useMutation({
    mutationFn: (values: BookFormValues) => createWorkWithCopy(supabase, toCreateWorkWithCopyInput(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: libraryKeys.all })
      void navigate('/')
    },
  })

  // LIB-02 / D-08: with a picked work only a copy is created, under that work's id.
  const addCopyMutation = useMutation({
    mutationFn: ({ work, values }: { work: WorkSummary; values: BookFormValues }) =>
      addCopyToWork(supabase, toAddCopyInput(work.id, values)),
    onSuccess: async (newCopyId) => {
      await invalidateCopyQueries(queryClient)
      void navigate(`/kitap/${newCopyId}`)
    },
  })

  const isPending = createMutation.isPending || addCopyMutation.isPending
  const isError = createMutation.isError || addCopyMutation.isError

  const onValid = (values: BookFormValues) => {
    if (isPending) return
    if (pickedWork) addCopyMutation.mutate({ work: pickedWork, values })
    else createMutation.mutate(values)
  }

  const pickWork = (work: WorkSummary) => {
    setPickedWork(work)
    form.clearErrors()
    requestAnimationFrame(() => form.setFocus('format'))
  }

  // The typed Title text stays in the form, so clearing restores the editable work fields as they were.
  const clearPickedWork = () => {
    setPickedWork(null)
    form.clearErrors()
    requestAnimationFrame(() => form.setFocus('title'))
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8">
      <Card className="mx-auto w-full max-w-[640px]">
        <h1 className="font-display text-[22px] leading-tight">{t('book.add.title')}</h1>
        <form
          noValidate
          onSubmit={form.handleSubmit(onValid, scrollActiveFieldIntoView)}
          className="flex flex-col gap-6"
        >
          {pickedWork ? (
            <section className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface-2 p-4">
              <WorkContext work={pickedWork} as="h2" />
              <Button type="button" variant="ghost" onClick={clearPickedWork}>
                {t('book.picker.clear')}
              </Button>
            </section>
          ) : (
            <WorkFields form={form} autoFocusTitle picker={{ works, onPick: pickWork }} />
          )}
          <CopyFields form={form} />

          {isError ? (
            <p role="alert" className="text-[13px] leading-[1.3] text-destructive">
              {t('common.errorGeneric')}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" loading={isPending} className="w-full sm:w-auto">
              {pickedWork ? t('book.addCopy.submit') : t('book.add.submit')}
            </Button>
            <Button asChild variant="ghost" className="w-full sm:w-auto">
              <Link to="/">{t('common.cancel')}</Link>
            </Button>
          </div>
        </form>
      </Card>
    </main>
  )
}
