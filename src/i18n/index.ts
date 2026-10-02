import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES, type SupportedLanguage } from './languages'
import en from './locales/en.json'
import tr from './locales/tr.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { tr: { translation: tr }, en: { translation: en } },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      // Passive detection must NOT persist: only an explicit pick (setLanguage) is remembered.
      caches: [],
    },
  })

function syncHtmlLang(lng: string | undefined) {
  if (lng) document.documentElement.lang = lng.split('-')[0] ?? lng
}

i18n.on('languageChanged', syncHtmlLang)
syncHtmlLang(i18n.resolvedLanguage ?? i18n.language)

export function setLanguage(lng: SupportedLanguage): Promise<unknown> {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng)
  } catch {
    // Storage can be unavailable (private mode); the switch still applies for this session.
  }
  return i18n.changeLanguage(lng)
}

export default i18n
