import { describe, expect, it } from 'vitest'
import { assertClientSafeKey } from '@/lib/client-key'

function jwtWithRole(role: string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role })}.signature`
}

describe('assertClientSafeKey', () => {
  it('accepts a publishable key', () => {
    expect(() => assertClientSafeKey('sb_publishable_abc')).not.toThrow()
  })

  it('accepts a legacy anon JWT', () => {
    expect(() => assertClientSafeKey(jwtWithRole('anon'))).not.toThrow()
  })

  it('rejects an sb_secret_ key as a secret that must never reach the browser', () => {
    expect(() => assertClientSafeKey('sb_secret_abc')).toThrow(/secret key must never reach the browser/i)
  })

  it('rejects a legacy service_role JWT the same way', () => {
    expect(() => assertClientSafeKey(jwtWithRole('service_role'))).toThrow(
      /secret key must never reach the browser/i,
    )
  })

  it('rejects an empty key and names VITE_SUPABASE_ANON_KEY', () => {
    expect(() => assertClientSafeKey('')).toThrow(/VITE_SUPABASE_ANON_KEY/)
  })
})
