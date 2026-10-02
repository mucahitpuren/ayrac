import { useEffect, useRef, useState } from 'react'
import { Check } from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { copyKeys, updateCopyNote, type CopyDetail } from '@/features/library/queries'
import { supabase } from '@/lib/supabase'
import { createNoteAutosave, type NoteAutosave, type NoteSaveState } from './note-autosave'

// READ-04: the personal note of one copy. Text is rendered by React only (a textarea value, never raw HTML).
export function NoteCard({ copyId, initialNote }: { copyId: string; initialNote: string | null }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [value, setValue] = useState(initialNote ?? '')
  const [state, setState] = useState<NoteSaveState>('idle')
  const autosave = useRef<NoteAutosave | null>(null)

  // One controller per copy. Leaving the page (or switching copy) flushes the last edit before disposing.
  useEffect(() => {
    const controller = createNoteAutosave({
      save: async (text) => {
        await updateCopyNote(supabase, copyId, text)
        // Keep the cache in step without a refetch, which would fight the textarea.
        queryClient.setQueryData<CopyDetail | null>(copyKeys.detail(copyId), (old) =>
          old ? { ...old, note: text } : old,
        )
      },
      onState: (next) => {
        setState(next)
        // The textarea is never reset, so a failed save only warns; the next edit retries with the latest text.
        if (next === 'error') toast.error(i18n.t('book.note.saveFailed'))
      },
      // The unmount flush failed after the component state is gone: the toast is the only sign left.
      onFinalError: () => toast.error(i18n.t('book.note.saveFailed')),
    })
    autosave.current = controller
    return () => {
      controller.flush()
      controller.dispose()
      autosave.current = null
    }
  }, [copyId, queryClient, i18n])

  return (
    <Card>
      <h2 className="font-display text-[22px] leading-tight">{t('book.note.title')}</h2>
      <Textarea
        aria-label={t('book.note.label')}
        maxLength={10000}
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          autosave.current?.change(event.target.value)
        }}
        onBlur={() => autosave.current?.flush()}
      />
      <p aria-live="polite" className="flex min-h-[1.3em] items-center gap-1 text-[13px] leading-[1.3]">
        {state === 'dirty' || state === 'error' ? (
          <span className="text-muted-foreground">{t('book.note.unsaved')}</span>
        ) : state === 'saving' ? (
          <span className="text-muted-foreground">{t('book.note.saving')}</span>
        ) : state === 'saved' ? (
          <span className="flex items-center gap-1 text-success">
            <Check aria-hidden size={14} weight="bold" />
            {t('book.note.saved')}
          </span>
        ) : null}
      </p>
    </Card>
  )
}
