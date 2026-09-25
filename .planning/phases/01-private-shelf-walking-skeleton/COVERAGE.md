# API Coverage — Supabase (supabase-js 2.117.2 + Supabase CLI 2.118.0)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Phase 1 integrates Supabase as its only backend (Auth + Postgres via PostgREST). No other external API
> is called in this phase (book APIs and Netlify Functions arrive in Phase 4).

| capability | decision | reason |
|---|---|---|
| auth.signUp (email + password) | INTEGRATE | |
| auth.signInWithPassword | INTEGRATE | |
| auth.signOut | INTEGRATE | |
| auth.getSession / onAuthStateChange / session persistence + auto refresh | INTEGRATE | |
| auth.resetPasswordForEmail / updateUser(password) | OPT-OUT | explicitly out of scope — AUTH-03 is Phase 7 (needs custom-domain redirects + SMTP) |
| auth.signInWithOAuth (Google) | OPT-OUT | explicitly out of scope — AUTH-04 is Phase 7 |
| auth email confirmation / resend | OPT-OUT | not needed yet — confirmation is OFF by D-05, turned on in Phase 7 with custom SMTP |
| auth.admin.createUser / deleteUser / listUsers | INTEGRATE | test harness only (service key, dev project, never bundled) |
| auth.admin.deleteUser for end-user account deletion | OPT-OUT | explicitly out of scope — AUTH-06 is Phase 7 |
| PostgREST select (works, copies, embedded relations) | INTEGRATE | |
| PostgREST insert / update / delete | INTEGRATE | |
| rpc (create_work_with_copy, delete_copy) | INTEGRATE | |
| realtime subscriptions | OPT-OUT | not needed — single-user private library, TanStack Query refetch covers freshness |
| storage buckets (covers) | OPT-OUT | not needed yet — covers are COVR-* in Phase 4 |
| edge functions | OPT-OUT | not needed — no server-side secret in Phase 1; Phase 4 uses Netlify Functions for the book-API proxy |
| CLI: init, link, db push, migration list, projects list, gen types --project-id | INTEGRATE | |
| CLI: start / db diff / db pull (Docker-based) | OPT-OUT | not needed — Docker is not installed (D-10); hand-written migrations + db push instead |
