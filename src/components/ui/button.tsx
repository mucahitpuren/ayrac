import * as React from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent text-base font-semibold whitespace-nowrap outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        ghost: 'text-foreground hover:bg-muted',
        outline: 'border-border bg-transparent text-foreground hover:bg-muted',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4',
        // Dense desktop spots only; phone touch targets stay at 44px.
        sm: 'h-9 px-3',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner, sets aria-busy and disables the control. Ignored with asChild. */
    loading?: boolean
  }

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }))

  if (asChild) {
    return (
      <Slot.Root data-slot="button" data-variant={variant} data-size={size} className={classes} {...props}>
        {children}
      </Slot.Root>
    )
  }

  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={classes}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <CircleNotch aria-hidden className="size-5 animate-spin" /> : null}
      {children}
    </button>
  )
}

export { Button, buttonVariants }
