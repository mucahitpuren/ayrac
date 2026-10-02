// WR-06: the Content-Security-Policy in netlify.toml pins the inline boot script of index.html by hash. Any edit
// to that script (even whitespace) changes the hash and the browser would block it, so this test recomputes it.
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

// The HTML parser normalizes CRLF to LF before the script text is hashed, and git may check files out as CRLF.
function read(file: string): string {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
}

function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\ssrc\s*=/i.test(match[1] ?? ''))
    .map((match) => match[2] ?? '')
}

function cspHeader(): string {
  const match = /^\s*Content-Security-Policy\s*=\s*"([^"]*)"/m.exec(read('netlify.toml'))
  if (!match?.[1]) throw new Error('netlify.toml has no Content-Security-Policy header')
  return match[1]
}

function directive(csp: string, name: string): string[] {
  const entry = csp.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name} `))
  return entry ? entry.split(/\s+/).slice(1) : []
}

describe('Content-Security-Policy', () => {
  it('allows the single inline script of index.html by its current sha256', () => {
    const scripts = inlineScripts(read('index.html'))
    expect(scripts).toHaveLength(1)
    const hash = createHash('sha256').update(scripts[0] ?? '').digest('base64')
    expect(directive(cspHeader(), 'script-src')).toContain(`'sha256-${hash}'`)
  })

  it('does not allow inline or eval script', () => {
    const scriptSrc = directive(cspHeader(), 'script-src')
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'unsafe-eval'")
  })

  it('lets the app reach Supabase and nothing else', () => {
    const connectSrc = directive(cspHeader(), 'connect-src')
    expect(connectSrc).toEqual(["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'])
  })

  it('forbids plugins, framing and foreign bases', () => {
    const csp = cspHeader()
    expect(directive(csp, 'object-src')).toEqual(["'none'"])
    expect(directive(csp, 'frame-ancestors')).toEqual(["'none'"])
    expect(directive(csp, 'base-uri')).toEqual(["'self'"])
  })
})
