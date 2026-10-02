---
phase: 01-private-shelf-walking-skeleton
plan: 03
subsystem: ui
tags: [tailwind-v4, shadcn, radix-ui, phosphor, fontsource, theme, dark-mode, wcag-contrast, vitest]

requires:
  - phase: 01-private-shelf-walking-skeleton
    provides: "01-01 toolchain, exact-pinned dependency set, inline pre-paint theme script in index.html"
provides:
  - "Theme preference store (light/dark/system) with useTheme() hook, rule identical to the pre-paint script"
  - "Warm-paper light/dark tokens in src/index.css mapped to shadcn names, locked to the sketch palette and mechanically checked"
  - "Self-hosted Fraunces and DM Sans variable fonts (latin-ext included), no third-party origin"
  - "Owned shadcn components restyled to the tokens: Button (loading state), Input, Label, Card, Skeleton, Toaster"
  - "BookCover solid no-cover tile (tile/sibling/hero) with optional format pill"
affects: [01-04, 01-05, 01-06, 01-07, 01-08, 01-09, 01-10, 01-11]

plan_head_before: a524e9bf6608166239f540c2b48c791221f67709
actuals:
  tokens: 6650
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Theme rule lives in two twins that must stay in sync: inline script in index.html and src/lib/theme.ts"
    - "Raw tokens in :root/.dark (hex only, one per line), exposed to Tailwind through @theme inline; tests parse these blocks"
    - "shadow-cover is an @utility reading the raw var, not an @theme key, to avoid a self-referencing theme variable"
    - "shadcn output is always rewritten to Phosphor icons, the unified radix-ui package and the local cn() from @/lib/utils"

key-files:
  created:
    - src/lib/theme.ts
    - src/lib/utils.ts
    - components.json
    - src/components/ui/button.tsx
    - src/components/ui/input.tsx
    - src/components/ui/label.tsx
    - src/components/ui/card.tsx
    - src/components/ui/skeleton.tsx
    - src/components/ui/sonner.tsx
    - src/components/book-cover.tsx
    - tests/unit/theme.test.ts
    - tests/unit/tokens.test.ts
    - src/index.css
  modified:
    - src/main.tsx
    - eslint.config.js

key-decisions:
  - "Hero tint fallback is the constant terracotta #8a4b2a in both themes (--hero-tint-fallback), because white text on dark-mode primary #e0a57f is 2.13:1"
  - "Muted text on the page background is asserted at >= 4.0 (light measures 4.24, locked sketch token, flagged for UI review, not changed)"
  - "shadcn style radix-nova with iconLibrary phosphor; the CLI honoured it and generated Phosphor imports"
  - "Prefers-reduced-motion is a global unlayered override that also stills the button spinner; aria-busy carries the loading state"

patterns-established:
  - "Theme store: module-level state object replaced only on change so useSyncExternalStore snapshots stay stable"
  - "Components use 44px touch targets (h-11, size-11); size sm (h-9) only for dense desktop spots"

requirements-completed: [UI-02, UI-03]

coverage:
  - id: D1
    description: "Theme preference rule: stored light/dark win, any other stored value or a throwing storage means system; system follows the OS, a stored choice overrides it"
    requirement: UI-02
    verification:
      - kind: unit
        ref: "tests/unit/theme.test.ts#readThemePreference"
        status: pass
      - kind: unit
        ref: "tests/unit/theme.test.ts#resolveTheme"
        status: pass
    human_judgment: false
  - id: D2
    description: "Light and dark token values equal the locked sketch palette plus danger tokens, and meet the WCAG contrast floors (hero fallback gradient included)"
    requirement: UI-03
    verification:
      - kind: unit
        ref: "tests/unit/tokens.test.ts#warm-paper palette"
        status: pass
      - kind: unit
        ref: "tests/unit/tokens.test.ts#light theme contrast"
        status: pass
      - kind: unit
        ref: "tests/unit/tokens.test.ts#dark theme contrast"
        status: pass
      - kind: unit
        ref: "tests/unit/tokens.test.ts#copy-detail hero tint fallback"
        status: pass
    human_judgment: false
  - id: D3
    description: "Fraunces and DM Sans are self-hosted from Fontsource with latin-ext, and no CSS or font is requested from a third-party origin"
    requirement: UI-03
    verification:
      - kind: unit
        ref: "tests/unit/tokens.test.ts#self-hosted assets"
        status: pass
      - kind: other
        ref: "npm run build; ls dist/assets | grep woff2 (5 files incl. fraunces/dm-sans latin-ext)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Base components (Button, Input, Label, Card, Skeleton, Toaster) compile and lint clean on the tokens with Phosphor-only icons, no forbidden packages and an unchanged dependency set"
    requirement: UI-03
    verification:
      - kind: other
        ref: "npm run build && npm run lint && ! grep -rqE 'lucide-react|next-themes' src package.json && ! grep -rqE '@radix-ui/react-' src"
        status: pass
      - kind: other
        ref: "git diff --exit-code <plan start>..HEAD -- package.json package-lock.json"
        status: pass
    human_judgment: true
    rationale: "Look, spacing and focus-ring quality of the restyled components, the button spinner and toast appearance were not rendered in a browser; nothing mounts these components until plan 01-04"
  - id: D5
    description: "BookCover renders the solid surface-2 no-cover tile with a Book glyph and format pill, distinct from the Phase 6 striped ghost tile"
    requirement: UI-03
    verification: []
    human_judgment: true
    rationale: "Visual distinctness and pill legibility need eyes on a rendered tile; only compile, lint and generated-CSS checks (shadow-cover, bg-surface-2) were run"
  - id: D6
    description: "Live OS theme change while the app is open and no wrong-theme flash"
    requirement: UI-02
    verification: []
    human_judgment: true
    rationale: "The matchMedia change listener and pre-paint behaviour need a real browser; unit tests cover only the pure rule"

duration: 8min
completed: 2026-10-02
status: complete
---

# Phase 1 Plan 03: Visual foundation Summary

**Warm-paper light/dark tokens locked to the sketch palette and contrast-tested, self-hosted Fraunces and DM Sans, a light/dark/system theme store twin of the pre-paint script, and Phosphor-only owned shadcn components with a solid no-cover BookCover, all without adding a dependency**

## Performance

- **Duration:** about 8 min (start time was not recorded; estimated from the first task commit at 09:56Z)
- **Started:** approx. 2026-10-02T09:55:00Z
- **Completed:** 2026-10-02T10:03:11Z
- **Tasks:** 3
- **Files modified:** 15 (13 created, 2 modified in the plan's own commits; this count is the unique files in the diff against the plan base)

## Accomplishments
- `src/lib/theme.ts`: `readThemePreference`, `resolveTheme`, `applyTheme`, `setThemePreference`, `subscribeTheme`, `useTheme`. Only a stored `'light'` or `'dark'` is a choice; anything else (including a throwing storage) is `'system'`. A module-level `matchMedia` listener re-applies only while the preference is `system`.
- `src/index.css`: `:root` and `.dark` blocks with the exact sketch hex values plus danger tokens (`#b3392a`/`#e08a72`, soft `#f3ddd4`/`#3a2620`), `@theme inline` mapping, `font-display` (Fraunces 600, -0.01em), 0.15s transitions and a reduced-motion override.
- `tests/unit/tokens.test.ts` parses the CSS and checks every palette value plus contrast: text, primary-foreground, destructive-foreground and muted-on-card all >= 4.5 in both themes, muted-on-page >= 4.0, white on all three hero gradient stops of the terracotta fallback >= 4.5.
- Five woff2 files land in `dist/assets` (Fraunces and DM Sans latin, latin-ext, plus Fraunces vietnamese); the built CSS makes no request to a third-party origin (the only `https://` string is the Tailwind licence comment).
- Button (44px, `loading` shows `CircleNotch`, sets `aria-busy`, disables), Input, Label, Card, Skeleton, Toaster (`theme={useTheme().resolved}`) and `BookCover` are in place; `package.json` and `package-lock.json` are byte-identical to the 01-01 set.

## Task Commits

1. **Task 1: Theme preference store** (TDD)
   - RED: `a8991a6` (test) - 4 of 11 assertions failed against a stub, on the target behaviour (`expected 'light' to be 'dark'`)
   - GREEN: `aadb0db` (feat)
2. **Task 2: Tokens, fonts, shadcn config** (TDD)
   - RED: `e5f3379` (test) - 45 of 49 failed against a bare `@import "tailwindcss"` stylesheet; the 4 that passed are the no-third-party-origin and white-on-dark-primary negative checks, which hold for an empty file
   - GREEN: `f8cd5e6` (feat)
3. **Task 3: Base components and BookCover** - `1ecdc7a` (feat)

**Plan metadata:** committed separately (docs: complete plan).

## Files Created/Modified
- `src/lib/theme.ts` - theme store and `useTheme()` hook
- `src/index.css` - Tailwind v4 entry, Fontsource imports, dark variant, tokens, `@theme inline`, base layer
- `components.json`, `src/lib/utils.ts` - shadcn config (`radix-nova`, Phosphor) and a local `cn()` from `clsx` + `tailwind-merge`
- `src/main.tsx` - imports `./index.css`
- `src/components/ui/{button,input,label,card,skeleton,sonner}.tsx` - owned components on the tokens
- `src/components/book-cover.tsx` - `BookCover({ size, formatTag?, className? })`
- `tests/unit/theme.test.ts`, `tests/unit/tokens.test.ts` - rule, palette and contrast tests
- `eslint.config.js` - one rule override (see deviation 3)

## Decisions Made
- Constant terracotta hero tint fallback in both themes, per the plan, with a test that documents why (dark primary under white text is under 3:1).
- `shadow-cover` is an `@utility` reading `var(--shadow-cover)` instead of an `@theme` key; a theme key of the same name as its source variable would resolve to itself.
- Card padding lives on `Card` itself (16px phone, 24px from `sm:`) and its sub-parts carry no horizontal padding, unlike the shadcn default.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical / supply chain] shadcn 4.21.0 added an unplanned `cn` package and rewired `cn()` to it**
- **Found during:** Task 2 (`shadcn init`) and Task 3 (`shadcn add`)
- **Issue:** Besides the expected extras, the CLI added `cn@^0.4.0` to `package.json` and generated `src/lib/utils.ts` as `export { cn } from "cn"`, with every component importing `cn` from `"cn"`. `init` also added `shadcn`, `lucide-react` and `@fontsource-variable/geist`; `add sonner` added `next-themes`. None of these were in the approved pinned set.
- **Fix:** Restored `package.json` and `package-lock.json` from git and ran `npm ci` after each CLI run (as the plan directs). Rewrote `src/lib/utils.ts` as the standard `clsx` + `tailwind-merge` implementation (both already pinned) and rewrote every component to import `cn` from `@/lib/utils`. The unknown `cn` package was never kept or installed in the final tree.
- **Files modified:** `src/lib/utils.ts`, all of `src/components/ui/*`
- **Verification:** `grep` finds no `from "cn"`, `lucide-react`, `next-themes`; `git diff --exit-code <plan start>..HEAD -- package.json package-lock.json` exits 0
- **Committed in:** `f8cd5e6`, `1ecdc7a`

**2. [Rule 3 - Blocking] shadcn CLI needed non-obvious flags and generated imports the plan's token block replaces**
- **Found during:** Task 2
- **Issue:** `npx shadcn@4.21.0 init` stops at an interactive preset prompt with `-y`, and the generated `src/index.css` imported `shadcn/tailwind.css` (a package that is not installed after restoring `package.json`).
- **Fix:** Used `init -t vite -b radix -p nova -y --css-variables --no-rtl --no-pointer` (presets are `nova`, `vega`, ...; the style recorded is `radix-nova`), then replaced the generated token block wholesale with the warm-paper one, dropping the `shadcn/tailwind.css` and Geist imports. The generated `button.tsx` from `init` was deleted and regenerated by `add` in Task 3, so it only enters git in Task 3's commit.
- **Files modified:** `src/index.css`, `components.json`
- **Verification:** `npm run build` exits 0 with the fonts in `dist/assets`
- **Committed in:** `f8cd5e6`

**3. [Rule 3 - Blocking] react-refresh lint error on `buttonVariants` export**
- **Found during:** Task 3
- **Issue:** `react-refresh/only-export-components` fails `button.tsx` because it exports `buttonVariants` next to `Button`, which the plan requires.
- **Fix:** Added a one-file override in `eslint.config.js` that allows only the `buttonVariants` export name for `src/components/ui/button.tsx`. The file is not in the plan's `files_modified` list.
- **Verification:** `npm run lint` exits 0
- **Committed in:** `1ecdc7a`

---

**Total deviations:** 3 auto-fixed (1 Rule 2, 2 Rule 3)
**Impact on plan:** No scope change and no dependency change. Deviation 1 is the one worth knowing about: shadcn 4.21.0's generated output depends on a package the plan did not approve.

## TDD Gate Compliance

The plan is `type: execute` with Tasks 1 and 2 marked `tdd="true"`. Each has a `test(01-03)` RED commit before its `feat(01-03)` GREEN commit (`a8991a6` -> `aadb0db`, `e5f3379` -> `f8cd5e6`); no refactor commits. RED failed on assertions for the target behaviour, not on import or fixture errors (Task 2's RED used a minimal real stylesheet so the test file loaded). `gsd_run check tdd-red-evidence` was not run because the plan is not `type: tdd`.

## Issues Encountered
- Flagged for UI review, not changed: muted text on the light page background measures 4.24:1, under 4.5. It is a locked sketch token; the test asserts the 4.0 floor the plan specifies.
- The CRLF warnings on commit are git `autocrlf` notices only; no content was affected.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. `BookCover` is intentionally the complete Phase 1 cover behaviour; image rendering is added to the same component by COVR-01 in Phase 4.

## Threat Flags

None. T-01-03-SC was mitigated as planned (official registry only, lockfile restored, dependency diff empty), and the extra packages the CLI tried to add were the case it guards against. T-01-03-01 holds: the CSS has no `http` URL and the build output has no third-party request.

## Next Phase Readiness
- Ready for the tracer in 01-04 (and 01-05's theme toggle): `useTheme()`, the tokens and the base components exist. Nothing mounts `<Toaster />` yet; the app shell must.
- Open for the user: a browser check of the live OS theme switch, no-flash first paint, and a look at the rendered components and the BookCover tile once 01-04 mounts them.

## Self-Check: PASSED

All 15 plan files exist on disk and commits `a8991a6`, `aadb0db`, `e5f3379`, `f8cd5e6` and `1ecdc7a` are in `git log`. Re-run: `npm run test:unit` (69 passed), `npm run build` and `npm run lint` exit 0, the forbidden-package greps find nothing, and `package.json`/`package-lock.json` are unchanged against the plan start.

---
*Phase: 01-private-shelf-walking-skeleton*
*Completed: 2026-10-02*
