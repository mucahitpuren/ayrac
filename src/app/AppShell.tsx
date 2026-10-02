import { Link, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageMenu } from '@/components/language-menu'
import { ThemeMenu } from '@/components/theme-menu'

// Phase 1 top bar: brand and controls only. No search box and no nav links yet (Phase 2/5/6 add them).
export function AppShell() {
  const { t } = useTranslation()

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-[12px]">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-2 px-5 py-[14px] sm:px-8">
          <Link
            to="/"
            aria-label={t('shell.brandHome')}
            className="font-display text-[26px] leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('common.appName')}
          </Link>
          <div className="flex items-center gap-1">
            <LanguageMenu />
            <ThemeMenu />
          </div>
        </div>
      </header>
      <Outlet />
    </>
  )
}
