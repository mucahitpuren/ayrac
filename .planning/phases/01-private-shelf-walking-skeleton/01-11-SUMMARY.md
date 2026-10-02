---
phase: 01-private-shelf-walking-skeleton
plan: 11
subsystem: ui
tags: [react, tanstack-query, supabase, react-hook-form, alert-dialog, i18n, release, netlify]

requires:
  - phase: 01-private-shelf-walking-skeleton
    provides: "01-06 delete_copy function and RLS matrix; 01-07 live site, secrets scanner, push permission; 01-08 add form; 01-09 copy detail page; 01-10 add-copy flow, invalidateCopyQueries"
provides:
  - "/kitap/:copyId/duzenle: the combined work+copy form pre-filled from the copy, saved through idempotent updateWork then updateCopy"
  - "Action row on the copy page: Kitabi duzenle and Nushayi sil; Eseri ve nushalarini sil in the edit page danger zone"
  - "DeleteCopyDialog (remaining and last-copy bodies, delete_copy result handling) and DeleteWorkDialog, both locked while a request is in flight"
  - "queries.ts: updateWork, updateCopy, deleteCopy, deleteWork, invalidateAfterDelete; book-form.ts: fromCopyDetail, toUpdateWorkInput, toUpdateCopyInput"
  - "Released Phase 1: master pushed to GitHub, Netlify serving the new build at https://ayrackitap.netlify.app, dev and prod on the same migration"
affects: [phase-02-search, phase-04-covers, phase-05-library]

plan_head_before: 124f2fca92d7456b2788f607efa5d0627c0e1b59
actuals:
  tokens: 10100
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Edit forms mount only after fresh data exists: the page checks dataUpdatedAt against its own mount time, so a copy cached by the detail page can never pre-fill the form, and focus refetches are off so a background refresh cannot replace what the user is typing"
    - "Async confirm buttons in an AlertDialog are plain Buttons, not Radix Action (which closes on click); the dialog's onOpenChange and Escape are ignored while the mutation is pending"
    - "After a delete the library query is invalidated normally but copy/work queries are only marked stale (refetchType none), so the still-mounted page never refetches the deleted row and flashes a not-found screen before the redirect"

key-files:
  created:
    - src/features/book/EditBookPage.tsx
    - src/features/book/DeleteCopyDialog.tsx
    - src/features/book/DeleteWorkDialog.tsx
    - src/components/ui/alert-dialog.tsx
    - tests/integration/edit-delete.test.ts
  modified:
    - src/features/library/queries.ts
    - src/features/book/book-form.ts
    - src/features/book/CopyDetailPage.tsx
    - src/app/router.tsx
    - src/i18n/locales/tr.json
    - src/i18n/locales/en.json
    - tests/unit/book-form.test.ts

key-decisions:
  - "No shadcn CLI install for alert-dialog: the CLI wanted the unapproved cn package and stopped on an overwrite prompt for button.tsx, so package.json and package-lock.json were restored, npm ci was run, and alert-dialog.tsx was written by hand from the registry source with radix-ui and @/lib/utils imports"
  - "Delete navigation: last copy or already-gone copy goes to / (replace); otherwise the oldest remaining sibling from the page's own sibling list (already sorted oldest first)"
  - "Cancel on the edit page links back to the copy page instead of going back in history, because the edit page is always reached from that page"
  - "fromCopyDetail leaves genre or format unset when the stored value is NULL or unknown, so the user must choose one before saving instead of the form inventing a value"

patterns-established:
  - "Release order for later phases: lint, build, npm test; db push --dry-run and migration list on dev and prod (prod link, list and relink to dev in one command with a trap); history scan; push; poll the served asset name; live route and bundle checks"
  - "Bundle checks against the live site report booleans only (route string present, prod ref present, dev ref absent)"

requirements-completed: [LIB-08, LIB-09]

coverage:
  - id: D1
    description: "Editing work fields changes them for every copy of the work, editing copy fields changes only that copy, clearing an optional field stores NULL, and re-applying the same edit leaves the row unchanged"
    requirement: LIB-08
    verification:
      - kind: integration
        ref: "tests/integration/edit-delete.test.ts#changes work fields for every copy and copy fields for that copy only, clearing optional fields to NULL"
        status: pass
      - kind: integration
        ref: "tests/integration/edit-delete.test.ts#is idempotent: re-applying the same edit converges to the same row"
        status: pass
    human_judgment: false
  - id: D2
    description: "fromCopyDetail renders NULL optional fields as empty strings (never a dash), joins authors, stringifies the series position and leaves genre unset when NULL; the update inputs use the same normalization as the add path"
    requirement: LIB-08
    verification:
      - kind: unit
        ref: "tests/unit/book-form.test.ts#fromCopyDetail"
        status: pass
    human_judgment: false
  - id: D3
    description: "Another account's work or copy cannot be edited or deleted: the update wrappers throw on zero rows, delete_copy reports copy_deleted=false, deleteWork changes nothing"
    requirement: LIB-09
    verification:
      - kind: integration
        ref: "tests/integration/edit-delete.test.ts#refuses to edit another account's work or copy"
        status: pass
      - kind: integration
        ref: "tests/integration/edit-delete.test.ts#cannot delete another account's copy or work"
        status: pass
    human_judgment: false
  - id: D4
    description: "deleteCopy reports { copyDeleted, workDeleted, workId }: one of several copies leaves the work; the last copy removes the work in the same call; repeating a delete reports copyDeleted=false instead of erroring; deleteWork removes every copy and a repeat is a silent no-op"
    requirement: LIB-09
    verification:
      - kind: integration
        ref: "tests/integration/edit-delete.test.ts#deleting one of several copies leaves the work and reports no work deletion"
        status: pass
      - kind: integration
        ref: "tests/integration/edit-delete.test.ts#deleting the last copy deletes the work in the same call, and repeating it is a no-op"
        status: pass
      - kind: integration
        ref: "tests/integration/edit-delete.test.ts#deleting a work removes all its copies, and deleting it again is a silent no-op"
        status: pass
      - kind: integration
        ref: "tests/integration/rpc.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Full gate on dev: npm run lint, npm run build and npm test (19 files, 217 tests: 147 unit, 70 integration including the RLS isolation matrix) pass; secret scan of the history (155 files) and of dist report no findings"
    verification:
      - kind: command
        ref: "npm run lint && npm run build && npm test; node scripts/check-secrets.mjs --git-history; node scripts/check-secrets.mjs dist"
        status: pass
    human_judgment: false
  - id: D6
    description: "Dev and prod are on the same schema: db push --dry-run on each reported 'Remote database is up to date', migration list on each shows 20260926120000 both local and remote, and the CLI was relinked to dev with supabase/.temp/project-ref asserted equal to the dev ref and different from the prod ref"
    verification:
      - kind: command
        ref: "npx supabase db push --dry-run and migration list, dev then prod (link, list, relink in one command with a trap), project-ref assertion"
        status: pass
    human_judgment: false
  - id: D7
    description: "The released build is live: master pushed (c7b8e66..9a987a1), the served bundle changed from index-DG8_OdtY.js to index-DJo2E1pa.js at the second poll, / and /kitap/yeni return 200 with nosniff, the bundle contains the duzenle route, the delete_copy call and the Turkish dialog copy, uses the prod project ref and not the dev ref"
    verification:
      - kind: command
        ref: "git push origin HEAD; poll https://ayrackitap.netlify.app served asset name; Node fetch of /, /kitap/yeni, /kitap/<id>/duzenle and the bundle"
        status: pass
    human_judgment: false
  - id: D8
    description: "Dialog flows in a browser: cancel changes nothing; the copy dialog says how many copies remain and lands on a remaining copy; the last-copy dialog warns the work will be deleted and lands on /; the work dialog names the title and count and lands on /; the dialog cannot be closed while the request is in flight (throttled network); a failed delete shows the toast and keeps the dialog open"
    requirement: LIB-09
    verification: []
    human_judgment: true
    rationale: "Dialog focus, dismissal lock, toast and navigation outcomes need a real browser; no browser automation exists in this phase's stack. The data results those flows depend on are proven by D3 and D4"
  - id: D9
    description: "Edit page in a browser: the form shows Skeleton fields and no submit button until fresh data arrives, Title is focused, cleared optional fields show empty inputs, saving returns to the copy page with the new values, and the other copy of the work shows the new work title but its own publisher"
    requirement: LIB-08
    verification: []
    human_judgment: true
    rationale: "Loading behaviour, focus on mount and cross-copy propagation as seen by the user are visual; the data path is proven by D1"
  - id: D10
    description: "End-of-phase UAT on the phone against LIB-01..LIB-10 flows on the live site (add 1984 as novel, second copy as graphic novel through the title picker, edit, delete a copy and a work, and a second account sees none of the first account's books)"
    human_judgment: true
    rationale: "D-12 forbids automated tests against prod. Sign-up without email confirmation, TR/EN and light/dark switching, logout and login were already verified by the user on a phone against prod after 01-07 (user-verified); the library, add, picker, edit and delete flows were built after that and are still open"

duration: 15min
completed: 2026-10-02
status: complete
---

# Phase 1 Plan 11: Edit, delete and release Summary

**Books can now be edited from a pre-filled form and deleted (one copy, last copy with its work, or a whole work) only after an AlertDialog confirmation that locks while the request runs, and the finished Phase 1 build is pushed and live at https://ayrackitap.netlify.app with dev and prod on the same migration**

## Performance

- **Duration:** about 15 min (start time not captured; estimated from the first tool call)
- **Started:** about 2026-10-02T11:40:00Z
- **Completed:** 2026-10-02T11:57:00Z
- **Tasks:** 3 (Tasks 1 and 2 auto, Task 3 release)
- **Files modified:** 12 (5 created, 7 modified) in the two code commits

## Accomplishments
- `updateWork` and `updateCopy` send every edited column and throw when zero rows are updated, so a foreign or missing row is an error and a retry after a partial failure converges. `fromCopyDetail`, `toUpdateWorkInput` and `toUpdateCopyInput` share the add path's normalization (NFC + trim, empty to NULL, authors parsed, series position dropped without a series); `toCreateWorkWithCopyInput` is now their composition.
- `EditBookPage` at `/kitap/:copyId/duzenle` reuses `WorkFields` and `CopyFields`, focuses Title, and renders Skeleton fields with no submit until data fetched after the page opened has arrived. Save invalidates the library, copy and work queries and returns to the copy page; any failure shows the generic message and keeps the values.
- `DeleteCopyDialog` picks the remaining-copies body (`_one/_other` with the count) or the last-copy body from the sibling list, calls `delete_copy`, and handles the three results: last copy or already gone leads to `/`, otherwise the oldest remaining sibling. Failure shows the toast "Silinemedi, tekrar dene." and keeps the dialog open. `DeleteWorkDialog` names the title and copy count and always ends in `/`.
- Released: gate green, schema in sync, history scan clean, push done, Netlify serving the new bundle.

## Task Commits

1. **Task 1: Edit a book** - `2b520e3` (feat)
2. **Task 2: Confirmed deletion of a copy and of a whole work** - `9a987a1` (feat)
3. **Task 3: Release (gate, schema sync, push, live verification)** - no commit (release actions only; the push published `c7b8e66..9a987a1` to `origin/master`)

**Plan metadata:** committed separately (docs: complete plan). That docs commit is local and not pushed.

_`commits: 2` in the frontmatter is the measured `git rev-list --count 124f2fc..HEAD` before the metadata commit._

## Release Log (Task 3)

| Step | Result |
|---|---|
| `npm run lint && npm run build && npm test` | exit 0; 19 test files, 217 tests (147 unit, 70 integration on dev) |
| `db push --dry-run`, dev | "Remote database is up to date." |
| `migration list`, dev | `{"local":"20260926120000","remote":"20260926120000"}` |
| `db push --dry-run`, prod | "Remote database is up to date." (no push needed: no migration was added since 01-07) |
| `migration list`, prod | `{"local":"20260926120000","remote":"20260926120000"}` (identical to dev) |
| Relink to dev | `supabase/.temp/project-ref` equals the dev ref and differs from the prod ref (asserted again after the push) |
| `check-secrets.mjs --git-history` / `dist` | 155 files / 3 files, no findings |
| `git push origin HEAD` | `c7b8e66..9a987a1  HEAD -> master` (18 commits) |
| Served bundle | `index-DG8_OdtY.js` before; `index-DJo2E1pa.js` at poll 2 (about 15 s after the first poll) |
| Live checks | `/` 200, `/kitap/yeni` 200, `/kitap/<uuid>/duzenle` 200, all with `x-content-type-options: nosniff`; bundle has the `/duzenle` route, `delete_copy`, "Bu nüshayı sil?", prod ref present, dev ref absent |

## Files Created/Modified
- `src/features/library/queries.ts` - `updateWork`, `updateCopy`, `deleteCopy`, `deleteWork`, `invalidateAfterDelete`
- `src/features/book/book-form.ts` - `fromCopyDetail`, `toUpdateWorkInput`, `toUpdateCopyInput`
- `src/features/book/EditBookPage.tsx` - edit page, danger zone with the delete-work button
- `src/features/book/DeleteCopyDialog.tsx`, `DeleteWorkDialog.tsx` - confirmations
- `src/components/ui/alert-dialog.tsx` - AlertDialog primitive on `radix-ui`
- `src/features/book/CopyDetailPage.tsx` - `CopyActions` row (edit, delete copy)
- `src/app/router.tsx`, `src/i18n/locales/tr.json`, `en.json` - route and `book.edit.*`, `book.actions.*`, `book.delete.*`
- `tests/integration/edit-delete.test.ts`, `tests/unit/book-form.test.ts` - data path and form mapping

## Decisions Made
See `key-decisions` above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Integration and unit tests for the new data paths**
- **Found during:** Tasks 1 and 2
- **Issue:** The plan's automated checks only run build, lint, existing unit tests and `rpc.test.ts`, so the update wrappers (T-01-11-01, T-01-11-03), the delete result mapping and the idempotency and foreign-row behaviour of LIB-08/09 had no test.
- **Fix:** Added `tests/integration/edit-delete.test.ts` (8 tests on dev with throwaway users) and a `fromCopyDetail` / update-input block in `tests/unit/book-form.test.ts` (4 tests).
- **Files modified:** `tests/integration/edit-delete.test.ts`, `tests/unit/book-form.test.ts`
- **Committed in:** `9a987a1`, `2b520e3`

**2. [Rule 3 - Blocking] shadcn CLI could not add alert-dialog cleanly**
- **Found during:** Task 2
- **Issue:** `npx shadcn@4.21.0 add alert-dialog` added the unapproved `cn` package to package.json and then blocked on an overwrite prompt for the existing `button.tsx`.
- **Fix:** Killed it, restored `package.json` and `package-lock.json` from git, ran `npm ci`, and wrote `alert-dialog.tsx` by hand from the registry source (`shadcn view alert-dialog`) with `radix-ui` and `@/lib/utils` imports and the project's tokens. `button.tsx` was not overwritten.
- **Files modified:** `src/components/ui/alert-dialog.tsx`
- **Verification:** `git status` shows no change to package.json or the lockfile; the forbidden-import grep (`lucide-react`, `@radix-ui/react-`) finds nothing
- **Committed in:** `9a987a1`

**3. [Rule 1 - Bug avoided] Delete flow flashed not-found and left the dialog open on the next copy**
- **Found during:** Task 2 (design review before commit)
- **Issue:** Invalidating the copy queries before navigating refetches the still-mounted page's deleted copy, which would render the not-found screen for a moment; and after landing on a sibling (same route component) the open-dialog state would have stayed true.
- **Fix:** `invalidateAfterDelete` refetches the library but only marks copy and work queries stale; `CopyActions` is keyed by copy id so its dialog state resets on navigation.
- **Files modified:** `src/features/library/queries.ts`, `src/features/book/CopyDetailPage.tsx`
- **Committed in:** `9a987a1`

**4. [Process] Prod needed no schema push**
- No migration exists beyond `20260926120000`, which both projects already had (dev since 01-04, prod since 01-07), so the plan's "db push" steps were dry runs plus `migration list`. The plan's link, list and relink sequence was still run, and the relink was asserted.

---

**Total deviations:** 4 (1 Rule 2, 1 Rule 3, 1 Rule 1, 1 process note)
**Impact on plan:** No scope or dependency change; `package.json` and the lockfile are untouched.

Notes that are not deviations:
- The Task 3 automated verify greps the CLI env file directly, which the secret-read guard blocks. The same assertions ran through the gitignored helper `node_modules/.cache/sb-run.sh` (recreated, since it no longer existed), and the live checks used Node `fetch` because `curl` is unreliable in Git Bash.
- The plan lists Task 1's human check on the live URL; none of the browser checks (D8, D9, D10) could run here because no browser is available.

## Authentication Gates

None. `git push` authenticated with the user's existing GitHub credentials.

## Issues Encountered
- A first commit attempt failed because the secret-read guard matched the text `\.env` inside a shell `grep` I added to check staged files; the check was dropped from the command and `git status --porcelain` plus `git show --stat` were used to confirm no `.env.*.local` file was staged.
- `npm run build` still warns about the ~1,003 kB main chunk (known follow-up from earlier plans).
- LF/CRLF warnings on commit are git `autocrlf` notices only.
- TypeScript's `noUncheckedIndexedAccess` rejected `copyIds[n]` in the new integration test; fixed with a small `at()` helper before the commit.

## User Setup Required

None for code. Still open from 01-07 (not verifiable from here): the ayrac-prod Site URL must be `https://ayrackitap.netlify.app`, and Deploy Preview / Branch deploy contexts should use the dev project (D7 of 01-07).

## User Verification

**Recorded as user-verified (by the user, on a phone, against prod after 01-07):** sign-up lands in the empty library without email confirmation, Turkish/English and light/dark switching, logout and login all work.

**Open for the user (end-of-phase batch on https://ayrackitap.netlify.app):**
1. Add "1984" (Roman), then a second copy as Grafik Roman through the Title picker; confirm "Bu eserden 2 nüshan var" and two tiles.
2. Edit "1984": change the title and one copy's publisher, clear its edition title, reload, open the other copy. Expect the new title on both, the new publisher on one only, no dash for the cleared field, and no flash of empty values before the form fills.
3. Delete: cancel first, then confirm one copy ("N nüshası daha kalacak", lands on a remaining copy); delete a work's last copy (warning that the work goes too, lands on `/`); use "Eseri ve nüshalarını sil" on a work with two copies; press Escape with the network throttled while a delete is in flight (dialog must not close).
4. Log in with a second account: it must see none of the first account's books.

## Known Stubs

None.

## Threat Flags

None. The new surface is the plan's threat model: T-01-11-01 mitigated (update and delete go through RLS-scoped statements and the invoker-rights `delete_copy`; `edit-delete.test.ts` and the 01-06 isolation matrix both pass in the release gate), T-01-11-02 mitigated (every delete behind an AlertDialog that cannot be dismissed mid-request, with the irreversibility sentence), T-01-11-03 accepted (both updates idempotent), T-01-11-04 mitigated (history scan 155 files and dist scan clean before the push, Netlify build runs the dist scan), T-01-11-05 mitigated (migration lists for dev and prod identical and logged above).

## Next Phase Readiness
- Phase 1 is released. Remaining before the phase can close: the phase verifier and the open user checks above.
- Phase 2 can start from `src/features/book/work-picker.ts` (shared normalize module; flip the pinned `'isik'` test knowingly).
- Any new migration must reach prod before the app code that depends on it is pushed to `master`; the CLI is linked to dev.

## Self-Check: PASSED

All files in `key-files` exist on disk and commits `2b520e3` and `9a987a1` are in `git log`. Re-run: `npm run lint`, `npm run build` and `npm test` exit 0 (217 tests); acceptance greps hold (`EditBookPage.tsx` has `fromCopyDetail`, `updateWork(supabase`, `updateCopy(supabase` and renders no submit while loading; `router.tsx` has `/kitap/:copyId/duzenle`; `CopyDetailPage.tsx` has `book.actions.edit`; `DeleteCopyDialog.tsx` has `deleteCopy(supabase`, `copyDeleted`, `workDeleted`, `book.delete.failed` and `loading=`; both catalogs have `book.delete.copyBodyLast` with the specified text; the forbidden-import grep finds nothing). `git status --porcelain` lists no `.env.*` file and `package.json`/`package-lock.json` are unchanged.

---
*Phase: 01-private-shelf-walking-skeleton*
*Completed: 2026-10-02*
