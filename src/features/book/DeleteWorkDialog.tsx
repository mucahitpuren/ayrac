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
import { deleteWork, invalidateAfterDelete } from '@/features/library/queries'
import { supabase } from '@/lib/supabase'

type DeleteWorkDialogProps = {
  work: { id: string; title: string }
  copyCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

// LIB-09: confirmation for deleting a whole work and every copy of it.
export function DeleteWorkDialog({ work, copyCount, open, onOpenChange }: DeleteWorkDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Deleting a work that is already gone is a silent no-op, so success always ends in the library.
  const mutation = useMutation({
    mutationFn: () => deleteWork(supabase, work.id),
    onSuccess: async () => {
      await invalidateAfterDelete(queryClient)
      void navigate('/', { replace: true })
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
          <AlertDialogTitle>{t('book.delete.workTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('book.delete.workBody', { title: work.title, count: copyCount })}
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
