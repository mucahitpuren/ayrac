import { describe, expect, it } from 'vitest'
import { readThemePreference, resolveTheme, THEME_STORAGE_KEY } from '@/lib/theme'

function storageWith(value: string | null): Pick<Storage, 'getItem'> {
  return { getItem: (key: string) => (key === THEME_STORAGE_KEY ? value : null) }
}

describe('readThemePreference', () => {
  it('uses the ayrac-theme storage key', () => {
    expect(THEME_STORAGE_KEY).toBe('ayrac-theme')
  })

  it('returns dark for a stored "dark"', () => {
    expect(readThemePreference(storageWith('dark'))).toBe('dark')
  })

  it('returns light for a stored "light"', () => {
    expect(readThemePreference(storageWith('light'))).toBe('light')
  })

  it('treats an unknown stored value as no choice (system)', () => {
    expect(readThemePreference(storageWith('blue'))).toBe('system')
  })

  it('treats an empty stored value as no choice (system)', () => {
    expect(readThemePreference(storageWith(''))).toBe('system')
  })

  it('treats a missing key as no choice (system)', () => {
    expect(readThemePreference(storageWith(null))).toBe('system')
  })

  it('falls back to system when storage access throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('storage blocked')
      },
    }
    expect(readThemePreference(throwing)).toBe('system')
  })
})

describe('resolveTheme', () => {
  it('follows a dark OS when the preference is system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
  })

  it('follows a light OS when the preference is system', () => {
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('lets a stored light beat a dark OS', () => {
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('lets a stored dark beat a light OS', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
