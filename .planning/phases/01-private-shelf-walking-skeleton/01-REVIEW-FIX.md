---
phase: 01-private-shelf-walking-skeleton
fixed_at: 2026-10-02T15:12:00Z
review_path: .planning/phases/01-private-shelf-walking-skeleton/01-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-10-02
**Source review:** .planning/phases/01-private-shelf-walking-skeleton/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (Critical: 0, Warning: 8; Info excluded by `fix_scope: critical_warning`)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### WR-01: signOut() ignores the error result

**Files modified:** `src/features/auth/AuthProvider.tsx`
**Commit:** dad4021
**Applied fix:** `signOut()` now reads `{ error }` and, when the server revoke fails, calls `signOut({ scope: 'local' })` so the session always ends on this device.

### WR-02: fetchLibrary has no pagination (PostgREST max_rows 1000)

**Files modified:** `src/features/library/queries.ts`, `tests/unit/fetch-library.test.ts` (new)
**Commit:** 086195e
**Applied fix:** `fetchLibrary` pages with `.range()` (page size `LIBRARY_PAGE_SIZE = 1000`, optional second argument for tests) until a page comes back short, and throws if any page fails. The page size must stay equal to `max_rows` in `supabase/config.toml`; if the hosted project ever lowers `max_rows` below the page size, the loop would stop early. Unit tests use a fake PostgREST client with a server-side row cap (2500 rows, exact-multiple page, empty library, failing page).
Status: fixed (logic: requires human verification only of the max_rows coupling above).

### WR-03: Note autosave drops the text silently when the unmount flush fails

**Files modified:** `src/features/book/note-autosave.ts`, `src/features/book/NoteCard.tsx`, `tests/unit/note-autosave.test.ts`
**Commit:** 929859c
**Applied fix:** New optional `onFinalError` callback, called from `settle(false)` when the controller is already disposed (before that, `onState` is silent). `NoteCard` wires it to the existing `book.note.saveFailed` toast, so no new i18n keys. Unit tests cover failure after dispose, success after dispose, and failure before dispose.

### WR-04: EditBookPage pre-fill can overwrite a newer note with the stale one

**Files modified:** `src/features/library/queries.ts`, `src/features/book/book-form.ts`, `src/features/book/EditBookPage.tsx`, `tests/unit/book-form.test.ts`, `tests/unit/update-copy.test.ts` (new)
**Commit:** 8519920
**Applied fix:** `updateCopy` now takes an `UpdateCopyPatch` whose `note` is optional and only sent when defined. New `toEditCopyInput(values, initialNote)` in `book-form.ts` omits `note` unless its normalized value differs from the note the form was opened with (`detail.note`). The edit page uses it. Add and other paths are unchanged (`toUpdateCopyInput` still returns the full input). Chose the review's first option (dirty-check) over awaiting the autosave; the comparison is made against the pre-fill value rather than RHF `dirtyFields` so it does not depend on formState subscription.
Status: fixed (logic: requires human verification of the edit-then-note-change flow in a browser).

### WR-05: AuthPage state leaks between /login and /signup

**Files modified:** `src/app/router.tsx`
**Commit:** 10cbcec
**Applied fix:** `key="signup"` / `key="login"` on the two `<AuthPage>` routes, so each route gets its own instance and form state.

### WR-06: No Content-Security-Policy

**Files modified:** `netlify.toml`, `tests/unit/csp.test.ts` (new)
**Commit:** 91bdf33
**Applied fix:** Added a `Content-Security-Policy` header:
`default-src 'self'; script-src 'self' 'sha256-ngb8aZ0eeqBdxhDlSPC4PRtWOVG3t5y+J6LdnO21tH8='; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`.
- Scripts: no `'unsafe-inline'` or `'unsafe-eval'`; the pre-paint boot script in `index.html` is allowed by hash. The hash was computed on the LF-normalized script text and matches the script in `dist/index.html` after `vite build` (Vite does not alter it).
- **Changing the inline script in `index.html` changes the hash.** `tests/unit/csp.test.ts` recomputes the sha256 from `index.html` (CRLF normalized, as the HTML parser does) and fails if `netlify.toml` does not contain it. It also asserts exactly one inline script, no unsafe script sources, the connect-src list, and `object-src`/`frame-ancestors`/`base-uri`.
- `style-src 'unsafe-inline'` is required: Radix and sonner emit style attributes and a `<style>` element at runtime, and `CopyHero` uses an inline style.
- `img-src https:` is deliberately broad so Open Library and Google Books covers work later without a header change (images cannot run script).
- Not verified in a real browser against the deployed header (the header is only served by Netlify; `vite dev` and `vite preview` do not apply it). Check the console for CSP violations on the first deploy preview. If Netlify "asset optimization" (JS minify) is ever enabled for the site, it would rewrite the inline script and break the hash.
- `npm run build` and `node scripts/check-secrets.mjs dist` both pass (no secrets found in 3 files).

### WR-07: Database constraints weaker than the client validation

**Files modified:** `supabase/migrations/20261002120000_harden_text_constraints.sql` (new), `tests/integration/schema.test.ts`
**Commit:** 79932ff (migration + tests), b1d41b8 (test labels)
**Applied fix:** New migration (the applied init migration is untouched):
- `works_authors_valid`: every `authors` element non-null and 1..200 characters after `btrim`, via the immutable helper `public.is_valid_authors(text[])` (CHECK cannot contain a subquery, as the review noted).
- `copies_cover_url_check`: `cover_url` is NULL or an `https://` URL with no whitespace, at most 2048 characters.
- `copies_volume_coverage_valid`: `volume_coverage` is NULL or 1..50 positive numbers with no NULL element, via `public.is_valid_volume_coverage(numeric[])`.
- Both helpers are `SECURITY INVOKER`, `set search_path = ''`, revoked from `public, anon` and granted to `authenticated` (Postgres checks the caller's EXECUTE privilege when a CHECK that calls a function is evaluated), so the static gate in `tests/unit/migrations-rls.test.ts` keeps passing and still covers them.
- Existing data: constraints are added validated (not `NOT VALID`). Rows written by the app already satisfy them (the form trims authors and caps them at 200 code points; `cover_url` and `volume_coverage` have no writer yet). If any hosted row violates a rule, `ADD CONSTRAINT` fails and the whole migration rolls back with no data changed. This could not be checked against the hosted data from here.
- `cover_url` is `https` only. Google Books thumbnails are often `http://`; Phase 4 must upgrade them to https before storing, or relax the constraint in a later migration.
- New integration tests (rejects `[null]`, `['']`, `['   ']`, 201-char author, bad cover URLs, bad volume arrays; accepts valid values) were added to `tests/integration/schema.test.ts`.

**ACTION REQUIRED BEFORE THE NEXT DEPLOY:** the migration has NOT been pushed anywhere (no `supabase db push`, `link`, or any hosted access was run). Push `20261002120000_harden_text_constraints.sql` to the **dev** project first and re-run `npm run test:integration`, then to **prod**.

Until it is pushed to dev, 15 of the new integration tests fail by design (they assert the CHECK violation). The adjacent "left no partial rows behind" test also fails in that state, because the rows that the missing constraints let through remain; the test user is swept by the suite's `afterAll`. The other 71 integration tests passed.

### WR-08: The AUTH-07 static RLS gate proves policies exist, not that they are owner-scoped

**Files modified:** `tests/setup/schema-tables.ts`, `tests/unit/migrations-rls.test.ts`
**Commit:** 2db5e93
**Applied fix:** `tableSecurity()` now parses each policy's `USING` / `WITH CHECK` clause (balanced parentheses) and returns `unscopedPolicies`. A policy is scoped only if its governing clause (WITH CHECK for INSERT, USING for SELECT/DELETE/UPDATE/ALL) compares `auth.uid()` with `user_id` in either order, and any other clause present is scoped as well. `using (true)`, `auth.uid() is not null` and an INSERT policy without WITH CHECK are reported. The hardening gate fails for any table with unscoped policies unless it is listed in the new, empty `INTENTIONALLY_UNSCOPED_TABLES` allow-list in the test (used instead of a comment marker, because the parser strips comments). Synthetic tests prove the gate fails on `using (true)` and passes the owner-check forms used by the real migration. The previous synthetic cases that use `using (true)` are unchanged and still pass, because they only assert `policies`.
Status: fixed (logic: requires human verification that the owner-check regex is the strictness you want).

## Verification

Run in the **main checkout** (not an isolated worktree), see Notes.

- `npm run lint`: pass
- `npm run typecheck`: pass
- `npm run build`: pass
- `npm run test:unit`: pass (14 files, 167 tests)
- `node scripts/check-secrets.mjs dist`: no secrets found
- `npm run test:integration` (dev project): 71 passed, 15 failed, all 15 are the new WR-07 migration-dependent tests and the "left no partial rows" test downstream of them (see WR-07). Run before the final test-label-only commit (b1d41b8), which changed no assertions.

## Notes

- Worktree: `workflow.use_worktrees` is not set to `false` in `.planning/config.json`, but the orchestrator's constraints (root-pin guard, dependencies and gates must run in the main checkout, no `node_modules` in a worktree) required working in the main checkout on `master` instead. No worktree, temp branch or recovery sentinel was created, so there is nothing to clean up.
- Commits are on `master`, not pushed. Each commit carries a "LF will be replaced by CRLF" git warning (autocrlf); no files were reformatted.
- An untracked `.planning/phases/01-private-shelf-walking-skeleton/01-VERIFICATION.md` existed before this run and was not touched.
- Info findings (IN-01 to IN-07) were out of scope (`fix_scope: critical_warning`).

---

_Fixed: 2026-10-02_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
