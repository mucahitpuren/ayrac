import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createWorkWithCopy, libraryKeys } from '@/features/library/queries'
import { supabase } from '@/lib/supabase'
import { CopyFields, WorkFields } from './BookFormFields'
import { bookFormSchema, toCreateWorkWithCopyInput, type BookFormValues } from './book-form'

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

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
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
  const mutation = useMutation({
    mutationFn: (values: BookFormValues) => createWorkWithCopy(supabase, toCreateWorkWithCopyInput(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: libraryKeys.all })
      void navigate('/')
    },
  })

  const onValid = (values: BookFormValues) => {
    if (mutation.isPending) return
    mutation.mutate(values)
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
          <WorkFields form={form} autoFocusTitle />
          <CopyFields form={form} />

          {mutation.isError ? (
            <p role="alert" className="text-[13px] leading-[1.3] text-destructive">
              {t('common.errorGeneric')}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" loading={mutation.isPending} className="w-full sm:w-auto">
              {t('book.add.submit')}
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
