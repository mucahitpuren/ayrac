export const THEME_STORAGE_KEY = 'ayrac-theme'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

// RED stub: wrong on purpose, replaced in the GREEN commit.
export function readThemePreference(_storage: Pick<Storage, 'getItem'>): ThemePreference {
  return 'system'
}

export function resolveTheme(_pref: ThemePreference, _systemDark: boolean): ResolvedTheme {
  return 'light'
}
