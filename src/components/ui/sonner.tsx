import * as React from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import {
  CheckCircleIcon,
  InfoIcon,
  SpinnerIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { useTheme } from '@/lib/theme'

function Toaster(props: ToasterProps) {
  const { resolved } = useTheme()

  return (
    <Sonner
      theme={resolved}
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <WarningIcon className="size-4" />,
        error: <XCircleIcon className="size-4" />,
        loading: <SpinnerIcon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--card)',
          '--normal-text': 'var(--foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius-lg)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
