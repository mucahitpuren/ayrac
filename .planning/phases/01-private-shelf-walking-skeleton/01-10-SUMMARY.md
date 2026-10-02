---
phase: 01-private-shelf-walking-skeleton
plan: 10
subsystem: ui
tags: [react, tanstack-query, supabase, react-hook-form, i18n, combobox, tdd, add-copy]

requires:
  - phase: 01-private-shelf-walking-skeleton
    provides: "01-04 libraryKeys/fetchLibrary; 01-06 copies trigger + RLS; 01-08 add-book form, CopyFields/WorkFields; 01-09 copy detail page, siblings section, copyKeys, isUuid"
provides:
  - "/eser/:workId/nusha-ekle: copy-only form that attaches a new copy to an existing work and opens the new copy's page"
  - "Dashed 'Yeni nüsha ekle' card as the last card of the siblings section"
  - "Title-field work picker on /kitap/yeni: up to 5 of the user's own works, picking switches the form to 'add a copy to this work'"
  - "queries.ts: fetchWorkSummary, addCopyToWork, workKeys, invalidateCopyQueries"
  - "work-picker.ts: summarizeWorks, matchWorks (Turkish-locale substring, scoped gap pinned by tests)"
  - "book-form.ts: toAddCopyInput, copyOnlyResolver; BookFormFields.tsx: WorkContext, CopyFields autoFocusFormat, WorkFields picker prop"
affects: [01-11, phase-02-search, phase-02-duplicate-warning]

plan_head_before: 06961bd53403f8671aebef8063f48b173415ea90
actuals:
  tokens: 10140
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Copy-only forms reuse CopyFields on the full form's value type and swap the zod resolver (copyOnlyResolver); react-hook-form re-reads resolver on every render, so the schema follows the pickedWork state"
    - "Combobox is a render-prop wrapper (WorkPicker) that hands role/aria/keyboard props to the existing Title input; closed-state and highlighted row are stored per query text so typing reopens the list without effects"
    - "A mutation that changes copy counts invalidates by prefix: library, every copy detail, every work header (invalidateCopyQueries)"

key-files:
  created:
    - src/features/book/AddCopyPage.tsx
    - src/features/book/WorkPicker.tsx
    - src/features/book/work-picker.ts
    - tests/unit/work-picker.test.ts
    - tests/integration/add-copy.test.ts
  modified:
    - src/features/library/queries.ts
    - src/features/book/book-form.ts
    - src/features/book/BookFormFields.tsx
    - src/features/book/AddBookPage.tsx
    - src/features/book/SiblingsSection.tsx
    - src/app/router.tsx
    - src/i18n/locales/tr.json
    - src/i18n/locales/en.json

key-decisions:
  - "The copy insert sends work_id and copy fields only; user_id comes from the invoker-rights trigger, so a foreign or unknown work fails with 'work not found' and RLS WITH CHECK is a second wall"
  - "fetchWorkSummary returns null for malformed ids without a request and for works RLS hides, so a foreign id and a missing id share one not-found screen (no existence oracle)"
  - "Picker matching stays simple per D-09: toLocaleLowerCase('tr') substring, no ASCII folding; 'isik' not matching 'Işık' is pinned by a unit test so Phase 2 must change it knowingly"
  - "Enter is only swallowed while a suggestion is highlighted; otherwise it submits the form, and Escape only acts while the list is open"
  - "Cancel on the add-copy page goes back in history instead of linking to a guessed route, because the page only knows the work id, not a copy page"

patterns-established:
  - "Read-only work display is one component (WorkContext) used by the picked-work summary; the add-copy page shows the title in its heading and the authors beneath"
  - "Integration tests for new PostgREST paths run against dev with throwaway users and a sweep in afterAll"

requirements-completed: [LIB-02, ADD-02]

coverage:
  - id: D1
    description: "A copy attached to a work with n copies results in n+1 copies under the same work_id, the work row is unchanged, the library shows one work with two tiles, and the work summary count goes 1 -> 2"
    requirement: LIB-02
    verification:
      - kind: integration
        ref: "tests/integration/add-copy.test.ts#attaches a second copy to the same work without touching the work"
        status: pass
      - kind: integration
        ref: "tests/integration/add-copy.test.ts#summarises the work with its copy count"
        status: pass
    human_judgment: false
  - id: D2
    description: "A malformed id, an unknown id and another account's work resolve to not-found, and inserting a copy under a foreign or unknown work is rejected by the database"
    requirement: LIB-02
    verification:
      - kind: integration
        ref: "tests/integration/add-copy.test.ts#returns null for a malformed id, an unknown id and another account's work"
        status: pass
      - kind: integration
        ref: "tests/integration/add-copy.test.ts#refuses to attach a copy to another account's work or an unknown work"
        status: pass
    human_judgment: false
  - id: D3
    description: "Picker matching: groups copies per work with a copy count, case-insensitive substring on title and authors, title-prefix first, 'istanbul' finds 'İstanbul', 'ışık' finds 'Işık', 'isik' does not find 'Işık', fewer than 2 characters shows nothing, cap of 5"
    requirement: ADD-02
    verification:
      - kind: unit
        ref: "tests/unit/work-picker.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "tr and en catalogs keep identical key sets after adding book.addCopy.*, book.detail.addCopy and book.picker.*; build, lint, typecheck and the full unit suite pass; Vite serves every new module, /eser/<id>/nusha-ekle and /kitap/yeni with HTTP 200"
    requirement: ADD-02
    verification:
      - kind: other
        ref: "npm run build && npm run lint && npm run typecheck && npm run test:unit (143 passed)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Add-copy flow in a browser: 'Yeni nüsha ekle' on 1984 opens the copy-only form with Format focused, saving lands on the new copy's page with 'Bu eserden 2 nüshan var' and both sibling cards, the library shows two 1984 tiles, and a random UUID shows the not-found message; skeleton header/fields at final size while the work loads, no submit button until it resolves"
    requirement: LIB-02
    verification: []
    human_judgment: true
    rationale: "Navigation, focus on mount and skeleton sizing need a browser; no browser automation exists in this phase's stack. The data path and not-found rules are proven by D1 and D2"
  - id: D6
    description: "Title-field picker in a browser: typing '198' shows '1984 — George Orwell · 1 nüsha', ArrowDown + Enter picks it, the work section locks into a read-only summary, the submit reads 'Nüshayı kaydet', saving opens a copy page with 'Bu eserden 2 nüshan var' and no second 1984 work exists; Escape closes the list; 'Başka eser seç' restores editable fields with the typed title kept; options are 44px tall and the combobox is announced correctly by a screen reader"
    requirement: ADD-02
    verification: []
    human_judgment: true
    rationale: "Combobox focus behaviour, keyboard interaction and screen-reader semantics need a real browser and assistive technology; the matching rules are proven by D3 and the copy-only save path by D1"

duration: 9min
completed: 2026-10-02
status: complete
---

# Phase 1 Plan 10: Add a copy to an existing work Summary

**A second copy of a book now attaches to its existing work from the dashed 'Yeni nüsha ekle' card on the detail page (/eser/:workId/nusha-ekle) or by picking the work from Turkish-locale suggestions under the Title field of the add form, instead of creating a duplicate work**

## Performance

- **Duration:** about 9 min
- **Started:** about 2026-10-02T11:34:00Z (start time not captured; estimated from the first tool call)
- **Completed:** 2026-10-02T11:43:00Z (last task commit)
- **Tasks:** 3
- **Files modified:** 13 (5 created, 8 modified)

## Accomplishments
- `fetchWorkSummary` returns the work with a `copies(count)` embed, `null` without a request for a non-UUID id and `null` for works RLS hides. `addCopyToWork` inserts `work_id` plus copy fields (never `user_id`) and returns the new copy id.
- `AddCopyPage`: centered card, heading `"{work}" için yeni nüsha` with the authors beneath, `CopyFields` with Format focused on mount, copy-only validation, `Nüshayı kaydet` with loading, generic error above submit that keeps the values. While the work loads the header and fields are Skeleton blocks and no submit button exists. Success invalidates library, copy and work queries by prefix and opens `/kitap/<newCopyId>`.
- `SiblingsSection` ends with a dashed card (Phosphor `Plus`, `Yeni nüsha ekle`, 44px+ hit area, focus ring) linking to the add-copy route.
- TDD for the matching logic: RED `1247aa6` (6 of 8 fail on assertions against a stub; the two negative cases pass against the stub by nature), GREEN `3b851b5` (8 pass; unit suite 143).
- `WorkPicker`: Title input becomes `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-activedescendant`; listbox of at most 5 options, each 44px+, `book.picker.suggestion` with `_one/_other`; ArrowUp/Down wrap, Enter picks only while a row is highlighted, Escape closes, blur closes, 150ms debounce, works come from the cached library query.
- `AddBookPage`: picking locks the work fields into a read-only summary (title, authors, genre label, series) with a ghost `Başka eser seç` button; the form validates `copyFieldsSchema` only and submits through `addCopyToWork`; clearing restores the editable fields with the typed title intact. Not picking keeps the original `createWorkWithCopy` flow.
- An integration test on dev (4 tests) proves the summary and count, not-found for malformed/unknown/foreign ids, n+1 copies under one work with the work unchanged, and database refusal for a foreign or unknown work.

## Task Commits

1. **Task 1: Add a copy from the detail page** - `e881baf` (feat)
2. **Task 2: Work-picker matching (TDD)**
   - RED: `1247aa6` (test) - failing tests against a stub
   - GREEN: `3b851b5` (feat) - matching implementation
3. **Task 3: Title-field suggestions on the add form** - `33bd36e` (feat)

**Plan metadata:** committed separately (docs: complete plan).

_`commits: 4` in the frontmatter is the measured `git rev-list --count 06961bd..HEAD` before the metadata commit._

## Files Created/Modified
- `src/features/library/queries.ts` - `fetchWorkSummary`, `addCopyToWork`, `workKeys`, `copyKeys.all`, `invalidateCopyQueries`
- `src/features/book/book-form.ts` - `toAddCopyInput`, `CopyFormValues`, `copyOnlyResolver`
- `src/features/book/AddCopyPage.tsx` - `/eser/:workId/nusha-ekle`
- `src/features/book/SiblingsSection.tsx`, `src/app/router.tsx` - dashed card and route
- `src/features/book/work-picker.ts`, `tests/unit/work-picker.test.ts` - matching logic and its tests
- `src/features/book/WorkPicker.tsx` - combobox/listbox
- `src/features/book/BookFormFields.tsx` - `WorkContext`, `autoFocusFormat`, `picker` prop on `WorkFields`
- `src/features/book/AddBookPage.tsx` - picked-work mode
- `src/i18n/locales/tr.json`, `en.json` - `book.addCopy.*`, `book.detail.addCopy`, `book.picker.*`
- `tests/integration/add-copy.test.ts` - dev data path

## Decisions Made
See `key-decisions` above. The one that matters for Phase 2: `matchWorks` is the single spot to swap for the shared normalize module, and the `'isik'` test must be flipped when that happens.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Integration test for the add-copy data path**
- **Found during:** Task 1
- **Issue:** The plan lists only build/lint/unit checks, but the `copies(count)` embed, the insert without `user_id` and the foreign-work rejection (T-01-10-01, T-01-10-03) were new PostgREST behaviour that no test exercised.
- **Fix:** added `tests/integration/add-copy.test.ts`, run on the dev project with throwaway users (deleted afterwards, sweep in `afterAll`).
- **Files modified:** `tests/integration/add-copy.test.ts`
- **Verification:** `npm run test:integration -- tests/integration/add-copy.test.ts` (4 passed)
- **Committed in:** `e881baf`

**2. [Process] Shared pieces placed outside the plan's file list**
- **Issue:** the add-copy page and the picked-work summary both need a read-only work view, the add-copy page needs Format autofocus, and the picker needs to attach to the Title input that lives in `WorkFields`.
- **Fix:** `WorkContext`, `autoFocusFormat` and a `picker` prop were added to `BookFormFields.tsx`; `copyOnlyResolver`/`CopyFormValues` to `book-form.ts`. No new files beyond the plan, no new dependencies.
- **Files modified:** `src/features/book/BookFormFields.tsx`, `src/features/book/book-form.ts`
- **Committed in:** `e881baf`, `33bd36e`

**3. [Process] Acceptance grep for `copyFieldsSchema` in `AddBookPage.tsx` is met by a comment only**
- **Issue:** the schema is wrapped once in `book-form.ts` (`copyOnlyResolver`) and shared by both pages rather than being re-wrapped in each page, so the literal identifier appears in `AddBookPage.tsx` only in a comment. Behaviour is what the criterion asks for: the picked-work submit validates the copy fields only.
- **Committed in:** `33bd36e`

---

**Total deviations:** 3 (1 Rule 2, 2 process notes)
**Impact on plan:** No scope or dependency change; `package.json` and the lockfile are untouched and no shadcn CLI was run.

## TDD Gate Compliance

The plan is `type: execute` with one `tdd="true"` task, so the plan-level gate does not apply. Task 2 has a `test(01-10)` RED commit (`1247aa6`) followed by a `feat(01-10)` GREEN commit (`3b851b5`). In RED the two negative cases (`'isik'` and the under-2-characters case) pass against the stub because they only assert an empty result; the other 6 fail on assertions for the planned behaviour, not on import or syntax errors.

## Issues Encountered
- Backticks inside `node -e "..."` shell strings were eaten by Git Bash three times (template literals for `/eser/${...}`, `genre.${...}` and `/kitap/${...}`), leaving empty `to={}`, `t()` and `navigate()` calls. Each was caught by the typecheck or a read-back and fixed with the Edit tool before any commit.
- A background `python3` call hung on this machine (Windows app-alias) and was abandoned; the edit was redone with the Edit tool.
- `npm run build` still warns about the ~990 kB main chunk (known follow-up from 01-04/01-05/01-08/01-09).
- LF/CRLF warnings on commit are git `autocrlf` notices only.
- No browser was available, so D5 and D6 are left for the end-of-phase human checks. A throwaway Vite server on port 5199 returned HTTP 200 for every new module, `/eser/abc/nusha-ekle` and `/kitap/yeni`; it was stopped afterwards.

## User Setup Required

None - no external service configuration required.

**Open for the user (plan human checks, not yet run):**
1. `npm run dev`; open "1984" (one copy), tap "Yeni nüsha ekle", choose Grafik Roman, save. Expect "Bu eserden 2 nüshan var" with both cards and two 1984 tiles in the library. Open `/eser/<random-uuid>/nusha-ekle` and expect the not-found message.
2. On `/kitap/yeni` with "1984 — George Orwell" in the library: type "198", pick the suggestion with ArrowDown + Enter, choose Grafik Roman, save. Expect "1984 — George Orwell · 1 nüsha", a locked work section, "Nüshayı kaydet", and "Bu eserden 2 nüshan var" with no second 1984 work. Then type "orw" and press Escape (list closes), pick again and use "Başka eser seç" (editable fields return with the typed title). Check with a screen reader if available.

## Known Stubs

None.

## Threat Flags

None. The new surface is the plan's threat model: T-01-10-01 (insert carries `work_id` only; integration test shows a foreign and an unknown work are refused), T-01-10-02 (the picker reads only the RLS-scoped cached library; no cross-user query exists) and T-01-10-03 (UUID check returns null without a request; unit-free, covered by the integration test) are mitigated as planned.

## Next Phase Readiness
- Ready for 01-11 (publish): no new env vars or packages.
- Phase 2: `matchWorks` in `src/features/book/work-picker.ts` is where the shared normalize module and ADD-03's duplicate warning plug in; the Phase 1 limitation test (`'isik'` vs `Işık`) must be changed consciously then.

## Self-Check: PASSED

All 13 plan files exist on disk and commits `e881baf`, `1247aa6`, `3b851b5` and `33bd36e` are in `git log`. Re-run results: `npm run test:unit` (143 passed), `npm run build`, `npm run lint` and `npm run typecheck` exit 0; `npm run test:integration -- tests/integration/add-copy.test.ts` (4 passed on dev). Acceptance greps hold: `queries.ts` exports `addCopyToWork` and its insert payload has no `user_id` property; `SiblingsSection.tsx` has `border-dashed` and `nusha-ekle`; `router.tsx` has `/eser/:workId/nusha-ekle`; `work-picker.ts` has `toLocaleLowerCase('tr')` and no Supabase import; `AddBookPage.tsx` has `pickedWork` and `addCopyToWork(supabase` (copy-only schema via `copyOnlyResolver`, see deviation 3); `WorkPicker.tsx` has `role="listbox"`, `aria-activedescendant` and `matchWorks(`. `package.json`/`package-lock.json` unchanged and `git status --porcelain` lists no `.env.*.local` file.

---
*Phase: 01-private-shelf-walking-skeleton*
*Completed: 2026-10-02*
