import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session, User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import i18n from '@/i18n'

type AuthState =
  | { status: 'loading'; session: null; user: null }
  | { status: 'signedOut'; session: null; user: null }
  | { status: 'signedIn'; session: Session; user: User }

type AuthContextValue = AuthState & {
  /** Ends the Supabase session and empties the query cache. Routing to /login follows from the signedOut state. */
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const LOADING: AuthState = { status: 'loading', session: null, user: null }

function stateFor(session: Session | null): AuthState {
  return session
    ? { status: 'signedIn', session, user: session.user }
    : { status: 'signedOut', session: null, user: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<AuthState>(LOADING)
  const lastUserId = useRef<string | null>(null)
  // True only while signOut() runs, so a SIGNED_OUT the user asked for is not reported as an expired session.
  const explicitSignOut = useRef(false)

  useEffect(() => {
    let active = true

    // Cached rows belong to whoever was signed in. Drop them when the account changes or ends, so a second
    // user on the same browser tab can never see the first user's library out of the query cache.
    const apply = (session: Session | null) => {
      const userId = session?.user.id ?? null
      if (lastUserId.current !== null && lastUserId.current !== userId) queryClient.clear()
      lastUserId.current = userId
      setState(stateFor(session))
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (active) apply(data.session)
    })

    // Keep this callback synchronous: awaiting another supabase call inside it can deadlock the auth lock.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'SIGNED_OUT') {
        queryClient.clear()
        // No explicit logout means the session ended on its own (e.g. the refresh token was rejected).
        if (!explicitSignOut.current) toast(i18n.t('auth.sessionExpired'))
        explicitSignOut.current = false
      }
      apply(session)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [queryClient])

  const signOut = useCallback(async () => {
    explicitSignOut.current = true
    try {
      await supabase.auth.signOut()
    } finally {
      explicitSignOut.current = false
      queryClient.clear()
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(() => ({ ...state, signOut }), [state, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// The hook lives next to its provider on purpose; fast refresh only costs a full reload for this one file.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
