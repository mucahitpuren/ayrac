import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveLanguage } from '@/i18n/languages'

type Json = { [key: string]: string | Json }

function flatten(obj: Json, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') out[path] = value
    else Object.assign(out, flatten(value, path))
  }
  return out
}

function loadCatalog(lng: 'tr' | 'en'): Record<string, string> {
  const url = new URL(`../../src/i18n/locales/${lng}.json`, import.meta.url)
  return flatten(JSON.parse(readFileSync(url, 'utf8')) as Json)
}

describe('resolveLanguage', () => {
  it('a stored "tr" wins over an English browser', () => {
    expect(resolveLanguage('tr', ['en-US'])).toBe('tr')
  })

  it('a stored "en" wins over a Turkish browser', () => {
    expect(resolveLanguage('en', ['tr-TR'])).toBe('en')
  })

  it('without a stored choice, the first supported browser language wins (tr-TR before en)', () => {
    expect(resolveLanguage(null, ['tr-TR', 'en'])).toBe('tr')
  })

  it('skips unsupported browser languages until it finds a supported one', () => {
    expect(resolveLanguage(null, ['de-DE', 'tr'])).toBe('tr')
  })

  it('falls back to English when no browser language is supported', () => {
    expect(resolveLanguage(null, ['de-DE', 'fr'])).toBe('en')
  })

  it('ignores an unsupported stored value and uses the browser language', () => {
    expect(resolveLanguage('de', ['tr'])).toBe('tr')
  })

  it('falls back to English for an empty stored value and no browser languages', () => {
    expect(resolveLanguage('', [])).toBe('en')
  })
})

describe('locale catalogs', () => {
  it('tr.json and en.json have exactly the same key set', () => {
    expect(Object.keys(loadCatalog('tr')).sort()).toEqual(Object.keys(loadCatalog('en')).sort())
  })

  it('no catalog value is an empty string', () => {
    for (const lng of ['tr', 'en'] as const) {
      const empty = Object.entries(loadCatalog(lng)).filter(([, v]) => v.trim() === '')
      expect(empty, `${lng}.json has empty values`).toEqual([])
    }
  })
})
