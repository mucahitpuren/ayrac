import { useEffect, useId, useMemo, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { matchWorks, type WorkSummary } from './work-picker'

const DEBOUNCE_MS = 150

// Props the Title input must carry for the combobox pattern. The caller merges onBlur with its own handler.
export type ComboboxInputProps = {
  role: 'combobox'
  'aria-autocomplete': 'list'
  'aria-expanded': boolean
  'aria-controls': string | undefined
  'aria-activedescendant': string | undefined
  onFocus: (event: FocusEvent<HTMLInputElement>) => void
  onBlur: (event: FocusEvent<HTMLInputElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

type WorkPickerProps = {
  /** Current text of the Title input. */
  query: string
  /** The user's own works, already loaded (no request per keystroke; RLS already scoped them). */
  works: WorkSummary[]
  onPick: (work: WorkSummary) => void
  /** Renders the Title input with the combobox props applied. */
  children: (inputProps: ComboboxInputProps) => ReactNode
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// D-08: suggestions of the user's own works under the Title field. Arrow keys move, Enter picks, Escape closes.
// Closing and the highlighted row are remembered per query text, so typing again reopens the list by itself.
export function WorkPicker({ query, works, onPick, children }: WorkPickerProps) {
  const { t } = useTranslation()
  const listboxId = useId()
  const debounced = useDebounced(query, DEBOUNCE_MS)
  const [focused, setFocused] = useState(false)
  const [closedFor, setClosedFor] = useState<string | null>(null)
  const [active, setActive] = useState<{ query: string; index: number }>({ query: '', index: -1 })

  const matches = useMemo(() => matchWorks(works, debounced), [works, debounced])
  const open = focused && matches.length > 0 && closedFor !== debounced
  const activeIndex = open && active.query === debounced ? Math.min(active.index, matches.length - 1) : -1
  const optionId = (index: number) => `${listboxId}-option-${index}`

  const pick = (work: WorkSummary) => {
    setClosedFor(debounced)
    onPick(work)
  }

  const move = (delta: number) => {
    const next =
      activeIndex === -1
        ? delta > 0
          ? 0
          : matches.length - 1
        : (activeIndex + delta + matches.length) % matches.length
    setActive({ query: debounced, index: next })
  }

  const inputProps: ComboboxInputProps = {
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': open,
    'aria-controls': open ? listboxId : undefined,
    'aria-activedescendant': activeIndex >= 0 ? optionId(activeIndex) : undefined,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onKeyDown: (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (matches.length === 0) return
        event.preventDefault()
        if (!open) {
          setClosedFor(null)
          setActive({ query: debounced, index: event.key === 'ArrowDown' ? 0 : matches.length - 1 })
          return
        }
        move(event.key === 'ArrowDown' ? 1 : -1)
      } else if (event.key === 'Enter') {
        // Only swallow Enter while a row is highlighted; otherwise it submits the form as usual.
        const work = activeIndex >= 0 ? matches[activeIndex] : undefined
        if (work) {
          event.preventDefault()
          pick(work)
        }
      } else if (event.key === 'Escape' && open) {
        event.preventDefault()
        setClosedFor(debounced)
      }
    },
  }

  return (
    <div className="relative">
      {children(inputProps)}
      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t('book.picker.listLabel')}
          className="mt-1 flex flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-cover"
        >
          {matches.map((work, index) => (
            <li
              key={work.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              // Keep focus in the input so a click does not blur (and close) the list before it registers.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(work)}
              className={cn(
                'flex min-h-11 cursor-pointer items-center px-3 py-2 text-base [overflow-wrap:anywhere]',
                index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
              )}
            >
              {t('book.picker.suggestion', {
                title: work.title,
                authors: work.authors.join(', '),
                count: work.copyCount,
              })}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
