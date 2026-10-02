---
phase: 01-private-shelf-walking-skeleton
reviewed: 2026-10-02T00:00:00Z
depth: standard
files_reviewed: 79
files_reviewed_list:
  - components.json
  - eslint.config.js
  - index.html
  - netlify.toml
  - package.json
  - scripts/check-secrets.mjs
  - src/app/AppShell.tsx
  - src/app/router.tsx
  - src/components/account-menu.tsx
  - src/components/book-cover.tsx
  - src/components/form-field.tsx
  - src/components/language-menu.tsx
  - src/components/theme-menu.tsx
  - src/components/ui/alert-dialog.tsx
  - src/components/ui/button.tsx
  - src/components/ui/card.tsx
  - src/components/ui/dropdown-menu.tsx
  - src/components/ui/input.tsx
  - src/components/ui/label.tsx
  - src/components/ui/select.tsx
  - src/components/ui/skeleton.tsx
  - src/components/ui/sonner.tsx
  - src/components/ui/textarea.tsx
  - src/features/auth/AuthPage.tsx
  - src/features/auth/AuthProvider.tsx
  - src/features/book/AddBookPage.tsx
  - src/features/book/AddCopyPage.tsx
  - src/features/book/BookFormFields.tsx
  - src/features/book/CopyDetailPage.tsx
  - src/features/book/CopyHero.tsx
  - src/features/book/DeleteCopyDialog.tsx
  - src/features/book/DeleteWorkDialog.tsx
  - src/features/book/EditBookPage.tsx
  - src/features/book/NoteCard.tsx
  - src/features/book/SiblingsSection.tsx
  - src/features/book/WorkPicker.tsx
  - src/features/book/book-form.ts
  - src/features/book/note-autosave.ts
  - src/features/book/work-picker.ts
  - src/features/library/LibraryPage.tsx
  - src/features/library/queries.ts
  - src/i18n/index.ts
  - src/i18n/languages.ts
  - src/index.css
  - src/lib/avatar-initial.ts
  - src/lib/client-key.ts
  - src/lib/database.types.ts
  - src/lib/supabase.ts
  - src/lib/theme.ts
  - src/lib/utils.ts
  - src/lib/vocab.ts
  - src/main.tsx
  - supabase/.gitignore
  - supabase/config.toml
  - supabase/migrations/20260926120000_init_schema.sql
  - tests/integration/add-copy.test.ts
  - tests/integration/auth-config.test.ts
  - tests/integration/copy-detail.test.ts
  - tests/integration/edit-delete.test.ts
  - tests/integration/rls-isolation.test.ts
  - tests/integration/rpc.test.ts
  - tests/integration/schema.test.ts
  - tests/integration/tracer.test.ts
  - tests/setup/clients.ts
  - tests/setup/env.ts
  - tests/setup/schema-tables.ts
  - tests/unit/avatar-initial.test.ts
  - tests/unit/book-form.test.ts
  - tests/unit/check-secrets.test.ts
  - tests/unit/client-key.test.ts
  - tests/unit/i18n.test.ts
  - tests/unit/migrations-rls.test.ts
  - tests/unit/note-autosave.test.ts
  - tests/unit/theme.test.ts
  - tests/unit/tokens.test.ts
  - tests/unit/vocab.test.ts
  - tests/unit/work-picker.test.ts
  - tsconfig.json
  - vite.config.ts
findings:
  critical: 0
  warning: 8
  info: 7
  total: 15
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-10-02
**Depth:** standard
**Files Reviewed:** 79
**Status:** issues_found

## Summary

The migration, RLS policies, invoker-rights RPCs, ownership trigger and secret-scanning pipeline are sound. I traced the cross-tenant paths (forged `user_id`, moving a copy under a foreign work, anon RPC calls, existence oracle through the trigger) and found no isolation break. The `delete_copy` serialisation (`FOR UPDATE` on the parent work against the FK `KEY SHARE` lock of a concurrent insert) holds. The note-autosave state machine is correct for the single-flight and trailing-save cases it models.

The defects are in client behaviour around failure paths and scale. A failed sign-out leaves the user signed in with no feedback. The library list silently truncates at 1000 rows, which breaks the app's core promise ("do I own this book?") for large libraries. Note autosave can lose data silently on unmount, and it can race the edit form's pre-fill. The static RLS gate only proves that policies exist, not that they are scoped. The server-side schema is looser than the client form claims. There are no Critical issues.

## Warnings

### WR-01: signOut() ignores the error result, so a failed logout leaves the user signed in with no feedback

**File:** `src/features/auth/AuthProvider.tsx:69-77`
**Issue:** `supabase.auth.signOut()` returns `{ error }` rather than throwing. On a network failure (`AuthRetryableFetchError`), supabase-js returns the error and does not remove the local session. The code awaits the call and discards the result. The `finally` block clears the query cache, but `onAuthStateChange` never fires `SIGNED_OUT`, so the state stays `signedIn`. The user taps "Log out", the library silently refetches, and they are still logged in. On a shared or borrowed phone this is a privacy defect. The "Log out" action is also unverifiable for the user.
**Fix:**
```ts
const signOut = useCallback(async () => {
  explicitSignOut.current = true
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      // Server revoke failed (offline). Still end the session on this device.
      await supabase.auth.signOut({ scope: 'local' })
    }
  } finally {
    explicitSignOut.current = false
    queryClient.clear()
  }
}, [queryClient])
```

### WR-02: fetchLibrary has no pagination, and PostgREST max_rows (1000) silently truncates the library

**File:** `src/features/library/queries.ts:47-55` (also `supabase/config.toml:24`, `src/features/book/AddBookPage.tsx:44`)
**Issue:** `fetchLibrary` issues one unbounded select. Supabase caps responses at `max_rows = 1000` and returns the first 1000 rows with no error. A user with more than 1000 copies sees a truncated shelf. The count line ("N books · M works") and the work picker both read the same truncated array, so they are wrong in the same way. The project's core value is "a quick search must surface every copy you own", so a silent truncation is a correctness bug even if the author's own ~110 books never reach it. Phase 2 search will inherit the same array.
**Fix:** Page through the data with `.range(from, to)` until a page returns fewer than the page size, or use `count: 'exact'` and assert `data.length === count`.
```ts
const PAGE = 1000
const rows: LibraryCopy[] = []
for (let from = 0; ; from += PAGE) {
  const { data, error } = await client.from('copies').select(LIBRARY_SELECT)
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(from, from + PAGE - 1)
  if (error) throw error
  rows.push(...(data as unknown as LibraryCopy[]))
  if (data.length < PAGE) break
}
return rows
```

### WR-03: Note autosave drops the user's text silently when the unmount flush fails

**File:** `src/features/book/NoteCard.tsx:37-41`, `src/features/book/note-autosave.ts:32-34,87-99`
**Issue:** The effect cleanup calls `controller.flush()` and then `controller.dispose()`. `dispose()` sets `disposed = true`, and `report()` becomes a no-op. If that last save rejects (offline, expired session, copy deleted in another tab), `settle(false)` reports nothing and the `toast.error` in `onState` never fires. The component is gone and the text is gone, so the user leaves the page believing the note was saved. In-flight and failed saves during normal editing do surface an error, so this path is the only silent one.
**Fix:** Let the controller report a terminal failure after disposal through a separate callback that does not go through the component's state. For example, add an `onFinalError` option and call it from `settle(false)` when `disposed`, wired in `NoteCard` to `toast.error(...)`.

### WR-04: EditBookPage pre-fill can race an in-flight note save, and saving the form then overwrites the new note with the old one

**File:** `src/features/book/EditBookPage.tsx:158-163,89-92`, `src/features/book/NoteCard.tsx:21-43`
**Issue:** On the detail page the user types a note, then taps "Edit". The textarea blur flushes, and the UPDATE starts. Navigation mounts `EditBookPage` with `refetchOnMount: 'always'`, so a SELECT of the same copy starts immediately and concurrently. Under read-committed isolation the SELECT can return the old note, and the form is pre-filled from it. `updateCopy` always sends `note` as part of the payload (`queries.ts:237-242`), so submitting the edit form writes the stale note back over the new one. The `dataUpdatedAt < mountedAt` guard does not help, because the stale response is fetched after mount. The window is narrow, but it silently destroys user text on a flow that touches no unusual state.
**Fix:** Do not send `note` from the edit form unless the user changed it (compare to `formState.dirtyFields.note`). Alternatively, await the autosave's in-flight promise before navigating to Edit. The first option is simpler: in `toUpdateCopyInput` for the edit path, omit `note` when it is not dirty.

### WR-05: AuthPage state leaks between /login and /signup because the same component instance is reused

**File:** `src/app/router.tsx:54-55`, `src/features/auth/AuthPage.tsx:50-66`
**Issue:** Both routes render `<AuthPage mode=...>` as siblings under `PublicOnly`. React Router renders them at the same position with the same component type, so `AuthPage` is not remounted when the user follows the "log in" or "sign up" link. `useForm` state (typed values, validation errors, a `server` error such as "email already exists") and `formError` survive the switch. The visible symptom is an "email already registered" error that stays on the login form after the user follows the "log in" link, and a "wrong password" error that follows the user to the signup form. The `useMemo` schema changes, but errors already stored in RHF do not reset.
**Fix:** Give each route its own identity: `<AuthPage key="signup" mode="signup" />` and `<AuthPage key="login" mode="login" />`.

### WR-06: No Content-Security-Policy while the Supabase session (including the refresh token) lives in localStorage

**File:** `netlify.toml:19-25`
**Issue:** The site sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`, but no CSP. `persistSession: true` (`supabase.ts:27`) stores the access and refresh tokens in localStorage, where any injected script can read them. Today no `dangerouslySetInnerHTML` or `innerHTML` is used, so there is no known sink. A later phase will render remote cover URLs and imported spreadsheet text, which makes a CSP the standard defence-in-depth layer. The inline boot script in `index.html` will need a hash or nonce, so it is cheaper to decide this now than after more inline code lands.
**Fix:** Add a CSP header, for example:
```toml
Content-Security-Policy = "default-src 'self'; script-src 'self' 'sha256-<hash of the index.html boot script>'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://covers.openlibrary.org; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
```
Adjust `img-src` and `connect-src` as the cover and metadata phases land.

### WR-07: Database constraints are weaker than the client validation they are documented to mirror

**File:** `supabase/migrations/20260926120000_init_schema.sql:22,29,55-56`, `src/features/book/book-form.ts:13-24`
**Issue:** `book-form.ts` states "Limits mirror the database CHECK constraints". They do not:
- `authors` is checked for element count (<= 20) only. Element length (client: 200) is unbounded, and elements can be NULL or blank (`{NULL}` or `{''}`). `matchWorks` calls `fold(author)` on every element (`work-picker.ts:36`), so a NULL element would throw in the picker (for example from a future import or a direct API call).
- `copies.cover_url` has no length or scheme check. Phase 4 will put it in `<img src>` and, if misused, `<a href>`.
- `copies.volume_coverage` is an unconstrained `numeric[]` (NULLs, negatives, unbounded length).

A tenant can only damage their own rows, so this is not a cross-user issue. It does mean the server does not enforce the invariants the UI assumes. A one-way-door schema is the cheapest time to fix this.
**Fix:** Add constraints in a new migration, for example:
```sql
alter table public.works add constraint works_authors_valid check (
  not exists (select 1 from unnest(authors) a where a is null or char_length(btrim(a)) not between 1 and 200)
);
alter table public.copies add constraint copies_cover_url_check check (
  cover_url is null or (char_length(cover_url) <= 2048 and cover_url ~* '^https://')
);
```
`unnest` is not allowed in a CHECK subquery, so use an immutable helper function or validate in `create_work_with_copy`. Add a `cardinality(volume_coverage) <= 50` check to `volume_coverage` at the same time.

### WR-08: The AUTH-07 static RLS gate proves that policies exist, not that they are scoped to the owner

**File:** `tests/setup/schema-tables.ts:91-99`, `tests/unit/migrations-rls.test.ts:130-135`
**Issue:** `tableSecurity()` records which commands have a policy and nothing about the predicate. The test at `migrations-rls.test.ts:63-72` and the synthetic cases use `using (true)` and still expect the gate to pass the "policies" check (`['delete','insert','select','update']`). A future migration that adds `create policy ... for select to authenticated using (true)` on a new table passes the unit gate. Only the hand-maintained integration matrix (which a new table must be added to by hand) would catch it, and only if its author remembers the same check. The gate's name overstates what it guarantees.
**Fix:** Extend the parser to capture each policy's `using` and `with check` text and require that it references `auth.uid()` and `user_id` (or an explicit allow-list comment for intentionally public tables). Add a synthetic test where `using (true)` must fail.

## Info

### IN-01: Deep links lose their destination after login

**File:** `src/app/router.tsx:24-29`
**Issue:** `RequireAuth` redirects to `/login` with `replace` and no `state.from`. Opening a copy link while signed out (the "pull it up on my phone" scenario) lands on the library after login instead of on the copy.
**Fix:** Pass `state={{ from: location }}` in the `<Navigate>` and have `AuthPage` navigate to `from?.pathname ?? '/'`. Validate that `from` is an in-app path.

### IN-02: Work picker offers no suggestions while the library is loading or failed, so a duplicate can be created silently

**File:** `src/features/book/AddBookPage.tsx:44-45`
**Issue:** `works` is computed from `library.data ?? []`. While the query is pending or in error, the picker is silently empty and the user can create a second work for a book they already own, which is exactly what the app exists to prevent. There is no loading or error indication in the Title field.
**Fix:** Disable the submit button, or show a short hint, while `library.isPending || library.isError` on the add form.

### IN-03: AddCopyPage "Cancel" uses navigate(-1), which leaves the app on a direct load

**File:** `src/features/book/AddCopyPage.tsx:125`
**Issue:** When the page is opened directly (a bookmark or a refresh), history has no in-app entry, so `navigate(-1)` leaves the app or does nothing.
**Fix:** Navigate to `/kitap/<id>` or `/` explicitly, or fall back to `/` when `window.history.state?.idx === 0`.

### IN-04: The SPA catch-all rewrite combined with the immutable cache header can cache HTML under a stale asset URL

**File:** `netlify.toml:14-31`
**Issue:** `/*` rewrites to `/index.html` with status 200. The `/assets/*` rule sets `Cache-Control: immutable, max-age=1y`. A request for an old hashed asset after a deploy (an open tab, a stale cached HTML) returns `index.html` with a 200 and a one-year immutable header. That URL is never reused, so the damage is bounded, but a lazy chunk load in an old tab will fail with a confusing "unexpected token <" error rather than a 404.
**Fix:** Add `[[redirects]] from = "/assets/*" to = "/assets/:splat" status = 404 force = true`, or similar, before the catch-all so missing assets 404.

### IN-05: check-secrets covers fewer file types and edge cases than its name suggests

**File:** `scripts/check-secrets.mjs:15,136-139`
**Issue:**
- `SCANNED_EXTENSIONS` omits `.txt`, `.svg`, `.webmanifest`, `.xml`, and extensionless files. A secret in one of these under `dist/` is not scanned.
- In history mode, the current file is taken from `--- a/` and `+++ b/` headers. A deleted file reports `+++ /dev/null`, so the file attribution carries over from the previous diff.
- The JWT role check only matches `service_role`. A `sb_secret_` key shorter than 10 characters is ignored (acceptable).

None of these reduce the current protection of the Vite output (JS, HTML, CSS, maps).
**Fix:** Scan every file under the output directory (skip binary by extension), and handle `+++ /dev/null` by setting `file` from the `--- a/` line.

### IN-06: The integration-test prod guard compares the URL substring only

**File:** `tests/setup/env.ts:37-42`
**Issue:** The guard refuses when `TEST_SUPABASE_URL` contains the prod project ref. A custom domain or proxy URL pointing at prod passes. The tests then call `auth.admin.createUser`, `deleteUser` and `sweepTestUsers()`, which deletes every `ayrac-test+*` account, with the service-role key. The risk is low (a developer would have to put a prod key in the test env file), but the guard's own comment claims it makes this impossible.
**Fix:** Also verify that the service-role key's JWT `ref` claim (or the anon key's) does not equal the prod ref, and document the custom-domain limitation.

### IN-07: Small dead-code and robustness items

**File:** `src/lib/client-key.ts:28-30`, `src/features/auth/AuthProvider.tsx:47-49`
**Issue:**
- `assertClientSafeKey` checks `!key` and throws, but `supabase.ts:18` already rejects a missing key first, so the branch is reachable only from tests.
- `supabase.auth.getSession().then(...)` has no `.catch`. If it ever rejects (for example corrupted storage), the app stays on the `loading` spinner forever with an unhandled rejection.
**Fix:** Add `.catch(() => { if (active) apply(null) })` after the `then`, and drop the duplicate missing-key branch or the one in `supabase.ts`.

---

_Reviewed: 2026-10-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
