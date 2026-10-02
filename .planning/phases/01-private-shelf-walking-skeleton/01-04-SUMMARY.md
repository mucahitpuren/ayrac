---
phase: 01-private-shelf-walking-skeleton
plan: 04
subsystem: database
tags: [supabase, postgres, rls, auth, react-router, tanstack-query, react-hook-form, zod, i18n, tracer]

requires:
  - phase: 01-private-shelf-walking-skeleton
    provides: "01-02 linked dev project, app Supabase client, prod-guarded test harness; 01-03 tokens, Button/Input/Card/Skeleton/Toaster, BookCover"
provides:
  - "Migration 20260926120000_init_schema.sql applied to dev: works, copies, ownership trigger, RLS with 8 policies, anon revoked, create_work_with_copy and delete_copy"
  - "Locked vocabularies in the database: 6 copy formats and 22 work genres as CHECK constraints"
  - "Regenerated Database types for works, copies and both functions"
  - "queries.ts: libraryKeys, LibraryCopy, NewWorkWithCopy, fetchLibrary, createWorkWithCopy (client-injected, shared by app and tests)"
  - "AuthProvider/useAuth, AuthPage (signup and login), RequireAuth/PublicOnly router, LibraryPage with all four states"
  - "tr/en catalogs for auth, form errors, library and format labels"
  - "Tracer integration test proving sign-up, empty library, atomic add and cross-user isolation on dev"
affects: [01-05, 01-06, 01-07, 01-08, 01-09, 01-10, 01-11]

plan_head_before: 90cd9cd4270678bed7b272f7efda351d50cd11f7
actuals:
  tokens: 10621
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Data functions take the Supabase client as an argument and import its type with import type, so integration tests reuse the exact functions the UI calls"
    - "Form and zod error messages are i18n keys, translated at render time"
    - "All SQL functions are SECURITY INVOKER with set search_path = '' and schema-qualified names; anon is revoked explicitly because Supabase default privileges grant it"
    - "Hosted DDL only via supabase db push from supabase/migrations; CLI env sourced through the gitignored node_modules/.cache/sb-run.sh helper"
    - "Query cache is cleared when the signed-in account changes or ends"

key-files:
  created:
    - supabase/migrations/20260926120000_init_schema.sql
    - src/features/library/queries.ts
    - src/features/library/LibraryPage.tsx
    - src/features/auth/AuthProvider.tsx
    - src/features/auth/AuthPage.tsx
    - src/app/router.tsx
    - tests/integration/tracer.test.ts
  modified:
    - src/lib/database.types.ts
    - src/main.tsx
    - src/i18n/locales/tr.json
    - src/i18n/locales/en.json

key-decisions:
  - "Task 1 decision (checkpoint:decision, resolved by the user with 'onayla' via the orchestrator): both slug lists confirmed exactly as in 01-CONTEXT.md. format: standard, graphic_novel, hardcover, pocket, special_edition, other. genre: novel, short_stories, poetry, drama, essay, classics, science_fiction, fantasy, crime, humor, children, biography, history, philosophy, psychology, politics_society, religion_mythology, science, art, self_help, travel, other. They are written verbatim into the CHECK constraints and the format.* catalog keys"
  - "Constraints are named (works_genre_check, copies_format_check, ...) so a later swap is a plain drop/add constraint"
  - "Trigger functions are revoked from public, anon and authenticated; only the two RPCs are executable, and only by authenticated"
  - "Generated RPC argument types do not model NULL, so queries.ts bridges that in one helper (sqlNull) instead of changing the already-pushed function signatures"
  - "Copy tiles are not links yet; navigation to the copy detail arrives with 01-07"

patterns-established:
  - "Migration header states that slug lists must match src/lib/vocab.ts (01-08) and the format./genre. i18n keys, changed in one commit"
  - "Auth errors map Supabase error.code to a field and a catalog key; unknown codes show common.errorGeneric"

requirements-completed: [AUTH-01, AUTH-02, AUTH-05, AUTH-07, LIB-01, LIB-02, LIB-10]

coverage:
  - id: D1
    description: "Complete LIB-01/LIB-02 schema (works, copies, slug CHECKs, one work to many copies via ON DELETE CASCADE) is applied to dev from a committed migration"
    requirement: LIB-01
    verification:
      - kind: other
        ref: "npx supabase migration list (20260926120000 has a remote timestamp)"
        status: pass
      - kind: integration
        ref: "tests/integration/tracer.test.ts#createWorkWithCopy inserts a work and its first copy in one call and returns both ids"
        status: pass
    human_judgment: false
  - id: D2
    description: "A sign-up through auth.signUp returns a session at once, the new user's library is empty, an atomic add writes one work and one copy, and the owner reads exactly that copy with user_id equal to their own id"
    requirement: AUTH-01
    verification:
      - kind: integration
        ref: "tests/integration/tracer.test.ts#a new user starts with an empty library"
        status: pass
      - kind: integration
        ref: "tests/integration/tracer.test.ts#the owner reads exactly that copy with its work, owned by their own user id"
        status: pass
    human_judgment: false
  - id: D3
    description: "RLS isolation: another user reads nothing of the owner's copy; anon has no table privileges; a copy under another user's work is rejected with 'work not found'; copies.user_id is overwritten from the parent work"
    requirement: AUTH-07
    verification:
      - kind: integration
        ref: "tests/integration/tracer.test.ts#another user sees nothing of it (RLS)"
        status: pass
    human_judgment: false
  - id: D4
    description: "tr/en catalogs stay in key parity after adding auth, form, library and format keys"
    requirement: LIB-10
    verification:
      - kind: unit
        ref: "tests/unit/i18n.test.ts#locale catalogs"
        status: pass
    human_judgment: false
  - id: D5
    description: "Sign-up and log-in screens: inline validation on blur, 8-character minimum before any request, submit spinner without double-submit, mapped errors for wrong credentials and duplicate email, redirect of signed-in users away from /login and /signup"
    requirement: AUTH-02
    verification: []
    human_judgment: true
    rationale: "No browser automation exists in this phase's stack; compile, lint and Vite transform of every module were checked, but nothing rendered the forms or exercised the Supabase error codes through the UI"
  - id: D6
    description: "Session survives reload and a full browser restart; a signed-out visitor at / is redirected to /login; only a spinner with 'Yükleniyor…' shows while the session is restored"
    requirement: AUTH-05
    verification: []
    human_judgment: true
    rationale: "Persistence across a real browser restart and the absence of a login-page flash cannot be asserted without a browser (plan human-check)"
  - id: D7
    description: "Library page renders one tile per copy with a format pill only for multi-copy works, loading skeletons, empty state, error with retry, count line, 2-line title clamp and the locked grid on phone and desktop"
    requirement: LIB-10
    verification: []
    human_judgment: true
    rationale: "Visual states, grid gaps, line clamping and hover lift need eyes on a rendered page; the tracer test covers the data but not the rendering"

duration: 5min
completed: 2026-10-02
status: complete
---

# Phase 1 Plan 04: Walking-skeleton tracer Summary

**Hand-written works/copies migration with RLS, a copy-ownership trigger and atomic add/delete functions pushed to dev, plus sign-up/log-in, session persistence and an RLS-scoped one-tile-per-copy library page, proven end to end by an integration test against dev**

## Performance

- **Duration:** about 5 min of executor time for this continuation (Task 1 was resolved by the user beforehand and is excluded)
- **Started:** 2026-10-02T10:34:39Z
- **Completed:** 2026-10-02T10:40:00Z
- **Tasks:** 2 (Task 1 checkpoint:decision resolved by the user, Task 2 tracer)
- **Files modified:** 11 (7 created, 4 modified)

## Accomplishments
- Task 1 resolved: the user confirmed both slug lists as proposed (see key-decisions); they are now in the CHECK constraints and the `format.*` catalog keys.
- Migration `20260926120000_init_schema.sql` created by hand and applied with `npx supabase db push` to the linked dev project only. `migration list` shows it with a remote timestamp. Nothing went through the dashboard SQL editor. `gen types` regenerated `src/lib/database.types.ts`.
- Schema: `works` (title, `authors text[]`, nullable genre, series, series_position), `copies` (format, publisher, edition_title, `volume_coverage numeric[]`, cover_url, note), updated_at triggers, indexes, RLS enabled in the same migration with 8 per-operation policies on `(select auth.uid()) = user_id`, anon revoked, authenticated granted.
- `copies_set_user_id` (SECURITY INVOKER, empty search_path) derives `copies.user_id` from the parent work and raises `work not found` (23503) for both missing and foreign works.
- `create_work_with_copy` and `delete_copy` as SECURITY INVOKER functions executable only by `authenticated`. An extra throwaway test run on dev (deleted afterwards, the full matrix belongs to 01-06) confirmed: a client-supplied foreign `user_id` is overwritten by the trigger, a foreign work is rejected with `work not found`, an invalid format slug is rejected, `delete_copy` returns `(true,false,work)` then `(true,true,work)` for the last copy and `(false,false,null)` when repeated, and anon is denied on both tables and the RPC.
- App: `AuthProvider`/`useAuth`, `AuthPage` for `/signup` and `/login` (react-hook-form + zod, i18n-key messages, autofocused email, correct autocomplete values, mapped Supabase error codes), router with `RequireAuth`/`PublicOnly`/`NotFound`, `LibraryPage` with skeleton, error+retry, empty and populated states, and `main.tsx` wiring `QueryClientProvider`, `AuthProvider`, `AppRouter` and `Toaster`.
- Tracer test (4 tests) passes on dev; `npm run test:unit` (74), `npm run build`, `npm run lint` and `npm run typecheck` all exit 0; `grep dangerouslySetInnerHTML src` finds nothing. Vite served every new module with HTTP 200.

## Task Commits

1. **Task 1: Confirm format and genre slug lists** - no commit (checkpoint:decision, resolved by the user)
2. **Task 2 (tracer), schema and data layer** - `a8f0421` (feat): migration, regenerated types, `queries.ts`, tracer test. The test was written first and failed on dev with `Could not find the table 'public.copies' in the schema cache` (4 of 4) before the migration existed.
3. **Task 2 (tracer), UI** - `bec996e` (feat): auth provider and page, library page, router, main, catalogs

**Plan metadata:** committed separately (docs: complete plan).

_`commits: 2` in the frontmatter is the measured `git rev-list --count 90cd9cd..HEAD` before the metadata commit._

## Files Created/Modified
- `supabase/migrations/20260926120000_init_schema.sql` - schema, trigger, RLS, grants, atomic functions
- `src/lib/database.types.ts` - regenerated from dev
- `src/features/library/queries.ts` - `libraryKeys`, `LibraryCopy`, `NewWorkWithCopy`, `fetchLibrary`, `createWorkWithCopy`
- `src/features/library/LibraryPage.tsx` - grid, `CopyTile`, four states
- `src/features/auth/AuthProvider.tsx`, `src/features/auth/AuthPage.tsx` - session context and the sign-up/log-in screen
- `src/app/router.tsx` - routes and guards
- `src/main.tsx` - provider tree
- `src/i18n/locales/tr.json`, `en.json` - new catalog keys
- `tests/integration/tracer.test.ts` - end-to-end proof on dev

## Decisions Made
- Slug lists confirmed unchanged (Task 1). Constraints are named so changing a list later is a drop/add constraint with no table rewrite.
- Trigger functions have execute revoked from `public`, `anon` and `authenticated` because nothing calls them directly. Triggers still fire (verified by the tracer and the extra run).
- The generated RPC argument types are all non-null, so `sqlNull()` in `queries.ts` casts a JSON null through; the already-pushed signatures were kept as the plan specifies.
- The empty library shows heading and body only, as the plan's must-have states; the UI-SPEC's "+ Kitap ekle" button follows when `/kitap/yeni` exists.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Query cache cleared when the signed-in account changes or ends**
- **Found during:** Task 2 (AuthProvider design)
- **Issue:** With `staleTime` 30 s and a single in-memory `QueryClient`, a second user signing in on the same tab after a sign-out would be served the first user's cached library rows until the refetch. That is a cross-user disclosure the RLS layer cannot prevent because it happens client-side.
- **Fix:** `AuthProvider` remembers the last user id and calls `queryClient.clear()` whenever the id changes to a different value or to none. `libraryKeys.all` is unchanged.
- **Files modified:** `src/features/auth/AuthProvider.tsx`
- **Verification:** build, lint and typecheck pass. The behaviour itself (sign out, sign in as someone else) cannot be exercised until 01-05 adds a sign-out control, so it is not covered by a test yet.
- **Committed in:** `bec996e`

**2. [Process] Tracer feedback gate evaluated without a checkpoint stop**
- **Found during:** end of Task 2
- **Issue:** The tracer's `<verify>` carries a `<human-check>` and `human_verify_mode` is `end-of-phase`, which the gate text reads as "stop for a human before expansion". This plan has no expansion task after the tracer, and the plan's own `<verification>` places the human check "before expansion plans build on this slice".
- **Fix:** Re-ran the automated verify (migration list, tracer test, unit tests, build all pass) and recorded the human-check as `human_judgment: true` deliverables D5 to D7 so `verify-work` raises them at end of phase. No stop was made, to avoid returning without a committed SUMMARY.
- **Files modified:** none
- **Committed in:** n/a

---

**Total deviations:** 2 (1 Rule 2, 1 process note)
**Impact on plan:** No scope change. Deviation 1 closes a privacy gap in the client layer; deviation 2 is a sequencing choice the orchestrator should know about, see below.

## Issues Encountered
- Postgres/PostgREST generated types do not model nullable function arguments (handled by `sqlNull`, see decisions).
- `npm run build` reports an 828 kB main chunk and transforms 4901 modules, most likely the `@phosphor-icons/react` barrel import. Not changed here; worth a look (per-icon imports or code splitting) when the bundle matters.
- The migration header cannot name the exact Postgres major version because the dashboard was not readable from automation; it points to Project Settings > Infrastructure and states nothing needs more than Postgres 15.
- LF/CRLF warnings on commit are git `autocrlf` notices only.

## User Setup Required

None. No new external service configuration; the dev project and env files came from 01-02.

**Open for the user (tracer human-check, not yet run):** `npm run dev`, then in a fresh browser profile open http://localhost:5173 and sign up at /signup, reload, fully close and reopen the browser, open /login while signed in, and try the same email again in a private window. Expected: "Kütüphanem" with the empty-state text and "0 kitap · 0 farklı eser"; still signed in after reload and restart with only a brief "Yükleniyor…"; /login redirects to /; duplicate sign-up shows "Bu e-posta zaten kayıtlı.". Also check phone width (3 columns) and the dark theme once. Note this creates a real account on the dev project (not prefixed ayrac-test+, so the sweep will not remove it).

## Known Stubs

None. Tiles are intentionally not links until the copy detail page (01-07); the empty-state call-to-action button is deferred until `/kitap/yeni` exists. Neither blocks this plan's goal.

## Threat Flags

None. The new surface (browser to PostgREST/RPC, browser to Auth) is exactly the plan's threat model. T-01-04-01 to T-01-04-07 are mitigated as planned (RLS at creation, trigger, anon revoked, invoker functions with empty search_path, typed parameters, no raw HTML injection, identical `work not found` error). T-01-04-08 is accepted.

## Next Phase Readiness
- Ready for 01-05 (app shell, sign-out, theme/language toggles): `useAuth()`, the router and `LibraryPage` exist and `Toaster` is mounted. The sign-out control should also confirm the cache-clearing behaviour from deviation 1.
- Ready for 01-06 (full RLS matrix): the schema, trigger and functions are live on dev; `copies.Insert` types require `user_id` because the column has no default, so matrix tests need to pass a value (the trigger overwrites it).
- Prod is not touched; the same migration is pushed there in 01-07 using `SUPABASE_PROD_DB_PASSWORD`.

## Self-Check: PASSED

All 11 plan files exist on disk and commits `a8f0421` and `bec996e` are in `git log`. Re-run results: `npx supabase migration list` shows 20260926120000 with a remote timestamp; `npm run test:integration -- tests/integration/tracer.test.ts` (4 passed), `npm run test:unit` (74 passed), `npm run build`, `npm run lint` and `npm run typecheck` exit 0; the migration has 2 `enable row level security`, 8 `create policy`, 4 `security invoker`, 4 `set search_path = ''`, and `revoke all on table` for both tables from anon; `queries.ts` uses `import type` and orders by `created_at` then `id`; `grep dangerouslySetInnerHTML src` has no match; `git status --porcelain` lists no `.env.*` file.

---
*Phase: 01-private-shelf-walking-skeleton*
*Completed: 2026-10-02*
