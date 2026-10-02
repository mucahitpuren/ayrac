---
phase: 01-private-shelf-walking-skeleton
plan: 08
subsystem: ui
tags: [react-hook-form, zod, radix-select, i18n, vocab, forms, tdd]

requires:
  - phase: 01-private-shelf-walking-skeleton
    provides: "01-04 createWorkWithCopy/libraryKeys, migration CHECK lists, LibraryPage, router; 01-05 AppShell and Phosphor/radix-ui conventions; 01-03 Button/Input/Label/Card"
provides:
  - "src/lib/vocab.ts: FORMAT_SLUGS and GENRE_SLUGS (as const), types and guards, mechanically tied to the migration CHECK lists and both catalogs by test"
  - "book-form.ts: normalizeText, emptyToNull, codePointLength, parseAuthors, workFieldsSchema, copyFieldsSchema, bookFormSchema, toCreateWorkWithCopyInput"
  - "FormField (label, control render function, helper, error), owned Select and Textarea primitives"
  - "WorkFields and CopyFields, reusable by the add-copy and edit forms (01-09)"
  - "/kitap/yeni AddBookPage saving through one create_work_with_copy call, with library header and empty-state entry points"
  - "genre.* (22 slugs), book.form.*, book.add.*, common.cancel, library.addBook, form.errors.tooLong/positiveInteger in tr and en"
affects: [01-09, 01-10, 01-11]

plan_head_before: 15e02fd6d61f1c45da43669ce92be46c94d586d8
actuals:
  tokens: 11745
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Zod messages are i18n keys; FormField translates them at render time"
    - "Text limits are counted in Unicode code points on the client to match Postgres char_length"
    - "Zod refinements are shared through a function applied to both the work-only and the merged schema, because merging shapes drops object-level checks"
    - "Selects are react-hook-form Controllers that forward field.ref to the trigger so focus-on-error works"

key-files:
  created:
    - src/lib/vocab.ts
    - tests/unit/vocab.test.ts
    - src/features/book/book-form.ts
    - tests/unit/book-form.test.ts
    - src/components/form-field.tsx
    - src/components/ui/select.tsx
    - src/components/ui/textarea.tsx
    - src/features/book/BookFormFields.tsx
    - src/features/book/AddBookPage.tsx
  modified:
    - src/features/library/LibraryPage.tsx
    - src/app/router.tsx
    - src/i18n/locales/tr.json
    - src/i18n/locales/en.json

key-decisions:
  - "Genre and format default to undefined in the form (not an empty string) so the BookFormValues type stays the zod input type; the Select shows its placeholder through value '' and the zod enum error carries form.errors.required"
  - "Series position is validated and kept only while a series name is present; a stale invalid position behind an emptied series name cannot block saving and is dropped"
  - "Series position is an HTML number input; RHF still hands it over as a string, so the schema parses it itself and rejects 0, decimals, negatives and anything above 9999"
  - "Genre options are sorted with localeCompare in the active language with 'other' pinned last, recomputed on language change"

patterns-established:
  - "Add and edit forms share WorkFields/CopyFields that take the react-hook-form instance"
  - "Every shadcn add is followed by restoring package.json and package-lock.json and rewriting the import of the unapproved cn package to @/lib/utils (third time: 01-03, 01-05, now)"

requirements-completed: [ADD-02, LIB-01, LIB-10]

coverage:
  - id: D1
    description: "FORMAT_SLUGS and GENRE_SLUGS equal the migration CHECK lists, every slug has a label in both catalogs, and there are no extra format./genre. keys"
    requirement: LIB-01
    verification:
      - kind: unit
        ref: "tests/unit/vocab.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Form validation rules: whitespace-only title and empty author list rejected as required, code point limits (title 500, authors 20 x 200, series/publisher 200, edition title 500, note 10000) counted like char_length, genre and format required slugs, series position integer 1..9999"
    requirement: LIB-01
    verification:
      - kind: unit
        ref: "tests/unit/book-form.test.ts#bookFormSchema"
        status: pass
    human_judgment: false
  - id: D3
    description: "parseAuthors trims, drops empties and dedupes with Turkish lowercasing keeping the first spelling; normalizeText composes to NFC; blank optionals map to NULL and a position without a series is dropped"
    requirement: LIB-01
    verification:
      - kind: unit
        ref: "tests/unit/book-form.test.ts#parseAuthors"
        status: pass
      - kind: unit
        ref: "tests/unit/book-form.test.ts#toCreateWorkWithCopyInput"
        status: pass
    human_judgment: false
  - id: D4
    description: "tr and en catalogs keep identical key sets after adding genre.*, book.*, library.addBook and the new form error keys"
    requirement: ADD-02
    verification:
      - kind: unit
        ref: "tests/unit/i18n.test.ts#locale catalogs"
        status: pass
    human_judgment: false
  - id: D5
    description: "Build, lint, full unit suite pass; no lucide-react or scoped @radix-ui imports; package.json and package-lock.json unchanged; Vite serves every new module and /kitap/yeni with HTTP 200"
    requirement: ADD-02
    verification:
      - kind: other
        ref: "npm run build && npm run lint && npm run test:unit && ! grep -rqE 'lucide-react|@radix-ui/react-' src"
        status: pass
    human_judgment: false
  - id: D6
    description: "Add form in a browser: Title autofocused, empty submit focuses Title with 'Bu alan zorunlu.' under Title, Yazar(lar), Tür and Format, a 600-character title shows 'Bu alan çok uzun.', Seri sırası appears only after typing a series name, double-click saves one book, a failed save keeps typed values and shows the generic error"
    requirement: ADD-02
    verification: []
    human_judgment: true
    rationale: "Focus management, Radix Select behaviour and layout need a browser; no browser automation exists in this phase's stack, only compile, lint, unit and Vite-transform checks ran"
  - id: D7
    description: "Two copies of 1984 (Normal Baskı and Grafik Roman) show as two separate tiles with format pills; the Kitap ekle button sits top-right on desktop and full-width under the title at 375px; the empty state shows the same button"
    requirement: LIB-10
    verification: []
    human_judgment: true
    rationale: "Tile adjacency and responsive placement of the header button are visual outcomes; the copy-per-tile data path was proven in 01-04's integration test but nothing rendered this page"
  - id: D8
    description: "At 375px the add form is a single column with 44px controls, no horizontal scroll, the page scrolls normally with submit at the end, and the Select popover is usable on touch"
    requirement: UI-03
    verification: []
    human_judgment: true
    rationale: "Layout and touch behaviour were reasoned from classes (h-11 controls, w-full, no fixed widths) but not rendered"

duration: 5min
completed: 2026-10-02
status: complete
---

# Phase 1 Plan 08: Add-book form Summary

**Add a book by hand at /kitap/yeni: one zod schema with Turkish-safe NFC and code-point-exact validation, D-02/D-03 select vocabularies mechanically tied to the database CHECK lists, saved atomically through create_work_with_copy and reachable from the library header and empty state**

## Performance

- **Duration:** about 5 min
- **Started:** 2026-10-02T11:19:10Z
- **Completed:** 2026-10-02T11:24:32Z (last task commit)
- **Tasks:** 2
- **Files modified:** 13 (9 created, 4 modified)

## Accomplishments
- `vocab.ts` is the single TS list of the six formats and 22 genres. `vocab.test.ts` extracts the two `in ( ... )` lists from `init_schema.sql` with a regex and fails on any difference in content or order, and fails if a slug lacks a `format.`/`genre.` label in either catalog or a catalog has an extra such key (RESEARCH Pitfall 5).
- `book-form.ts`: `normalizeText` (NFC + trim), `codePointLength`, `emptyToNull`, `parseAuthors` (comma split, dedupe on `toLocaleLowerCase('tr')`, first spelling kept), and zod 4 schemas whose messages are i18n keys. Optional fields blank out to `null`; a series position without a series name is dropped.
- TDD: RED commit `f11a064` failed 23 of 25 assertions against stubs on behaviour; GREEN commit `f12a3c2` brings the full unit suite to 128 passing.
- `FormField` wires `aria-describedby`/`aria-invalid` and renders the error with `role="alert"`; `Select` (h-11, surface-2, Phosphor icons, 44px items) and `Textarea` (4 rows minimum, grows to about 240px then scrolls) follow the Input look.
- `WorkFields`/`CopyFields` build their options from `GENRE_SLUGS` (sorted by translated label, `other` last) and `FORMAT_SLUGS` (D-02 order). Seri sırası renders only while Seri adı has non-whitespace text. Both selects are Controllers forwarding `field.ref`.
- `AddBookPage`: centered 640px card, mode onBlur, `shouldFocusError`, Title autofocused, a failed validation scrolls the focused field to the centre, one `createWorkWithCopy` call per valid submit (guarded by `isPending` and a disabled/spinning button), success invalidates `libraryKeys.all` and navigates to `/`, failure shows `common.errorGeneric` above the buttons and keeps every value.
- Library: the primary `Kitap ekle` button (Phosphor `Plus`, 44px) sits top-right from `sm:` up and full-width under the title on phone, and the empty state carries the same button. `/kitap/yeni` is a child route of the authenticated shell.

## Task Commits

1. **Task 1: Slug vocabulary and form schema** (TDD)
   - RED: `f11a064` (test) - stubs plus failing tests, 23 of 25 failing on behaviour
   - GREEN: `f12a3c2` (feat) - vocab, schema, genre labels and the two new error keys
2. **Task 2: Add-book page with library entry points** - `ca2cccc` (feat)

**Plan metadata:** committed separately (docs: complete plan).

_`commits: 3` in the frontmatter is the measured `git rev-list --count 15e02fd..HEAD` before the metadata commit._

## Files Created/Modified
- `src/lib/vocab.ts`, `tests/unit/vocab.test.ts` - slug source and the drift test
- `src/features/book/book-form.ts`, `tests/unit/book-form.test.ts` - schemas, helpers, RPC input mapping
- `src/components/form-field.tsx`, `src/components/ui/select.tsx`, `src/components/ui/textarea.tsx` - form primitives
- `src/features/book/BookFormFields.tsx`, `src/features/book/AddBookPage.tsx` - field sections and the page
- `src/features/library/LibraryPage.tsx`, `src/app/router.tsx` - entry points and route
- `src/i18n/locales/tr.json`, `en.json` - 22 genre labels, book.* keys, error keys

## Decisions Made
- Genre/format start undefined in the form, keeping `BookFormValues = z.input<typeof bookFormSchema>` honest instead of widening the type with `''`. The zod enum is created with `{ error: 'form.errors.required' }`, so an unset select reports "Bu alan zorunlu.".
- The series-position check lives in one function applied to both `workFieldsSchema` and the merged `bookFormSchema`, because merging `.shape` objects drops object-level refinements.
- Position validation only runs while a series name exists, so an old hidden value cannot block a save (it is dropped, as the plan's must-have says).
- Mutation success awaits `invalidateQueries` before navigating; the library query is inactive at that moment so it only marks the cache stale and the page refetches on mount.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical / supply chain] shadcn 4.21.0 added the unplanned `cn` package a third time**
- **Found during:** Task 2 (`shadcn add select textarea`)
- **Issue:** The CLI added `"cn": "^0.4.0"` to `package.json` and generated `import { cn } from "cn"` in both files. `cn` is not in the approved pinned set (T-01-08-SC).
- **Fix:** `git checkout -- package.json package-lock.json`, `npm ci`, and both primitives rewritten by hand: `@/lib/utils`, `radix-ui`, Phosphor icons, 44px sizing, surface-2 background.
- **Files modified:** `src/components/ui/select.tsx`, `src/components/ui/textarea.tsx`
- **Verification:** `git diff --exit-code -- package.json package-lock.json` exits 0; no `from 'cn'` in `src`
- **Committed in:** `ca2cccc`

**2. [Rule 3 - Blocking] Test file failed typecheck under noUncheckedIndexedAccess**
- **Found during:** Task 1 GREEN verify (`npm run typecheck`)
- **Issue:** `match[1]` and `m[1]` in the migration-list helper of `vocab.test.ts` are `string | undefined`.
- **Fix:** default to `''` and assert `string` on the map result.
- **Files modified:** `tests/unit/vocab.test.ts`
- **Committed in:** `f12a3c2`

---

**Total deviations:** 2 auto-fixed (1 Rule 2, 1 Rule 3)
**Impact on plan:** No scope or dependency change.

## Issues Encountered
- `npm run build` still warns about the main chunk (now about 972 kB); the Phosphor barrel import and missing code splitting remain the known follow-up from 01-04/01-05.
- The first attempt to patch the test via a quoted shell one-liner did not apply; redone with the Edit tool.
- LF/CRLF warnings on commit are git `autocrlf` notices only.
- No browser was available, so D6 to D8 are left for the end-of-phase human checks. A throwaway Vite dev server on port 5199 confirmed HTTP 200 for every new module and for `/kitap/yeni`; it was stopped afterwards.

## User Setup Required

None - no external service configuration required.

**Open for the user (human check from the plan, not yet run):** `npm run dev`, then at 375px and at desktop width: add "1984" / "George Orwell" / Roman / Normal Baskı / Can Yayınları; add it again with Grafik Roman; submit an empty form; add "Nutuk" with a 600-character title. Expect two separate 1984 tiles with format pills, focus on Başlık with "Bu alan zorunlu." under Başlık, Yazar(lar), Tür and Format, "Bu alan çok uzun." for the long title, one book after a double-click on save, and Seri sırası only after typing a series name. This writes real rows to the project in `.env.local` (dev).

## Known Stubs

None.

## Threat Flags

None. The new surface is the form to `create_work_with_copy` path already in the plan's threat model. T-01-08-01 (zod plus DB CHECK constraints, vocab drift test), T-01-08-02 (the RPC takes no user_id), T-01-08-03 (React text rendering only; no raw HTML sink in `src`), T-01-08-04 (disabled button plus single atomic RPC) and T-01-08-SC (lockfile restored) are mitigated as planned.

## Next Phase Readiness
- Ready for 01-09 (add copy / edit): `WorkFields`, `CopyFields`, `FormField`, `bookFormSchema`/`workFieldsSchema`/`copyFieldsSchema` and the select primitives are reusable; the work picker (D-08) can hook under the Title field.
- Ready for 01-10/01-11: no new env vars or packages.

## Self-Check: PASSED

All 13 plan files exist on disk and commits `f11a064`, `f12a3c2` and `ca2cccc` are in `git log`. Re-run results: `npm run test:unit` (128 passed), `npm run build`, `npm run lint` and `npm run typecheck` exit 0; `! grep -rqE 'lucide-react|@radix-ui/react-' src` holds; `AddBookPage.tsx` contains `createWorkWithCopy(supabase`, `invalidateQueries`, `shouldFocusError` and `loading=`; `router.tsx` contains `/kitap/yeni`; `LibraryPage.tsx` links to `/kitap/yeni` twice; `BookFormFields.tsx` references `GENRE_SLUGS` and `FORMAT_SLUGS`; `book-form.ts` contains `normalize('NFC')` and `toLocaleLowerCase('tr')`; `package.json`/`package-lock.json` unchanged; `git status --porcelain` lists no `.local` env file.

---
*Phase: 01-private-shelf-walking-skeleton*
*Completed: 2026-10-02*
