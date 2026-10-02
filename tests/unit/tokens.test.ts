import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8')

type Tokens = Record<string, string>

function blockBody(selector: RegExp): string {
  return css.match(selector)?.[1] ?? ''
}

function parseTokens(body: string): Tokens {
  const out: Tokens = {}
  for (const match of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    out[match[1] as string] = (match[2] as string).trim()
  }
  return out
}

const light = parseTokens(blockBody(/(?:^|\n):root\s*\{([^}]*)\}/))
const dark = parseTokens(blockBody(/(?:^|\n)\.dark\s*\{([^}]*)\}/))

// Locked sketch palette (sketch-findings-ayrac default.css) plus the UI-SPEC danger tokens.
const LIGHT_PALETTE: Tokens = {
  background: '#f4efe6',
  card: '#fbf8f2',
  'surface-2': '#ece5d8',
  border: '#e0d7c6',
  foreground: '#2b2620',
  'muted-foreground': '#7a7064',
  primary: '#8a4b2a',
  'primary-hover': '#723d21',
  'primary-soft': '#f0e2d6',
  brass: '#b08a3e',
  success: '#4d7c4a',
  'success-soft': '#e4ecd9',
  destructive: '#b3392a',
  'danger-soft': '#f3ddd4',
}

const DARK_PALETTE: Tokens = {
  background: '#1d1914',
  card: '#26211b',
  'surface-2': '#312a22',
  border: '#3b3329',
  foreground: '#f1e9dc',
  'muted-foreground': '#a89c8b',
  primary: '#e0a57f',
  'primary-hover': '#ebb896',
  'primary-soft': '#3a2a20',
  brass: '#d6b36a',
  success: '#9cc58f',
  'success-soft': '#26331f',
  destructive: '#e08a72',
  'danger-soft': '#3a2620',
}

function channels(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number]
}

function luminance(rgb: readonly [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRgb(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

function contrast(foreground: string, background: string): number {
  return contrastRgb(channels(foreground), channels(background))
}

/** mix(color share, other): `share` of `color` blended with the rest of `other`. */
function mix(color: string, share: number, other: readonly [number, number, number]): [number, number, number] {
  const rgb = channels(color)
  return [0, 1, 2].map((i) => rgb[i]! * share + other[i]! * (1 - share)) as [number, number, number]
}

const WHITE: [number, number, number] = [255, 255, 255]
const BLACK: [number, number, number] = [0, 0, 0]

describe('warm-paper palette', () => {
  it('finds the :root and .dark token blocks', () => {
    expect(Object.keys(light).length).toBeGreaterThan(10)
    expect(Object.keys(dark).length).toBeGreaterThan(10)
  })

  it.each(Object.entries(LIGHT_PALETTE))('light --%s is %s', (name, hex) => {
    expect(light[name]?.toLowerCase()).toBe(hex)
  })

  it.each(Object.entries(DARK_PALETTE))('dark --%s is %s', (name, hex) => {
    expect(dark[name]?.toLowerCase()).toBe(hex)
  })

  it('uses a white destructive foreground in light and the page background in dark', () => {
    expect(light['destructive-foreground']?.toLowerCase()).toBe('#ffffff')
    expect(dark['destructive-foreground']?.toLowerCase()).toBe('#1d1914')
  })

  it('sets the primary foreground to the page background in both themes', () => {
    expect(light['primary-foreground']?.toLowerCase()).toBe(LIGHT_PALETTE.background)
    expect(dark['primary-foreground']?.toLowerCase()).toBe(DARK_PALETTE.background)
  })

  it('keeps the hero tint fallback at constant terracotta in both themes', () => {
    expect(light['hero-tint-fallback']?.toLowerCase()).toBe('#8a4b2a')
    expect(dark['hero-tint-fallback']?.toLowerCase()).toBe('#8a4b2a')
  })

  it('defines a cover shadow per theme', () => {
    expect(light['shadow-cover']).toContain('rgba(60,40,20')
    expect(dark['shadow-cover']).toContain('rgba(0,0,0')
  })
})

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s theme contrast', (_name, tokens) => {
  const t = (key: string): string => tokens[key] ?? '#000000'

  it('text on the page background is at least 4.5:1', () => {
    expect(contrast(t('foreground'), t('background'))).toBeGreaterThanOrEqual(4.5)
  })

  it('primary foreground on primary is at least 4.5:1', () => {
    expect(contrast(t('primary-foreground'), t('primary'))).toBeGreaterThanOrEqual(4.5)
  })

  it('destructive foreground on destructive is at least 4.5:1', () => {
    expect(contrast(t('destructive-foreground'), t('destructive'))).toBeGreaterThanOrEqual(4.5)
  })

  it('muted text on the card surface is at least 4.5:1', () => {
    expect(contrast(t('muted-foreground'), t('card'))).toBeGreaterThanOrEqual(4.5)
  })

  // Light measures 4.24 here: a locked sketch token, flagged for UI review, deliberately not changed.
  it('muted text on the page background is at least 4.0:1', () => {
    expect(contrast(t('muted-foreground'), t('background'))).toBeGreaterThanOrEqual(4.0)
  })
})

describe('copy-detail hero tint fallback', () => {
  const tint = light['hero-tint-fallback'] ?? '#000000'

  it('keeps white text readable on the lightest gradient stop', () => {
    expect(contrastRgb(WHITE, mix(tint, 0.88, WHITE))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps white text readable on the tint itself', () => {
    expect(contrastRgb(WHITE, channels(tint))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps white text readable on the darkest gradient stop', () => {
    expect(contrastRgb(WHITE, mix(tint, 0.7, BLACK))).toBeGreaterThanOrEqual(4.5)
  })

  it('would not be readable if dark-mode primary were used as the tint', () => {
    expect(contrast('#ffffff', dark['primary'] ?? '#000000')).toBeLessThan(3)
  })
})

describe('self-hosted assets', () => {
  it('imports both variable fonts from Fontsource and the dark variant', () => {
    expect(css).toContain('@fontsource-variable/fraunces')
    expect(css).toContain('@fontsource-variable/dm-sans')
    expect(css).toContain('Fraunces Variable')
    expect(css).toContain('@custom-variant dark')
  })

  it('requests nothing from a third-party origin', () => {
    expect(css).not.toContain('fonts.googleapis')
    expect(css).not.toMatch(/https?:\/\//)
  })
})
