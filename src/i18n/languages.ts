export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_STORAGE_KEY = 'ayrac-lng'

// RED-phase stub: real resolution rule lands in the GREEN commit.
export function resolveLanguage(
  _stored: string | null | undefined,
  _navigatorLanguages: readonly string[],
): SupportedLanguage {
  return 'en'
}
