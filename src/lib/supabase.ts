import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assertClientSafeKey } from '@/lib/client-key'
import type { Database } from '@/lib/database.types'

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string
    readonly VITE_SUPABASE_ANON_KEY?: string
  }
}

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url) {
  throw new Error('Missing VITE_SUPABASE_URL — copy .env.example to .env.local')
}
if (!anonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY — copy .env.example to .env.local')
}

assertClientSafeKey(anonKey)

// AUTH-05: supabase-js keeps the session in localStorage across restarts; no hand-rolled storage.
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

export type AppSupabaseClient = SupabaseClient<Database>
