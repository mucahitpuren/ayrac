import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'

export type FormFieldControlProps = {
  id: string
  describedBy: string | undefined
  invalid: boolean
}

type FormFieldProps = {
  id: string
  label: string
  helper?: string
  /** An i18n key (zod and server messages are keys); translated here so a language switch updates it. */
  error?: string
  children: (control: FormFieldControlProps) => ReactNode
}

// Label + control + helper + error. The control is a render function so it can pick up the generated
// aria-describedby / aria-invalid wiring without every call site repeating it.
export function FormField({ id, label, helper, error, children }: FormFieldProps) {
  const { t } = useTranslation()
  const helperId = helper ? `${id}-helper` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {helper ? (
        <p id={helperId} className="text-[13px] leading-[1.3] text-muted-foreground">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] leading-[1.3] text-destructive">
          {t(error)}
        </p>
      ) : null}
    </div>
  )
}
