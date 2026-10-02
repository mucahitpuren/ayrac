---
phase: 01-private-shelf-walking-skeleton
plan: 09
subsystem: ui
tags: [react, tanstack-query, supabase, i18n, autosave, tdd, copy-detail]

requires:
  - phase: 01-private-shelf-walking-skeleton
    provides: "01-04 libraryKeys/fetchLibrary/LibraryPage/router and RLS schema; 01-03 BookCover, Card, Skeleton, hero tint token; 01-08 vocab, Textarea, add-book page and catalogs"
provides:
  - "/kitap/:copyId copy detail page: cover-tinted hero, 'Notun' card, one card per owned copy of the work"
  - "queries.ts: copyKeys, CopyDetail, CopySibling, isUuid, fetchCopyDetail (null for malformed or invisible ids), updateCopyNote"
  - "note-autosave.ts: framework-free debounced single-flight autosave controller (createNoteAutosave, NoteSaveState)"
  - "Library tiles are links to their copy's detail page"
  - "book.detail.* and book.note.* in tr and en"
affects: [01-10, 01-11]

plan_head_before: 802493b8688837dd0ac2255602924f0363d7f758
actuals:
  tokens: 7871
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Detail fetch is one PostgREST call: copy with its work and the work's copies embedded (works!inner -> siblings:copies), siblings sorted client-side by instant then id"
    - "A malformed or RLS-hidden id resolves to null, so the UI has a single not-found path and a bad URL never reaches the server"
    - "Autosave is a pure controller (timer + in-flight flag + pending slot) driven by fake timers in tests; the React card only wires it"
    - "Cache is kept in step with setQueryData after a successful write instead of refetching under an active textarea"

key-files:
  created:
    - src/features/book/CopyDetailPage.tsx
    - src/features/book/CopyHero.tsx
    - src/features/book/SiblingsSection.tsx
    - src/features/book/note-autosave.ts
    - src/features/book/NoteCard.tsx
    - tests/unit/note-autosave.test.ts
    - tests/integration/copy-detail.test.ts
  modified:
    - src/features/library/queries.ts
    - src/features/library/LibraryPage.tsx
    - src/app/router.tsx
    - src/i18n/locales/tr.json
    - src/i18n/locales/en.json

key-decisions:
  - "Sibling order compares created_at as instants (Date.parse) with id as the tie-break, because Postgres trims trailing fraction zeros and plain string comparison of timestamps is unreliable"
  - "A note is stored trimmed and a blank note as NULL (same normalisation as the add form); the textarea keeps exactly what was typed"
  - "When a newer text is pending behind a failed or finished save, that older result is not reported (no 'saved'/'error'): the trailing save decides the final state, so 'Kaydedildi' only appears after the newest text is stored"
  - "dispose() drops an unflushed text but lets an already flushed trailing save finish, so leaving the page right after typing during an in-flight save still persists the newest text"
  - "Breadcrumb separator is the Phosphor CaretRight icon rather than a unicode glyph, following the sketch rule against glyph icons"

patterns-established:
  - "Detail pages treat null from the query as not-found and never distinguish 'does not exist' from 'not yours'"
  - "Every sibling/tile link carries a visible focus ring and a 44px+ hit area"

requirements-completed: [LIB-06, LIB-10, READ-04]

coverage:
  - id: D1
    description: "Siblings of a work are exactly the copies with the same work_id, oldest first, from any of them; a different work with the same title has its own page and a single sibling"
    requirement: LIB-06
    verification:
      - kind: integration
        ref: "tests/integration/copy-detail.test.ts#lists exactly the copies of the same work, oldest first, from either copy"
        status: pass
      - kind: integration
        ref: "tests/integration/copy-detail.test.ts#a different work with the same title has its own page and a single sibling"
        status: pass
    human_judgment: false
  - id: D2
    description: "A malformed id, an unknown id and another account's copy all return null (not-found), and writing a note to a copy the user cannot see fails"
    requirement: LIB-06
    verification:
      - kind: integration
        ref: "tests/integration/copy-detail.test.ts#returns null for a malformed id, an unknown id and another account's copy"
        status: pass
      - kind: integration
        ref: "tests/integration/copy-detail.test.ts#refuses to write a note on a copy the user cannot see"
        status: pass
    human_judgment: false
  - id: D3
    description: "Note write path: a note persists, a cleared note is stored as NULL"
    requirement: READ-04
    verification:
      - kind: integration
        ref: "tests/integration/copy-detail.test.ts#writes a note, then stores NULL when it is cleared"
        status: pass
    human_judgment: false
  - id: D4
    description: "Autosave controller: 800ms debounce, single-flight with trailing save, flush, whitespace to null, error then retry with latest text, dispose and flush-after-dispose"
    requirement: READ-04
    verification:
      - kind: unit
        ref: "tests/unit/note-autosave.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "tr and en catalogs keep identical key sets after adding book.detail.* and book.note.*; build, lint, typecheck and the full unit suite pass; Vite serves every new module and /kitap/:copyId with HTTP 200"
    requirement: LIB-10
    verification:
      - kind: other
        ref: "npm run build && npm run lint && npm run typecheck && npm run test:unit (135 passed)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Hero and siblings in a browser: 1984 (Normal Baskı + Grafik Roman) shows 'Bu eserden 2 nüshan var' with two cards and the current one ringed with 'Şu an bakıyorsun'; a single-copy book shows 'Tek nüsha'; bad ids show the not-found message; white text is readable on the gradient in light and dark; a long title wraps without truncation; layout holds at 375px"
    requirement: LIB-10
    verification: []
    human_judgment: true
    rationale: "Gradient contrast in both themes, responsive layout and visual hierarchy need a browser; no browser automation exists in this phase's stack, only compile, lint, unit, dev-integration and Vite-transform checks ran"
  - id: D7
    description: "Note card in a browser: states cycle Kaydedilmedi… -> Kaydediliyor… -> Kaydedildi with the Check icon, the note survives reload, a cleared note stays empty, offline shows the 'Kaydedilemedi, tekrar dene.' toast without losing text and the next online edit saves"
    requirement: READ-04
    verification: []
    human_judgment: true
    rationale: "Visible save-state timing and offline behaviour through the real supabase-js client need a browser and DevTools throttling; the ordering and failure rules themselves are proven by D4"

duration: 5min
completed: 2026-10-02
status: complete
---

# Phase 1 Plan 09: Copy detail page and note autosave Summary

**Open any library tile at /kitap/:copyId to see the cover-tinted hero, a 'Notun' card with debounced single-flight autosave, and every owned copy of the same work as its own card; ids that are malformed or belong to someone else resolve to not-found**

## Performance

- **Duration:** about 5 min
- **Started:** 2026-10-02T11:26:44Z
- **Completed:** 2026-10-02T11:32:00Z (last task commit)
- **Tasks:** 3
- **Files modified:** 12 (7 created, 5 modified)

## Accomplishments
- `fetchCopyDetail` does one PostgREST call (copy, its work, and the work's copies embedded), returns `null` without a request for a non-UUID id and `null` for rows RLS hides, and sorts siblings by instant then id so the order is stable across reloads. `updateCopyNote` selects the updated row and throws when zero rows come back.
- `CopyHero`: the locked gradient (88% tint + white, tint at 45%, 70% tint + black) on `--hero-tint-fallback`, 32px/28px padding, a 260px no-cover tile (170px on phone), white text with the sketch shadow, breadcrumb `Kütüphanem › {work}`, kicker (`Tek nüsha` / `Bu eserden {n} nüshan var`), a 44px H1 (edition title, else work title) that wraps with `overflow-wrap:anywhere`, byline with the muted `{work} · ` prefix only when an edition title exists, series line omitted when unset, and translucent pills where publisher and genre are dropped when empty.
- `SiblingsSection`: one card per copy with its own no-cover tile and `{format} · {publisher}` meta; the current copy has `border-primary` + `ring-[3px] ring-primary-soft` and `Şu an bakıyorsun` and is not a link; the others link to their own pages with a focus ring.
- `CopyDetailPage`: Skeleton hero and cards while loading, generic error with retry, not-found with a link back, otherwise hero + `NoteCard` + siblings. Library tiles are now `Link`s and `/kitap/:copyId` is routed after the static `/kitap/yeni`.
- TDD for the autosave: RED `9176494` (6 of 7 fail on behaviour against a no-op stub), GREEN `fed2cd9` (all 7 pass; full unit suite 135).
- `NoteCard`: one controller per copy, `onChange`/`onBlur`/unmount wired to `change`/`flush`/`flush+dispose`, polite live status line with a Phosphor `Check`, one error toast per failed save, textarea never reset, cache updated with `setQueryData` on success.
- An integration test on dev (5 tests) proves the sibling embed, the same-title-different-work case, not-found for malformed/unknown/foreign ids, the note write and clear-to-NULL, and the refused foreign note write.

## Task Commits

1. **Task 1: Copy detail page, hero, siblings, tile links** - `d16040b` (feat)
2. **Task 2: Autosave controller (TDD)**
   - RED: `9176494` (test) - failing tests against a stub
   - GREEN: `fed2cd9` (feat) - controller implementation
3. **Task 3: Notun card wired to the database** - `a6ba53f` (feat)

**Plan metadata:** committed separately (docs: complete plan).

_`commits: 4` in the frontmatter is the measured `git rev-list --count 802493b..HEAD` before the metadata commit._

## Files Created/Modified
- `src/features/library/queries.ts` - `copyKeys`, `CopyDetail`, `fetchCopyDetail`, `updateCopyNote`, `isUuid`
- `src/features/book/CopyDetailPage.tsx`, `CopyHero.tsx`, `SiblingsSection.tsx` - page, hero, sibling cards
- `src/features/book/note-autosave.ts`, `NoteCard.tsx` - controller and the card
- `src/features/library/LibraryPage.tsx`, `src/app/router.tsx` - tile links and route
- `src/i18n/locales/tr.json`, `en.json` - `book.detail.*`, `book.note.*`
- `tests/unit/note-autosave.test.ts`, `tests/integration/copy-detail.test.ts` - controller behaviour and the dev data path

## Decisions Made
See `key-decisions` above. The two that affect later plans: notes are stored trimmed (a user's trailing spaces do not round-trip), and the detail query shape (`CopyDetail`) is what 01-10 edit/delete/add-copy should invalidate through `copyKeys.detail(id)` and `libraryKeys.all`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Integration test for the detail data path**
- **Found during:** Task 1
- **Issue:** The plan only listed unit tests, but the sibling embed (`works!inner -> siblings:copies`), the not-found behaviour for foreign ids (T-01-09-01) and the note write were new PostgREST behaviour that nothing exercised.
- **Fix:** added `tests/integration/copy-detail.test.ts`, run against the dev project with throwaway users (deleted afterwards, sweep in `afterAll`).
- **Files modified:** `tests/integration/copy-detail.test.ts`
- **Verification:** `npm run test:integration -- tests/integration/copy-detail.test.ts` (5 passed)
- **Committed in:** `d16040b`

**2. [Rule 1 - Bug avoided] Timestamp ordering compares instants, not strings**
- **Found during:** Task 1 (writing the sort)
- **Issue:** PostgREST timestamps have a variable number of fraction digits (trailing zeros are trimmed), so a plain string comparison could put an earlier copy after a later one.
- **Fix:** `compareSiblings` compares `Date.parse(created_at)` first, then `id`. Copies created within the same millisecond fall back to id order, which is still stable.
- **Files modified:** `src/features/library/queries.ts`
- **Committed in:** `d16040b`

**3. [Process] Breadcrumb separator is an icon**
- **Issue:** the plan text writes `Kütüphanem › {work title}` with a unicode chevron; the sketch rule forbids unicode glyphs as icons.
- **Fix:** Phosphor `CaretRight`, visually the same.
- **Files modified:** `src/features/book/CopyHero.tsx`
- **Committed in:** `d16040b`

---

**Total deviations:** 3 (1 Rule 2, 1 Rule 1, 1 process note)
**Impact on plan:** No scope or dependency change; `package.json` and the lockfile are untouched and no shadcn CLI was run.

## TDD Gate Compliance

The plan is `type: execute` with one `tdd="true"` task, so the plan-level gate does not apply. Task 2 has a `test(01-09)` RED commit (`9176494`) followed by a `feat(01-09)` GREEN commit (`fed2cd9`). In RED the dispose test passes against the no-op stub because it only asserts that nothing is saved; the other 6 fail on assertions for the planned behaviour (not on import or syntax errors).

## Issues Encountered
- A combined Python/Node shell one-liner for a small edit in `queries.ts` applied through its Node fallback and then a second Edit duplicated the helper; the duplicate was removed before any commit.
- `npm run build` still warns about the ~985 kB main chunk (known follow-up from 01-04/01-05/01-08: Phosphor barrel import and no code splitting).
- LF/CRLF warnings on commit are git `autocrlf` notices only.
- No browser was available, so D6 and D7 are left for the end-of-phase human checks. A throwaway Vite server on port 5199 returned HTTP 200 for every new module and for `/kitap/abc`; it was stopped afterwards.

## User Setup Required

None - no external service configuration required.

**Open for the user (plan human checks, not yet run):**
1. `npm run dev`; with "1984" (Normal Baskı + Grafik Roman) and one single-copy book in the library, tap each tile and open `/kitap/not-a-uuid` and a random valid UUID, in both themes at 375px and desktop. Expect "Bu eserden 2 nüshan var" with two sibling cards and the current one ringed, "Tek nüsha" for the single copy, the not-found message for bad ids, readable white hero text and an untruncated long title.
2. Type a note, pause, reload; clear it and reload; go offline in DevTools, type, then go online and type again. Expect Kaydedilmedi… -> Kaydediliyor… -> Kaydedildi, the note surviving reload, a cleared note staying empty, and offline showing "Kaydedilemedi, tekrar dene." without losing text, with the next online edit saving.

## Known Stubs

None. The "Okuma" card, the edit/delete actions and the "Yeni nüsha ekle" card from the sketch are intentionally not built here (Phase 5 and plan 01-10).

## Threat Flags

None. The new surface is the plan's threat model: T-01-09-01 (RLS select policy; integration test shows a foreign copy id returns null), T-01-09-02 (UUID check before any request), T-01-09-03 (single-flight autosave with trailing save, unit-tested) and T-01-09-04 (React text rendering only; `grep dangerouslySetInnerHTML src` finds nothing) are mitigated as planned.

## Next Phase Readiness
- Ready for 01-10 (edit, delete, add copy): `fetchCopyDetail`/`copyKeys.detail` and the sibling list are in place; the "Yeni nüsha ekle" dashed card and the action row sit naturally under the hero and in `SiblingsSection`. Mutations should invalidate `copyKeys.detail(id)` and `libraryKeys.all`.
- Ready for 01-11: no new env vars or packages.

## Self-Check: PASSED

All 12 plan files exist on disk and commits `d16040b`, `9176494`, `fed2cd9` and `a6ba53f` are in `git log`. Re-run results: `npm run test:unit` (135 passed), `npm run build`, `npm run lint` and `npm run typecheck` exit 0; `npm run test:integration -- tests/integration/copy-detail.test.ts` (5 passed on dev). Acceptance greps hold: `CopyHero.tsx` has `--hero-tint-fallback` and `color-mix`; `SiblingsSection.tsx` has `ring-primary-soft` and `book.detail.current`; `queries.ts` exports `fetchCopyDetail` and sorts siblings by `created_at` then `id`; `router.tsx` has `/kitap/:copyId`; `LibraryPage.tsx` links tiles to `/kitap/`; `NoteCard.tsx` has `createNoteAutosave`, `updateCopyNote(supabase`, `aria-live`, `book.note.saveFailed` and `setQueryData`; `CopyDetailPage.tsx` renders `NoteCard`; `note-autosave.ts` has no React or Supabase import. `package.json`/`package-lock.json` unchanged and `git status --porcelain` lists no `.env.*.local` file.

---
*Phase: 01-private-shelf-walking-skeleton*
*Completed: 2026-10-02*
