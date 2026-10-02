import { Plus } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookCover } from '@/components/book-cover'
import { cn } from '@/lib/utils'
import type { CopyDetail, CopySibling } from '@/features/library/queries'

const CARD_CLASS = 'flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3'

function SiblingBody({ sibling, current }: { sibling: CopySibling; current: boolean }) {
  const { t } = useTranslation()
  const formatLabel = t(`format.${sibling.format}`)
  const meta = sibling.publisher ? `${formatLabel} · ${sibling.publisher}` : formatLabel
  return (
    <>
      <div className="mx-auto w-20">
        <BookCover size="sibling" />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-base leading-tight font-semibold [overflow-wrap:anywhere]">{meta}</p>
        {current ? <p className="text-[13px] leading-[1.3] font-semibold text-primary">{t('book.detail.current')}</p> : null}
      </div>
    </>
  )
}

// LIB-10: every owned copy of the work is its own card; the page's own copy is marked and is not a link.
export function SiblingsSection({ detail }: { detail: CopyDetail }) {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="siblings-title" className="flex flex-col gap-4">
      <h2 id="siblings-title" className="font-display text-[22px] leading-tight">
        {t('book.detail.siblingsTitle')}
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        {detail.siblings.map((sibling) => {
          const current = sibling.id === detail.id
          return (
            <li key={sibling.id} className="min-w-0">
              {current ? (
                <div
                  aria-current="true"
                  className={cn(CARD_CLASS, 'h-full border-primary ring-[3px] ring-primary-soft')}
                >
                  <SiblingBody sibling={sibling} current />
                </div>
              ) : (
                <Link
                  to={`/kitap/${sibling.id}`}
                  className={cn(
                    CARD_CLASS,
                    'h-full min-h-11 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  )}
                >
                  <SiblingBody sibling={sibling} current={false} />
                </Link>
              )}
            </li>
          )
        })}
        <li className="min-w-0">
          <Link
            to={`/eser/${detail.work_id}/nusha-ekle`}
            className={cn(
              CARD_CLASS,
              'h-full min-h-11 items-center justify-center border-dashed text-center font-semibold text-primary outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            <Plus aria-hidden size={24} />
            <span className="text-base leading-tight">{t('book.detail.addCopy')}</span>
          </Link>
        </li>
      </ul>
    </section>
  )
}
