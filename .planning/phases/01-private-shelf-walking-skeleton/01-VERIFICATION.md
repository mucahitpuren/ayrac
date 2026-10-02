---
phase: 01-private-shelf-walking-skeleton
verified: 2026-10-02T15:30:00Z
status: human_needed
score: 4/5 roadmap success criteria verified (SC5 partially pending human); 0 failed
covered_files:
  - ".planning/REQUIREMENTS.md"
  - ".planning/ROADMAP.md"
  - "index.html"
  - "netlify.toml"
  - "src/app/router.tsx"
  - "src/features/auth/AuthProvider.tsx"
  - "src/features/book/AddBookPage.tsx"
  - "src/features/book/AddCopyPage.tsx"
  - "src/features/book/CopyDetailPage.tsx"
  - "src/features/book/DeleteCopyDialog.tsx"
  - "src/features/book/DeleteWorkDialog.tsx"
  - "src/features/book/EditBookPage.tsx"
  - "src/features/book/NoteCard.tsx"
  - "src/features/book/note-autosave.ts"
  - "src/features/library/queries.ts"
  - "src/i18n/index.ts"
  - "src/lib/theme.ts"
  - "supabase/migrations/20260926120000_init_schema.sql"
  - "tests/integration/rls-isolation.test.ts"
  - "tests/unit/migrations-rls.test.ts"
covered_digest: "v1:sha256:17e656555d170faf43c26855b89919e1dcf66ab1cfbd11efe01e934ca283574e"
behavior_unverified: 4
overrides_applied: 0
behavior_unverified_items:
  - truth: "(01-05, AUTH-02 edge) Logging out and any sign-in as a different user clears the TanStack Query cache, so the next account on the same browser never sees the previous account's library, even briefly"
    test: "Sign in as account A, open the library, log out, sign in as account B in the same tab without reloading"
    expected: "B never sees A's tiles, not even for one frame; B's library loads from the network"
    why_human: "Code calls queryClient.clear() on SIGNED_OUT and on user change (AuthProvider.tsx:42,55,75), but no unit or integration test exercises the transition. Presence checks cannot show the cache is empty before the next render."
  - truth: "(01-05, AUTH-05 edge) If the session ends without the user logging out, the 'session expired' toast appears once and the app routes to /login"
    test: "While signed in, invalidate the refresh token (revoke the session from the Supabase dashboard or edit the stored token), then trigger a refresh or reload"
    expected: "Exactly one toast 'Oturumun sona erdi, tekrar giriş yap.' and a redirect to /login; no toast on a normal logout"
    why_human: "The explicitSignOut ref logic (AuthProvider.tsx:33,57-58,70-75) is an ordering invariant with no test. It also interacts with WR-01 (a failed signOut never emits SIGNED_OUT)."
  - truth: "(01-11, LIB-09 UI) A delete dialog cannot be dismissed while the request is in flight, and copy_deleted=false (already deleted in another tab) is treated as success and leaves the page"
    test: "Open 'Delete copy', press Evet sil, then press Escape / click the overlay / click Vazgeç immediately; separately delete the same copy in a second tab first and confirm in the first"
    expected: "Dialog stays open with a spinner until the request settles; the second-tab case navigates away with no error toast"
    why_human: "The DB side (idempotency, concurrency) is covered by tests/integration/rpc.test.ts and edit-delete.test.ts, but the dialog's pending and onSuccess branches (DeleteCopyDialog.tsx:37-54) have no component test."
  - truth: "(01-11, LIB-08) The edit form is never pre-filled from a copy cached by the detail page, only from data fetched after the edit page opened, and an in-flight note autosave cannot be overwritten by saving the form"
    test: "On a copy page type a note and immediately tap 'Edit book'; save the edit form without touching the note"
    expected: "The new note survives and the form shows the latest values"
    why_human: "EditBookPage.tsx:153-178 relies on refetchOnMount + dataUpdatedAt ordering. The review (WR-04) shows updateCopy always sends `note` (queries.ts:237-242), so a stale SELECT can overwrite a fresh note. A race cannot be proven by presence checks."
human_verification:
  - test: "Add a book by hand in a real browser (phone and desktop): fill all fields, save, find it in the library, open its detail page"
    expected: "One tile appears; the detail page shows hero, work info and note card; validation errors focus the first invalid field; a double-tap on save creates one work"
    why_human: "Add flow, focus-on-error and double-submit are covered only by integration/unit tests of the data layer, not driven in a browser."
  - test: "Add a second copy through both entries (dashed 'Add new copy' card, and picking a suggestion under the Title field on /kitap/yeni)"
    expected: "The copy lands under the same work; the kicker reads 'You own 2 copies of this work'; the library shows two separate tiles with format pills"
    why_human: "Interactive flow; the picker's combobox behaviour (ArrowUp/Down, Enter, Escape, 44px options) needs a keyboard and a screen reader."
  - test: "Edit a book (work and copy fields), reload, then delete one copy and then a whole work through the confirm dialogs"
    expected: "Values persist after reload; nothing is deleted before 'Evet, sil'; last-copy and many-copy dialog wording is correct; redirects land on the oldest sibling or on /"
    why_human: "Dialog interaction, redirects and wording in both languages are UI behaviour."
  - test: "Note autosave states on the copy page (Kaydedilmedi... -> Kaydediliyor... -> Kaydedildi), including going offline mid-edit"
    expected: "States appear in order; an offline failure shows the error toast and keeps the text; navigating away right after typing persists the note (see WR-03 for the offline-on-leave case)"
    why_human: "Timing-dependent UI states."
  - test: "375px layouts of /, /kitap/yeni, /kitap/:id, /kitap/:id/duzenle, /eser/:id/nusha-ekle, dialogs and menus, one-handed"
    expected: "No horizontal scroll; controls at least 44px; the sticky top bar fits on one row; the hero title wraps without clipping"
    why_human: "Visual and ergonomic judgement. Only /login, /signup and the empty library were user-checked on a phone (after 01-07)."
  - test: "Two-account isolation through the UI: sign in as A and add books, log out, sign in as B in the same browser, open one of A's /kitap/<id> links"
    expected: "B sees an empty library and the not-found message for A's link"
    why_human: "DB-level isolation is proven by 20 integration tests; the UI path (cache clear plus not-found screens) has not been driven in a browser."
  - test: "Session persistence on desktop: sign in, fully close the browser, reopen the live URL"
    expected: "The user is still signed in and lands on the library without a login flash"
    why_human: "persistSession: true is set (src/lib/supabase.ts:27), but a full browser restart is not covered by a test and was not in the phone check."
  - test: "No-flash theme paint with a stored dark theme on a cold load, and a live OS theme change while 'System' is selected"
    expected: "No light flash before first paint; the page follows the OS change"
    why_human: "First-paint behaviour cannot be observed without a browser."
  - test: "Open a Netlify Deploy Preview and add a book"
    expected: "The preview talks to the dev project, never prod"
    why_human: "Per-context Netlify env vars cannot be inspected from the repo."
---

# Phase 1: Private Shelf (Walking Skeleton) Verification Report

**Phase Goal:** A user can create an account and keep a private shelf of hand-added books (one work, many copies) on a live Netlify URL, in Turkish or English, on phone or desktop.
**Verified:** 2026-10-02T15:30:00Z
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

The code, schema, tests and live deployment all support the phase goal. I found no failed truth, no stub, no unwired artifact and no blocker. The status is `human_needed` rather than `passed` because the add, edit, delete, copy-detail and note flows, and the 375px layouts, have not been driven in a browser. Four plan-level truths describe state transitions or race conditions that no test exercises. All of this is listed under Human Verification Required.

MVP mode note: ROADMAP marks this phase `Mode: mvp`, but the goal is not in "As a ..., I want to ..., so that ..." form, so the user-story guard would reject it. I verified it with the standard goal-backward method against the five roadmap success criteria. If you want the MVP "User Flow Coverage" framing, run `/gsd mvp-phase 1` to reword the goal first.

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can sign up with email and password, log in, log out, and stays signed in after closing and reopening the browser | ✓ VERIFIED (restart on desktop pending human) | `AuthPage.tsx` calls `signUp` / `signInWithPassword`, maps `user_already_exists`, `invalid_credentials` and `weak_password`, and navigates to `/` when a session is returned. `AuthProvider.tsx` restores the session with `getSession()` and listens with `onAuthStateChange`. `supabase.ts:27` sets `persistSession: true` and `autoRefreshToken: true`. `router.tsx` guards `RequireAuth` and `PublicOnly`, with a loading spinner so there is no login flash. `AccountMenu` calls `signOut`. The user verified sign-up with no email confirmation, login and logout on a phone against prod. `auth-config.test.ts` and `tracer.test.ts` passed on dev. The browser-restart check is in the human list. |
| 2 | User can add a book by hand (work fields plus copy fields), see it in the library list and on its detail page | ✓ VERIFIED (browser flow pending human) | `AddBookPage` → `createWorkWithCopy` → RPC `create_work_with_copy` (one transaction; `queries.ts:64-83`, migration lines 160-187). `bookFormSchema` enforces required title, authors, genre and format, and maps blank optional fields to NULL (`book-form.ts`). `onSuccess` invalidates `libraryKeys` and navigates to `/`. `LibraryPage` renders one tile per copy, linking to `/kitap/:id`. `CopyDetailPage`, `CopyHero` and `fetchCopyDetail` show the work, series, genre and copy data. The roadmap says "work detail page"; the delivered page is the copy-centred page (D-07) and lists all copies of the work, which satisfies LIB-06. `schema.test.ts`, `tracer.test.ts` and `copy-detail.test.ts` passed on dev. |
| 3 | A second copy of the same work is listed under that work, not as a separate book. User can edit work and copy details, and delete a copy or a whole work only after confirming | ✓ VERIFIED (dialog and flow interaction pending human) | `SiblingsSection` lists all copies sharing `work_id` plus a dashed "Add new copy" link to `/eser/:workId/nusha-ekle`. `AddCopyPage` and the `WorkPicker` path in `AddBookPage` both call `addCopyToWork`, which inserts a copy with only `work_id`; the trigger `copies_set_user_id` sets the owner. `EditBookPage` pre-fills and runs `updateWork` then `updateCopy`. `DeleteCopyDialog` and `DeleteWorkDialog` use `AlertDialog` and delete only inside the confirm button's mutation. `delete_copy` locks the parent work row, then removes the work with its last copy (migration lines 190-230). `add-copy.test.ts`, `edit-delete.test.ts` and `rpc.test.ts` passed on dev (70 integration tests, reported by the orchestrator). |
| 4 | A second account sees none of the first account's works or copies and cannot read or change them through the Supabase API. The automated two-account isolation test passes for every table | ✓ VERIFIED | The migration enables RLS on `works` and `copies` in the same file that creates them, with four owner-scoped policies each (`(select auth.uid()) = user_id`). It revokes `anon`, makes the functions `SECURITY INVOKER` with an empty `search_path`, and revokes execute from `anon` and `public`. `copies_set_user_id` rejects a copy under a foreign work with the same error as a missing one. `tests/integration/rls-isolation.test.ts` has 20 tests: select, update, delete, forged `user_id`, moving a copy under a foreign work, the RPC, anon, and a gate that fails when a table is not covered (`COVERED_TABLES` must equal `schemaTables()`). `tests/unit/migrations-rls.test.ts` re-ran green here (unit suite 147/147). Integration results are the orchestrator's evidence; I did not re-run them. Caveat: the static gate checks policy presence, not scope (WR-08). |
| 5 | The deployed Netlify app switches between Turkish and English (browser default, choice remembered) and light/dark (system default), and every screen is comfortable one-handed on a phone and works on desktop | ? UNCERTAIN (switching verified, layout ergonomics partly pending human) | The live site https://ayrackitap.netlify.app returned 200 for `/`, `/kitap/yeni` and `/login`, with nosniff, X-Frame-Options DENY and strict-origin Referrer-Policy. The live bundle contains the delete, edit and add-copy code, and its Supabase ref differs from the local dev build. `check-secrets.mjs` found nothing in the live bundle or in the git history (157 files). `i18n/index.ts` and `languages.ts` implement stored → navigator → English with persistence only on an explicit pick, matching the inline script in `index.html`. `theme.ts` and the boot script implement stored → system, with the dark class set before first paint. `tr.json` and `en.json` both have 121 keys with no difference, and every statically referenced key exists. The user verified TR/EN and light/dark switching on a phone. Buttons, inputs and select options are 44px (`h-11` / `min-h-11`). What is not yet human-verified: 375px layout of the add, edit, detail and dialog screens, so the "every screen one-handed" claim is not fully proven. |

**Score:** 4/5 roadmap truths verified (SC5 is split: mechanism verified, ergonomics pending). 4 plan-level truths are present and wired but behaviour-unverified (see `behavior_unverified_items`).

### Deferred Items

None. The open warnings below (pagination, CSP, server constraints) are not covered by any later phase's goal or success criteria in ROADMAP.md, so I did not defer them. The 01-07 summary says CSP is deferred to Phase 4, but the Phase 4 roadmap text does not mention it.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260926120000_init_schema.sql` | works, copies, trigger, RLS, grants, two RPCs | ✓ VERIFIED | Complete LIB-01 shape including `series`, `series_position`, `volume_coverage`, `edition_title`. RLS on both tables. |
| `src/features/library/queries.ts` | Data functions shared by app and tests | ✓ VERIFIED | All 11 exported functions are used by pages and by integration tests. |
| `src/features/auth/AuthProvider.tsx` and `AuthPage.tsx` | Session context, sign-up and login | ✓ VERIFIED | Wired in `router.tsx` and `main.tsx`. |
| `src/features/library/LibraryPage.tsx` | Grid with four states | ✓ VERIFIED | Loading, empty, error and populated branches present. |
| `src/features/book/*` (Add, AddCopy, Edit, CopyDetail, Hero, Siblings, NoteCard, dialogs, WorkPicker, forms) | Add, edit, delete, copy detail | ✓ VERIFIED | All routed in `router.tsx`; no stubs. |
| `src/app/AppShell.tsx`, `language-menu`, `theme-menu`, `account-menu` | Shell with language, theme, logout | ✓ VERIFIED | Menus also present on `/login` and `/signup` (`AuthPage.tsx:99-102`). |
| `index.html`, `src/i18n/*`, `src/lib/theme.ts` | Pre-paint theme and language | ✓ VERIFIED | Boot script and TS twins agree. |
| `netlify.toml`, `scripts/check-secrets.mjs` | Build gate, SPA rewrite, headers | ✓ VERIFIED | Build command runs the scanner on `dist`. Scanner passes on the live bundle and on history. |
| `tests/integration/*`, `tests/setup/*`, `tests/unit/*` | Isolation matrix and guards | ✓ VERIFIED | 8 integration files (67 `it` blocks counted; orchestrator reports 70 tests) and 11 unit files. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `LibraryPage` | `fetchLibrary` | `useQuery(libraryKeys.all)` | WIRED | Line 56-59. |
| `AddBookPage` | `createWorkWithCopy` / `addCopyToWork` | `useMutation` | WIRED | Lines 65-81. |
| `queries.ts` | migration RPCs | `rpc('create_work_with_copy')`, `rpc('delete_copy')` | WIRED | Function names and argument names match the migration. |
| `DeleteCopyDialog` | `delete_copy` | `deleteCopy` → RPC | WIRED | |
| `CopyDetailPage` | `EditBookPage` | `Link to /kitap/:id/duzenle` | WIRED | |
| `SiblingsSection` | `AddCopyPage` | `Link to /eser/:workId/nusha-ekle` | WIRED | |
| `NoteCard` | `note-autosave` | `createNoteAutosave` | WIRED | |
| `LanguageMenu` | i18n | `setLanguage` | WIRED | |
| `router.tsx` | `AuthProvider` | `useAuth()` | WIRED | |
| `AuthProvider` | query cache | `queryClient.clear()` | WIRED | Behaviour unverified, see items above. |
| `netlify.toml` | `check-secrets.mjs` | build command | WIRED | |
| `supabase.ts` | `client-key.ts` | `assertClientSafeKey` | WIRED | Secret-key guard is also present in the shipped bundle. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `LibraryPage` | `data` | `copies` select joined with `works` via PostgREST | Yes | ✓ FLOWING (truncates at 1000 rows, WR-02) |
| `CopyDetailPage` / `CopyHero` / `SiblingsSection` | `detail` | `copies` select with embedded work and sibling copies | Yes | ✓ FLOWING |
| `EditBookForm` | `defaultValues` | `fromCopyDetail(detail)` | Yes | ✓ FLOWING |
| `NoteCard` | `initialNote` | `detail.note` | Yes | ✓ FLOWING |
| `WorkPicker` | `works` | `summarizeWorks(library.data)` | Yes | ✓ FLOWING (empty while the library is loading or failed, IN-02) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit suite | `npm run test:unit` | 11 files, 147 tests passed | ✓ PASS |
| Typecheck and build | `npm run build` | built in 647 ms (chunk-size warning only) | ✓ PASS |
| Lint | `npm run lint` | no output, exit 0 | ✓ PASS |
| Live routes | `curl` on `/`, `/kitap/yeni`, `/login` | 200, 200, 200 | ✓ PASS |
| Live headers | `curl -I /` | nosniff, DENY, strict-origin-when-cross-origin | ✓ PASS |
| Live bundle has Phase 1 features | grep for `delete_copy`, `nusha-ekle`, `duzenle` | present in the live bundle | ✓ PASS |
| Secret scan, live bundle | `check-secrets.mjs` on the downloaded bundle | no secrets found | ✓ PASS |
| Secret scan, git history | `check-secrets.mjs --git-history` | no secrets in 157 files | ✓ PASS |
| i18n parity and used keys | node script over `src` and both catalogs | 121 / 121 keys, 0 missing | ✓ PASS |
| Integration suite | not run (instructed not to; dev project) | orchestrator reports 70 of 70 passing on DEV | ? SKIP (accepted as supplied evidence) |

### Probe Execution

Step 7c: SKIPPED. No `scripts/*/tests/probe-*.sh` exists, and no plan declares a probe.

### Requirements Coverage

All 15 IDs from the phase are declared in plan frontmatter and map to Phase 1 in REQUIREMENTS.md. None is orphaned and none is missing from a plan.

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| AUTH-01 | 01-02, 01-04 | Sign up with email and password | ✓ SATISFIED | `AuthPage.tsx`, `auth-config.test.ts`, user-verified on prod |
| AUTH-02 | 01-04, 01-05 | Log in and log out | ✓ SATISFIED | `AuthPage.tsx`, `AccountMenu`; failed-signout caveat WR-01 |
| AUTH-05 | 01-04, 01-05 | Session persists across restarts | ✓ SATISFIED (restart check pending human) | `persistSession: true`, `getSession()` restore |
| AUTH-07 | 01-02, 01-04, 01-06 | Own data only, two-account test on every table | ✓ SATISFIED | Migration RLS, 20-test isolation matrix, static gate; WR-08 caveat |
| LIB-01 | 01-04, 01-06, 01-08 | Work and copy fields incl. series, edition title, volume coverage | ✓ SATISFIED | Migration columns and CHECKs, `schema.test.ts` round trip |
| LIB-02 | 01-04, 01-06, 01-10 | Multiple copies of one work | ✓ SATISFIED | FK `work_id`, `addCopyToWork`, `add-copy.test.ts` |
| LIB-06 | 01-09 | Detail page shows every copy of a work | ✓ SATISFIED | `fetchCopyDetail` with siblings, `SiblingsSection` |
| LIB-08 | 01-11 | Edit work and copy details | ✓ SATISFIED | `EditBookPage`, `updateWork`, `updateCopy`; WR-04 race noted |
| LIB-09 | 01-06, 01-11 | Delete a copy or work after confirming | ✓ SATISFIED | Alert dialogs, `delete_copy`, `rpc.test.ts`, `edit-delete.test.ts` |
| LIB-10 | 01-04, 01-08, 01-09 | Each copy is its own tile, never merged | ✓ SATISFIED | `LibraryPage` maps one tile per copy row |
| ADD-02 | 01-08, 01-10 | Add a book manually | ✓ SATISFIED | `AddBookPage` and the atomic RPC |
| READ-04 | 01-09 | Personal note on a book | ✓ SATISFIED | `NoteCard`, `note-autosave.ts`, `note-autosave.test.ts`; WR-03 noted |
| UI-01 | 01-01, 01-05, 01-07 | Turkish and English, default from browser, remembered | ✓ SATISFIED | `i18n/*`, `index.html`, `i18n.test.ts`, user-verified |
| UI-02 | 01-01, 01-03, 01-05, 01-07 | Light and dark, default from system | ✓ SATISFIED | `theme.ts`, `theme.test.ts`, user-verified |
| UI-03 | 01-03, 01-05, 01-07 | Responsive and mobile-first | ? NEEDS HUMAN (partial) | Mobile-first classes and 44px targets present; 375px review of later screens pending |

### Prohibitions (must_haves.prohibitions, all `judgment` tier)

All are recorded as unverified-prohibition, with a non-authoritative judge verdict. None is silently passed.

| Prohibition | Judge verdict | Flag |
|-------------|---------------|------|
| MUST NOT read, copy, commit or upload `data/` (the author's library) | Not violated: `data/` is in `.gitignore`, `git ls-files data` is empty, history has no `data` path, and the scanner found nothing | unverified-prohibition, human review recommended |
| MUST NOT send library content or email to any third party besides Supabase; no analytics, telemetry or CDN fonts | Not violated: no `http(s)` URL in `src` or `index.html`, no analytics identifiers, fonts are self-hosted `@fontsource-variable`, the bundle contains only the Supabase project URL and library doc links | unverified-prohibition, human review recommended |
| MUST NOT run automated tests, seeds or cleanup against prod | Not violated in code: `tests/setup/env.ts` refuses a URL containing the prod ref. IN-06 notes a custom domain would bypass the guard. Past runs cannot be audited from the repo | unverified-prohibition, human review recommended |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (all of `src`, `tests`, `scripts`, `supabase`, `netlify.toml`, `index.html`) | n/a | `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, "coming soon" | none found | No debt markers |
| `src/features/auth/AuthProvider.tsx` | 69-77 | `signOut()` ignores the returned `error` (WR-01) | ⚠️ Warning | A failed logout (offline) leaves the user signed in with no feedback. Normal logout works (user-verified). |
| `src/features/library/queries.ts` | 47-55 | Unpaginated select, PostgREST `max_rows` 1000 (WR-02) | ⚠️ Warning | Silent truncation above 1000 copies. The author's ~110 books are unaffected, but the picker and later search inherit it. |
| `src/features/book/NoteCard.tsx`, `note-autosave.ts` | 37-41, 32-34 | Failed save during unmount is silent (WR-03) | ⚠️ Warning | Note text lost without a message when leaving the page offline |
| `src/features/book/EditBookPage.tsx`, `queries.ts` | 158-163; 237-242 | Edit form always sends `note` (WR-04) | ⚠️ Warning | Narrow race can overwrite a just-typed note with the old value |
| `src/app/router.tsx` | 54-55 | Same `AuthPage` instance reused across /login and /signup (WR-05) | ⚠️ Warning | Server errors can follow the user to the other form |
| `netlify.toml` | 19-25 | No Content-Security-Policy while the session is in localStorage (WR-06) | ⚠️ Warning | No known XSS sink today; decide before Phase 3/4 render imported or remote text |
| `supabase/migrations/...init_schema.sql` | 22, 29, 55-56 | CHECKs weaker than the client schema (WR-07) | ⚠️ Warning | A tenant can only damage own rows. A NULL or blank author element would break `matchWorks` |
| `tests/setup/schema-tables.ts`, `tests/unit/migrations-rls.test.ts` | 91-99; 130-135 | Static RLS gate checks policy existence, not scope (WR-08) | ⚠️ Warning | A future `using (true)` policy would pass the unit gate; the integration matrix is the real guard |
| `src/features/book/AddBookPage.tsx` | 44-45 | Picker is empty while the library loads or errors (IN-02) | ℹ️ Info | A duplicate work can be created in that window. Phase 2's ADD-03 addresses duplicates properly. |
| `src/app/router.tsx` | 24-29 | Deep link is lost after login (IN-01) | ℹ️ Info | Matters for the "pull it up on my phone" scenario |

None of the eight review warnings undermines a roadmap success criterion. WR-01 and WR-03 touch a literal reading of SC1 (logout) and READ-04 (autosave) only on failure paths.

### Human Verification Required

See the `human_verification` and `behavior_unverified_items` blocks in the frontmatter. Summary:

1. **Add, add-copy, edit and delete flows in a real browser** (phone and desktop), including dialog wording in both languages, focus-on-error and double-submit.
2. **Work picker keyboard and screen-reader behaviour.**
3. **Note autosave states**, including an offline failure.
4. **375px layouts** of every Phase 1 screen, one-handed.
5. **Two-account isolation through the UI** (cache clear plus not-found screens).
6. **Desktop session persistence** across a full browser restart.
7. **No-flash theme paint** and live OS theme change.
8. **Netlify Deploy Preview** talks to the dev project.
9. **Four behaviour-unverified transitions:** cache clear on user switch, session-expiry toast ordering, delete-dialog in-flight and already-deleted branches, edit pre-fill versus in-flight note save.

### Gaps Summary

There are no gaps. No roadmap truth failed, no artifact is missing or a stub, every key link is wired, and all 15 requirement IDs are accounted for. The only items standing between this phase and `passed` are the human checks above. The eight code-review warnings are quality defects on failure paths and at scale; I recommend a short follow-up plan (`/gsd-plan-phase --gaps` or a quick task) for WR-01, WR-03, WR-04 and WR-05 before the public launch, and a decision on WR-02 and WR-06 before Phase 2 and Phase 3 build on the same library array and render imported text.

---

_Verified: 2026-10-02T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
