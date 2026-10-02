import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import './i18n'

function Boot() {
  const { t } = useTranslation()
  return <h1>{t('common.appName')}</h1>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
)
