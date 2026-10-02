export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_STORAGE_KEY = 'ayrac-lng'

function isSupported(value: string): value is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

/**
 * Initial-language rule, shared with the inline boot script in index.html (keep both in sync):
 * 1. a stored value of exactly 'tr' or 'en' wins (anything else is ignored);
 * 2. otherwise the first navigator language whose primary subtag is tr or en;
 * 3. otherwise English.
 */
export function resolveLanguage(
  stored: string | null | undefined,
  navigatorLanguages: readonly string[],
): SupportedLanguage {
  if (stored && isSupported(stored)) return stored
  for (const tag of navigatorLanguages) {
    const primary = tag.split('-')[0]?.toLowerCase() ?? ''
    if (isSupported(primary)) return primary
  }
  return 'en'
}
