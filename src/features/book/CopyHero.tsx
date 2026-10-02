import type { CSSProperties } from 'react'
import { Books, CaretRight } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookCover } from '@/components/book-cover'
import type { CopyDetail } from '@/features/library/queries'

// Phase 1 has no cover image, so the tint is the constant fallback. The gradient darkens toward the bottom so
// white text keeps its contrast in both themes (it must never fade to the page background).
const HERO_STYLE = {
  '--tint': 'var(--hero-tint-fallback)',
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--tint) 88%, white) 0%, var(--tint) 45%, color-mix(in srgb, var(--tint) 70%, black) 100%)',
} as CSSProperties

const PILL_CLASS = 'rounded-full bg-white/20 px-3 py-1.5 text-[13px] leading-none font-semibold text-white backdrop-blur-[6px]'

export function CopyHero({ detail }: { detail: CopyDetail }) {
  const { t } = useTranslation()
  const { work } = detail
  const copyCount = detail.siblings.length
  const hasEditionTitle = Boolean(detail.edition_title)
  const seriesLine = work.series
    ? work.series_position === null
      ? work.series
      : t('book.detail.series', { series: work.series, position: work.series_position })
    : null

  return (
    <section data-slot="copy-hero" style={HERO_STYLE} className="pt-8 pb-7 text-white">
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <nav
          aria-label={t('library.title')}
          className="mb-6 flex min-w-0 flex-wrap items-center gap-x-2 text-[13px] leading-[1.3] text-white/80 [text-shadow:0_1px_12px_rgba(0,0,0,0.25)]"
        >
          <Link
            to="/"
            className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {t('library.title')}
          </Link>
          <CaretRight aria-hidden size={12} />
          <span aria-current="page" className="min-w-0 [overflow-wrap:anywhere]">
            {work.title}
          </span>
        </nav>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-10">
          <div className="w-[170px] shrink-0 sm:w-[260px]">
            <BookCover size="hero" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 [text-shadow:0_1px_12px_rgba(0,0,0,0.25)]">
            <p className="flex items-center gap-2 text-[11px] leading-none font-semibold tracking-[0.08em] uppercase">
              <Books aria-hidden size={16} />
              {copyCount > 1 ? t('book.detail.kickerMany', { count: copyCount }) : t('book.detail.kickerSingle')}
            </p>
            <h1 className="font-display text-[44px] leading-[1.1] [overflow-wrap:anywhere]">
              {detail.edition_title ?? work.title}
            </h1>
            {seriesLine ? <p className="text-base leading-[1.3] text-white/90 [overflow-wrap:anywhere]">{seriesLine}</p> : null}
            <p className="text-base leading-[1.3] [overflow-wrap:anywhere]">
              {hasEditionTitle ? <span className="text-white/70">{work.title} · </span> : null}
              {work.authors.join(', ')}
            </p>
            <ul className="mt-1 flex flex-wrap gap-2 [text-shadow:none]">
              <li className={PILL_CLASS}>{t(`format.${detail.format}`)}</li>
              {detail.publisher ? <li className={PILL_CLASS}>{detail.publisher}</li> : null}
              {work.genre ? <li className={PILL_CLASS}>{t(`genre.${work.genre}`)}</li> : null}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
