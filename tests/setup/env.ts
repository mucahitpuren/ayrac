// RED stub: reads the variables without any prod guard. Replaced in the GREEN commit.
export interface TestEnv {
  url: string
  anonKey: string
  serviceRoleKey: string
  prodRef: string
  emailDomain: string
}

export function getTestEnv(): TestEnv {
  return {
    url: process.env.TEST_SUPABASE_URL ?? '',
    anonKey: process.env.TEST_SUPABASE_ANON_KEY ?? '',
    serviceRoleKey: process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? '',
    prodRef: process.env.SUPABASE_PROD_PROJECT_REF ?? '',
    emailDomain: process.env.TEST_EMAIL_DOMAIN ?? 'example.com',
  }
}
