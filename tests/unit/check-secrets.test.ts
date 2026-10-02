// T-01-07-01/02/03: the secrets scanner must fail on planted secret keys and stay quiet on client-safe keys.
// Fake tokens are assembled at runtime so this file never contains a secret-shaped literal itself
// (otherwise the --git-history scan would flag the test that proves the scanner works).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = 'scripts/check-secrets.mjs'
const tempDirs: string[] = []

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function jwtWithRole(role: string): string {
  return [encode({ alg: 'HS256', typ: 'JWT' }), encode({ iss: 'supabase', role }), 'c2lnbmF0dXJl'].join('.')
}

function secretKey(): string {
  return ['sb', 'secret', 'Zk3pQ9xL2mV7tR4wY8nB5cD'].join('_')
}

function makeDir(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ayrac-secrets-'))
  tempDirs.push(dir)
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content)
  }
  return dir
}

function scan(dir: string) {
  const result = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    if (dir) fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('check-secrets (directory mode)', () => {
  it('exits 1 and names the file when an sb_secret_ token is present', () => {
    const dir = makeDir({ 'app.js': `const key = "${secretKey()}"` })
    const { status, output } = scan(dir)
    expect(status).toBe(1)
    expect(output).toContain('app.js')
  })

  it('exits 1 when a JWT carries the service_role role', () => {
    const dir = makeDir({ 'bundle.js': `fetch(url, { headers: { apikey: "${jwtWithRole('service_role')}" } })` })
    const { status, output } = scan(dir)
    expect(status).toBe(1)
    expect(output).toContain('bundle.js')
  })

  it('exits 0 for a publishable key and an anon-role JWT only', () => {
    const publishable = ['sb', 'publishable', 'Qw3rTy9uIoPaSdFgHjKlZx'].join('_')
    const dir = makeDir({
      'index.js': `const a = "${publishable}"; const b = "${jwtWithRole('anon')}"`,
      'index.html': '<div id="root"></div>',
    })
    const { status, output } = scan(dir)
    expect(status).toBe(0)
    expect(output).toMatch(/no secrets found in 2 files/)
  })

  it('never prints the matched value', () => {
    const token = secretKey()
    const jwt = jwtWithRole('service_role')
    const dir = makeDir({ 'a.js': `x("${token}")`, 'b.json': JSON.stringify({ key: jwt }) })
    const { status, output } = scan(dir)
    expect(status).toBe(1)
    expect(output).not.toContain(token)
    expect(output).not.toContain(jwt)
    expect(output).not.toContain(jwt.split('.')[1] as string)
  })
})
