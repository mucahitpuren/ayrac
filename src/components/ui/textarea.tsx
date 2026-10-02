import * as React from 'react'
import { cn } from '@/lib/utils'

// Four rows minimum, grows with its content up to ~240px, then scrolls inside (field-sizing-content
// sizes it to the text; max-h caps it).
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      rows={4}
      className={cn(
        'block field-sizing-content min-h-[7.5rem] max-h-60 w-full min-w-0 resize-none overflow-y-auto rounded-md border border-input bg-surface-2 px-3 py-2 text-base text-foreground outline-none [overflow-wrap:anywhere] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
