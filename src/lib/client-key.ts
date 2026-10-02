// Refuses to let a secret / service-role key become the browser client key (T-01-02-01).
// Only the publishable key (`sb_publishable_...`) or the legacy `anon` JWT may ship in the bundle.

const SECRET_KEY_MESSAGE =
  'VITE_SUPABASE_ANON_KEY is a secret key: a secret key must never reach the browser. ' +
  'Use the publishable (sb_publishable_...) or anon key instead.'

function decodeJwtRole(key: string): string | null {
  const parts = key.split('.')
  if (parts.length !== 3) return null
  const payload = parts[1]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const decoded: unknown = JSON.parse(atob(padded))
    if (typeof decoded === 'object' && decoded !== null && 'role' in decoded) {
      const role = (decoded as { role: unknown }).role
      return typeof role === 'string' ? role : null
    }
    return null
  } catch {
    return null
  }
}

export function assertClientSafeKey(key: string): void {
  if (!key) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY: copy .env.example to .env.local')
  }
  if (key.startsWith('sb_secret_') || decodeJwtRole(key) === 'service_role') {
    throw new Error(SECRET_KEY_MESSAGE)
  }
}
