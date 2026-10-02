// Integration-test clients. Dev project ONLY (D-12). This directory is outside src/ and is never bundled,
// so the service key may be used here and nowhere else (T-01-02-01).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types'
import { getTestEnv } from './env'

export const TEST_EMAIL_PREFIX = 'ayrac-test+'

const PAUSED_HINT =
  'Network request to the dev Supabase project failed. The free-tier dev project may be paused: ' +
  'resume it in the Supabase dashboard and retry.'

const authOptions = { persistSession: false, autoRefreshToken: false } as const

// Wraps fetch so a connection failure reads as "project may be paused" instead of a bare TypeError.
const hintedFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch (cause) {
    throw new Error(PAUSED_HINT, { cause })
  }
}

type TestClient = SupabaseClient<Database>

function build(key: string): TestClient {
  const { url } = getTestEnv()
  return createClient<Database>(url, key, { auth: authOptions, global: { fetch: hintedFetch } })
}

export function adminClient(): TestClient {
  return build(getTestEnv().serviceRoleKey)
}

export function anonClient(): TestClient {
  return build(getTestEnv().anonKey)
}

function randomSuffix(length: number): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length)
    .padEnd(length, '0')
}

export function testEmail(prefix: string): string {
  const { emailDomain } = getTestEnv()
  return `${TEST_EMAIL_PREFIX}${prefix}-${Date.now()}-${randomSuffix(6)}@${emailDomain}`
}

export interface TestUser {
  client: TestClient
  userId: string
  email: string
  password: string
}

export async function createTestUser(prefix: string): Promise<TestUser> {
  const email = testEmail(prefix)
  const password = randomSuffix(8) + randomSuffix(8)
  const admin = adminClient()
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error || !created.data.user) {
    throw new Error(`createTestUser failed: ${created.error?.message ?? 'no user returned'}`)
  }
  const client = anonClient()
  const signedIn = await client.auth.signInWithPassword({ email, password })
  if (signedIn.error) {
    throw new Error(`createTestUser sign-in failed: ${signedIn.error.message}`)
  }
  return { client, userId: created.data.user.id, email, password }
}

export async function deleteTestUser(userId: string): Promise<void> {
  const { error } = await adminClient().auth.admin.deleteUser(userId)
  if (error) throw new Error(`deleteTestUser failed: ${error.message}`)
}

const PAGE_SIZE = 1000

export async function listTestUsers(): Promise<{ id: string; email: string }[]> {
  const admin = adminClient()
  const found: { id: string; email: string }[] = []
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    for (const user of data.users) {
      if (user.email?.startsWith(TEST_EMAIL_PREFIX)) found.push({ id: user.id, email: user.email })
    }
    if (data.users.length < PAGE_SIZE) break
  }
  return found
}

// Removes every leftover ayrac-test+ account (e.g. from a failed run). Collects first, deletes after,
// so deleting never shifts the pages being read.
export async function sweepTestUsers(): Promise<number> {
  const leftovers = await listTestUsers()
  for (const user of leftovers) {
    await deleteTestUser(user.id)
  }
  return leftovers.length
}
