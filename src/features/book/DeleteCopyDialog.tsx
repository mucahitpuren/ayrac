import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deleteCopy, invalidateAfterDelete, type CopyDetail } from '@/features/library/queries'
import { supabase } from '@/lib/supabase'

type DeleteCopyDialogProps = {
  detail: CopyDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

// LIB-09: confirmation for deleting one copy. The body depends on whether other copies of the work remain.
export function DeleteCopyDialog({ detail, open, onOpenChange }: DeleteCopyDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // G2: ' · {publisher}' is dropped when the publisher is empty.
  const formatLabel = t(`format.${detail.format}`)
  const copyLabel = detail.publisher ? `${formatLabel} · ${detail.publisher}` : formatLabel
  const remaining = detail.siblings.filter((sibling) => sibling.id !== detail.id)

  const mutation = useMutation({
    mutationFn: () => deleteCopy(supabase, detail.id),
    onSuccess: async (result) => {
      await invalidateAfterDelete(queryClient)
      // The work went with its last copy, or the copy was already gone (deleted in another tab): both leave the
      // page without an error. Otherwise land on the oldest remaining sibling (siblings are sorted oldest first).
      const next = result.copyDeleted && !result.workDeleted ? remaining[0] : undefined
      void navigate(next ? `/kitap/${next.id}` : '/', { replace: true })
    },
    onError: () => {
      toast.error(t('book.delete.failed'))
    },
  })

  const pending = mutation.isPending

  return (
    // G6: the dialog cannot be dismissed (Escape, overlay, Cancel) until the request settles.
    <AlertDialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <AlertDialogContent onEscapeKeyDown={(event) => pending && event.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('book.delete.copyTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {remaining.length > 0
              ? t('book.delete.copyBodyRemaining', { copy: copyLabel, count: remaining.length })
              : t('book.delete.copyBodyLast', { copy: copyLabel })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('common.cancel')}</AlertDialogCancel>
          <Button type="button" variant="destructive" loading={pending} onClick={() => mutation.mutate()}>
            {t('book.delete.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
