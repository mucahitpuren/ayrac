import { useId, useMemo } from 'react'
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormField } from '@/components/form-field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FORMAT_SLUGS, GENRE_SLUGS } from '@/lib/vocab'
import type { BookFormValues } from './book-form'

type FormProps = { form: UseFormReturn<BookFormValues> }

function SectionHeading({ children }: { children: string }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>
}

export type WorkContextData = {
  title: string
  authors: string[]
  genre: string | null
  series: string | null
  series_position: number | null
}

// Read-only view of a work: the add-copy header and the picked-work summary on the add form. Text only,
// rendered by React (never as HTML).
export function WorkContext({ work, as: Heading = 'h1' }: { work: WorkContextData; as?: 'h1' | 'h2' }) {
  const { t } = useTranslation()
  const details = [
    work.genre ? t(`genre.${work.genre}`) : null,
    work.series
      ? work.series_position !== null
        ? t('book.detail.series', { series: work.series, position: work.series_position })
        : work.series
      : null,
  ].filter((item): item is string => item !== null)
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Heading className="font-display text-[22px] leading-tight [overflow-wrap:anywhere]">{work.title}</Heading>
      <p className="text-base text-muted-foreground [overflow-wrap:anywhere]">{work.authors.join(', ')}</p>
      {details.length > 0 ? (
        <p className="text-[13px] leading-[1.3] text-muted-foreground">{details.join(' · ')}</p>
      ) : null}
    </div>
  )
}

export function WorkFields({ form, autoFocusTitle = false }: FormProps & { autoFocusTitle?: boolean }) {
  const { t, i18n } = useTranslation()
  const ids = { title: useId(), authors: useId(), genre: useId(), series: useId(), position: useId() }
  const {
    register,
    control,
    formState: { errors },
  } = form
  const series = useWatch({ control, name: 'series' })

  // D-03: sorted by the label in the active language, 'other' always last.
  const genreOptions = useMemo(() => {
    const labelled = GENRE_SLUGS.filter((slug) => slug !== 'other').map((slug) => ({
      slug,
      label: t(`genre.${slug}`),
    }))
    labelled.sort((a, b) => a.label.localeCompare(b.label, i18n.language))
    return [...labelled, { slug: 'other' as const, label: t('genre.other') }]
  }, [t, i18n.language])

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading>{t('book.form.workSection')}</SectionHeading>

      <FormField id={ids.title} label={t('book.form.title')} error={errors.title?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            autoFocus={autoFocusTitle}
            autoComplete="off"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            {...register('title')}
          />
        )}
      </FormField>

      <FormField
        id={ids.authors}
        label={t('book.form.authors')}
        helper={t('book.form.authorsHelper')}
        error={errors.authorsRaw?.message}
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            autoComplete="off"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            {...register('authorsRaw')}
          />
        )}
      </FormField>

      <FormField id={ids.genre} label={t('book.form.genre')} error={errors.genre?.message}>
        {({ id, describedBy, invalid }) => (
          <Controller
            control={control}
            name="genre"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger
                  id={id}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                >
                  <SelectValue placeholder={t('book.form.genrePrompt')} />
                </SelectTrigger>
                <SelectContent>
                  {genreOptions.map((option) => (
                    <SelectItem key={option.slug} value={option.slug}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>

      <FormField id={ids.series} label={t('book.form.series')} error={errors.series?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            autoComplete="off"
            placeholder={t('book.form.seriesExample')}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            {...register('series')}
          />
        )}
      </FormField>

      {(series ?? '').trim() !== '' ? (
        <FormField id={ids.position} label={t('book.form.seriesPosition')} error={errors.seriesPosition?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              placeholder={t('book.form.seriesPositionExample')}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              {...register('seriesPosition')}
            />
          )}
        </FormField>
      ) : null}
    </section>
  )
}

export function CopyFields({ form, autoFocusFormat = false }: FormProps & { autoFocusFormat?: boolean }) {
  const { t } = useTranslation()
  const ids = { format: useId(), publisher: useId(), editionTitle: useId(), note: useId() }
  const {
    register,
    control,
    formState: { errors },
  } = form

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading>{t('book.form.copySection')}</SectionHeading>

      <FormField id={ids.format} label={t('book.form.format')} error={errors.format?.message}>
        {({ id, describedBy, invalid }) => (
          <Controller
            control={control}
            name="format"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger
                  id={id}
                  ref={field.ref}
                  autoFocus={autoFocusFormat}
                  onBlur={field.onBlur}
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                >
                  <SelectValue placeholder={t('book.form.formatPrompt')} />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_SLUGS.map((slug) => (
                    <SelectItem key={slug} value={slug}>
                      {t(`format.${slug}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>

      <FormField id={ids.publisher} label={t('book.form.publisher')} error={errors.publisher?.message}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            autoComplete="off"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            {...register('publisher')}
          />
        )}
      </FormField>

      <FormField
        id={ids.editionTitle}
        label={t('book.form.editionTitle')}
        helper={t('book.form.editionTitleHelper')}
        error={errors.editionTitle?.message}
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            autoComplete="off"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            {...register('editionTitle')}
          />
        )}
      </FormField>

      <FormField id={ids.note} label={t('book.form.note')} error={errors.note?.message}>
        {({ id, describedBy, invalid }) => (
          <Textarea id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy} {...register('note')} />
        )}
      </FormField>
    </section>
  )
}
