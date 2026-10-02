import { useSyncExternalStore } from 'react'

export const THEME_STORAGE_KEY = 'ayrac-theme'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export type ThemeState = {
  preference: ThemePreference
  resolved: ResolvedTheme
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Stored-theme rule, shared with the inline boot script in index.html (keep both in sync):
 * a stored value of exactly 'light' or 'dark' is a choice; anything else (missing, empty,
 * unknown, storage unavailable) means no choice, i.e. follow the OS ('system').
 */
export function readThemePreference(storage: Pick<Storage, 'getItem'>): ThemePreference {
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage can be blocked (privacy mode); fall through to "no choice".
  }
  return 'system'
}

/** Binary per render: the page is dark if and only if this returns 'dark'. */
export function resolveTheme(pref: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (pref === 'system') return systemDark ? 'dark' : 'light'
  return pref
}

export function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(DARK_QUERY).matches
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  try {
    return readThemePreference(window.localStorage)
  } catch {
    return 'system'
  }
}

function computeState(preference: ThemePreference): ThemeState {
  return { preference, resolved: resolveTheme(preference, systemPrefersDark()) }
}

const listeners = new Set<() => void>()
let state: ThemeState = computeState(readStoredPreference())

function commit(next: ThemeState): void {
  const changed = next.preference !== state.preference || next.resolved !== state.resolved
  applyTheme(next.resolved)
  if (!changed) return
  // A new object only when something changed keeps getSnapshot referentially stable.
  state = next
  listeners.forEach((listener) => listener())
}

export function setThemePreference(pref: ThemePreference): void {
  if (typeof window !== 'undefined') {
    try {
      if (pref === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY)
      else window.localStorage.setItem(THEME_STORAGE_KEY, pref)
    } catch {
      // The choice still applies for this session when storage is unavailable.
    }
  }
  commit(computeState(pref))
}

export function subscribeTheme(callback: () => void): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

function getSnapshot(): ThemeState {
  return state
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  // A live OS change only matters while there is no stored choice.
  window.matchMedia(DARK_QUERY).addEventListener('change', () => {
    if (state.preference === 'system') commit(computeState('system'))
  })
}

export function useTheme(): ThemeState & { setPreference: (pref: ThemePreference) => void } {
  const current = useSyncExternalStore(subscribeTheme, getSnapshot, getSnapshot)
  return { ...current, setPreference: setThemePreference }
}
