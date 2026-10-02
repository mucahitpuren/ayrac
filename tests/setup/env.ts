// Test environment loader with the D-12 prod guard. Values are never logged.
// Loaded from .env.test.local (see .env.example section b) via vite.config.ts test.env.
export interface TestEnv {
  url: string
  anonKey: string
  serviceRoleKey: string
  prodRef: string
  emailDomain: string
}

const REQUIRED = [
  'TEST_SUPABASE_URL',
  'TEST_SUPABASE_ANON_KEY',
  'TEST_SUPABASE_SERVICE_ROLE_KEY',
] as const

function missing(name: string): Error {
  return new Error(`${name} must be set: fill it in .env.test.local (see .env.example section b)`)
}

export function getTestEnv(): TestEnv {
  const prodRef = process.env.SUPABASE_PROD_PROJECT_REF?.trim() ?? ''
  if (!prodRef) {
    throw new Error(
      'SUPABASE_PROD_PROJECT_REF must be set: the prod guard needs it. ' +
        'Fill it in .env.test.local (see .env.example section b)',
    )
  }

  const values: Record<string, string> = {}
  for (const name of REQUIRED) {
    const value = process.env[name]?.trim()
    if (!value) throw missing(name)
    values[name] = value
  }

  const url = values.TEST_SUPABASE_URL ?? ''
  if (url.includes(prodRef)) {
    throw new Error(
      'refusing to run integration tests against prod: TEST_SUPABASE_URL points at the prod project (D-12)',
    )
  }

  return {
    url,
    anonKey: values.TEST_SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: values.TEST_SUPABASE_SERVICE_ROLE_KEY ?? '',
    prodRef,
    emailDomain: process.env.TEST_EMAIL_DOMAIN?.trim() || 'example.com',
  }
}
