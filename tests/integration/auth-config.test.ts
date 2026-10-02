import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getTestEnv } from '../setup/env'
import { anonClient, listTestUsers, sweepTestUsers, testEmail } from '../setup/clients'

const ENV_KEYS = [
  'TEST_SUPABASE_URL',
  'TEST_SUPABASE_ANON_KEY',
  'TEST_SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PROD_PROJECT_REF',
] as const

describe('getTestEnv prod guard (D-12)', () => {
  const saved: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key]
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  it('throws when SUPABASE_PROD_PROJECT_REF is empty', () => {
    process.env.SUPABASE_PROD_PROJECT_REF = ''
    expect(() => getTestEnv()).toThrow(/SUPABASE_PROD_PROJECT_REF must be set/)
  })

  it('refuses to run integration tests against prod', () => {
    process.env.SUPABASE_PROD_PROJECT_REF = 'prodrefabcdefghij1234'
    process.env.TEST_SUPABASE_URL = 'https://prodrefabcdefghij1234.supabase.co'
    expect(() => getTestEnv()).toThrow(/refusing to run integration tests against prod/)
  })

  it('names the missing variable when a required one is absent', () => {
    delete process.env.TEST_SUPABASE_ANON_KEY
    expect(() => getTestEnv()).toThrow(/TEST_SUPABASE_ANON_KEY/)
  })
})

describe('Supabase Auth configuration on the dev project (D-05, AUTH-01)', () => {
  afterAll(async () => {
    // Runs even when an assertion failed, so a failing run never leaves accounts behind.
    await sweepTestUsers()
  })

  it('returns a session immediately on sign-up with an 8-character password (email confirmation off)', async () => {
    const email = testEmail('signup')
    const { data, error } = await anonClient().auth.signUp({ email, password: 'abcd1234' })
    expect(error).toBeNull()
    expect(data.session).not.toBeNull()
    expect(data.user?.email).toBe(email)
  })

  it('rejects a 7-character password server-side and creates no user', async () => {
    const email = testEmail('weak')
    const { data, error } = await anonClient().auth.signUp({ email, password: 'abc1234' })
    expect(error).not.toBeNull()
    expect(data.session).toBeNull()
    const existing = await listTestUsers()
    expect(existing.some((user) => user.email === email)).toBe(false)
  })

  it('rejects a second sign-up with an already-registered email', async () => {
    const email = testEmail('dup')
    const first = await anonClient().auth.signUp({ email, password: 'abcd1234' })
    expect(first.error).toBeNull()
    const second = await anonClient().auth.signUp({ email, password: 'abcd1234' })
    expect(second.error).not.toBeNull()
    expect(['user_already_exists', 'email_exists']).toContain(second.error?.code)
  })

  it('sweepTestUsers leaves zero ayrac-test+ users', async () => {
    await sweepTestUsers()
    expect(await listTestUsers()).toEqual([])
  })
})
