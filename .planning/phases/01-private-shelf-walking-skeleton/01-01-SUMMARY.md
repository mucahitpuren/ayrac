---
phase: 01-private-shelf-walking-skeleton
plan: 01
subsystem: infra
tags: [vite, react, typescript, tailwind, vitest, eslint, i18next, supabase-cli]

requires: []
provides:
  - Hand-written Vite 8 + React 19 + TypeScript 6.0.3 toolchain that builds, lints and unit-tests from a clean `npm ci`
  - Exact-pinned dependency set for the whole phase (37 packages), later plans must not add or bump packages
  - Bilingual i18n (tr/en) with a saved-choice-wins language rule shared by an inline boot script and src/i18n/languages.ts
  - No-flash theme and html lang bootstrap in index.html
  - Secrets hygiene (.gitignore, .env.example with dummy values only)
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-08, 01-09, 01-10, 01-11]

plan_head_before: a0aab6a66745e678721a553458651e1a281c1a62
actuals:
  tokens: 3300
  tasks: 3
  commits: 5

tech-stack:
  added: [vite@8.3.1, react@19.3.0, typescript@6.0.3, tailwindcss@4.3.3, vitest@5.0.2, eslint@10.11.0, i18next@26.4.2, react-i18next@17.0.15, "@supabase/supabase-js@2.117.2", supabase@2.118.0, prettier@3.9.9]
  patterns:
    - "Single tsconfig.json with paths @/* and no baseUrl (deprecated in TS 6)"
    - "Vitest projects: unit (pure TS) and integration (hosted dev project, sequential, TEST_ env only)"
    - "Passive language detection never persists; only setLanguage() writes ayrac-lng"
    - "Inline index.html script is the JS twin of resolveLanguage / theme logic and must be kept in sync"

key-files:
  created:
    - package.json
    - package-lock.json
    - vite.config.ts
    - tsconfig.json
    - eslint.config.js
    - index.html
    - src/main.tsx
    - .env.example
    - src/i18n/languages.ts
    - src/i18n/index.ts
    - src/i18n/locales/tr.json
    - src/i18n/locales/en.json
    - tests/unit/i18n.test.ts
  modified:
    - .gitignore

key-decisions:
  - "Language rule: stored ayrac-lng of exactly 'tr' or 'en' wins, else first navigator language with primary subtag tr/en, else English"
  - "Language persisted only on explicit setLanguage(); detector runs with caches: [] so a browser default stays a default"
  - "react-refresh export rule is not applied to src/main.tsx (entry point with no exports); react-hooks rules still apply to it"

patterns-established:
  - "i18n keys live in two catalogs with enforced parity (tests/unit/i18n.test.ts)"
  - "Test-only env vars use the TEST_ prefix and are loaded by vite.config.ts loadEnv, never reaching the client bundle"

requirements-completed: [UI-01, UI-02]

coverage:
  - id: D1
    description: "Toolchain builds, lints and unit-tests from a clean npm ci with an exact-pinned dependency set"
    verification:
      - kind: other
        ref: "npm ci && npm run build && npm run lint && npm run test:unit"
        status: pass
    human_judgment: false
  - id: D2
    description: "resolveLanguage rule (stored choice wins, browser fallback, English default) and tr/en catalog key parity"
    requirement: UI-01
    verification:
      - kind: unit
        ref: "tests/unit/i18n.test.ts#resolveLanguage"
        status: pass
      - kind: unit
        ref: "tests/unit/i18n.test.ts#locale catalogs"
        status: pass
    human_judgment: false
  - id: D3
    description: "Pre-paint lang and dark class bootstrap in index.html shows no wrong-theme flash in a real browser"
    requirement: UI-02
    verification: []
    human_judgment: true
    rationale: "Pre-paint flash and real browser-language detection need a real browser; only a node vm simulation of the inline script was run (lang and dark class resolved correctly for six storage/browser/OS combinations)"
  - id: D4
    description: "Env files and data/ cannot be committed (.gitignore, .env.example with dummy values only)"
    requirement: UI-01
    verification:
      - kind: other
        ref: "git check-ignore -q node_modules dist data/kitaplar.xlsx (ignored); git check-ignore -q .env.example (exit 1, tracked)"
        status: pass
    human_judgment: true
    rationale: "git check-ignore on .env.local, .env.test.local and .env.supabase.local was blocked by the secret-read guard hook, so those three names were not checked directly; the .env* and *.local rules cover them"

duration: 16min
completed: 2026-10-02
status: complete
---

# Phase 1 Plan 01: Toolchain, i18n and boot bootstrap Summary

**Hand-scaffolded Vite 8 + React 19 + TS 6.0.3 SPA with 37 exact-pinned dependencies, Vitest unit/integration projects, tr/en i18n whose saved explicit choice beats browser language, and an inline pre-paint lang/dark-class script**

## Performance

- **Duration:** about 16 min of executor time (start time was not recorded; estimated from the first npm log at 09:42Z and the end below)
- **Started:** approx. 2026-10-02T09:37:00Z
- **Completed:** 2026-10-02T09:53:16Z (last verification run)
- **Tasks:** 3 (Task 1 was a checkpoint resolved by the user before this run)
- **Files modified:** 14 (13 created, 1 modified)

## Accomplishments
- Repo builds (`tsc --noEmit && vite build`), lints and passes 9 unit tests from a clean `npm ci`; every dependency is an exact version.
- `.gitignore` written before the first install; `.env.example` documents client, integration-test and Supabase CLI variables with dummy values only.
- Language is resolved by one rule in `resolveLanguage` and in the inline boot script; passive detection never writes `ayrac-lng`.
- `<html lang>` is set before React mounts and kept in sync on `languageChanged`; the `dark` class and `color-scheme` are set before first paint.
- Package legitimacy gate (Task 1): user replied "onaylandı" and approved all nine packages (eslint, typescript-eslint, eslint-plugin-react-refresh, globals, prettier, @types/node, @types/react, @types/react-dom, supabase); none were rejected, so none were omitted.

## Task Commits

1. **Task 1: Package legitimacy gate** - no commit (checkpoint:human-verify, approved by the user via the orchestrator)
2. **Task 2: Toolchain scaffold with pinned deps and hygiene files** - `9e81992` (chore)
3. **Task 3 (TDD) RED: failing resolveLanguage and parity tests** - `834b42b` (test)
4. **Task 3 (TDD) GREEN: i18n, boot script, main.tsx** - `304ae28` (feat)

**Plan metadata:** committed separately (docs: complete plan).

_`commits: 5` in the frontmatter is the measured `git rev-list --count a0aab6a..HEAD`; two of those are orchestrator config commits (`64cdebd`, `ece8a0b`) made while this plan was paused at the protected-branch gate. The plan itself produced three commits._

## Files Created/Modified
- `package.json`, `package-lock.json` - pinned dependencies, scripts dev/build/preview/lint/typecheck/format/test/test:unit/test:integration, engines node >=22.12
- `vite.config.ts` - react + tailwind plugins, `@` alias, Vitest projects `unit` and `integration` with TEST_ env loading
- `tsconfig.json` - strict single config with `paths`, no `baseUrl`
- `eslint.config.js` - ESLint 10 flat config (js, typescript-eslint, react-hooks, react-refresh vite preset)
- `index.html` - inline pre-paint lang and theme script, theme-color metas, `#root`
- `src/main.tsx` - boot screen rendering `t('common.appName')`
- `src/i18n/languages.ts` - `SUPPORTED_LANGUAGES`, `LANGUAGE_STORAGE_KEY`, `resolveLanguage`
- `src/i18n/index.ts` - i18next init, `setLanguage`, html lang sync
- `src/i18n/locales/tr.json`, `en.json` - `common.*` keys
- `tests/unit/i18n.test.ts` - 9 tests (7 resolveLanguage, 2 catalog)
- `.gitignore`, `.env.example` - secrets and data hygiene

## Decisions Made
- Language rule and persistence-on-explicit-pick only, as specified by the plan.
- `src/main.tsx` is exempt from the react-refresh export rule (see deviation 2).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] npm crash while adding vitest@5.0.2**
- **Found during:** Task 2
- **Issue:** `npm install vitest@5.0.2` crashes with `Cannot read properties of null (reading 'edgesOut')` (npm 10.9.0 arborist bug in the optional-peer cycle between vitest and its optional `@vitest/*` peers). The package is real and approved; this is an npm tooling bug, not a failed or missing package, and no alternative package was tried.
- **Fix:** installed only that one package with `--legacy-peer-deps`, same exact version. All other packages installed in default mode. A default `npm ci` afterwards succeeds.
- **Files modified:** package.json, package-lock.json
- **Verification:** `npm ci`, build, lint and unit tests pass in default mode
- **Committed in:** 9e81992

**2. [Rule 3 - Blocking] react-refresh rule failed src/main.tsx**
- **Found during:** Task 2
- **Issue:** `react-refresh/only-export-components` reports "file has no exports" for the entry point, so `npm run lint` failed.
- **Fix:** react-hooks rules apply to all `src/**/*.tsx`; the react-refresh vite preset ignores `src/main.tsx` only.
- **Files modified:** eslint.config.js
- **Verification:** `npm run lint` exits 0
- **Committed in:** 9e81992

**3. [Process] Protected-branch gate and TDD evidence format**
- **Found during:** Task 2 commit and Task 3 RED
- **Issue:** the pre-commit assertion treated `master` as protected and halted the run; the user chose option 1 and the orchestrator set `git.allow_default_branch_commits: true` (verified via `config-get`). Separately, `check tdd-red-evidence` expects flat node-style TAP with `# tests/# pass/# fail` lines, which vitest's nested TAP lacks.
- **Fix:** committed on `master` after the override; for the RED record I flattened vitest's TAP output and appended the summary counts from the same run. Verdict `RED_EVIDENCE_OK` (target test: `a stored "tr" wins over an English browser`).
- **Files modified:** none in the repo

---

**Total deviations:** 3 (2 Rule 3 blocking fixes, 1 process note)
**Impact on plan:** No scope change. The `--legacy-peer-deps` install of vitest is the one item worth revisiting if npm is upgraded.

## TDD Gate Compliance

The plan is `type: execute`, with Task 3 marked `tdd="true"`. The RED commit `834b42b` (`test(01-01)`) precedes the GREEN commit `304ae28` (`feat(01-01)`); no refactor commit was needed. RED failed intentionally on 4 assertions (`expected 'en' to be 'tr'`) against a stub that returns `'en'`. The catalog JSON files were included in the RED commit as data, so the two catalog parity tests passed at RED by design; only the `resolveLanguage` tests are the RED target.

## Issues Encountered
- **Secret-read guard hook:** PreToolUse blocked Bash commands that named `.env.local`, `.env.test.local` and `.env.supabase.local` (even for `git check-ignore`, which reads no contents). Those three plan acceptance checks were therefore not run directly. `.gitignore` contains `.env*` and `*.local`; `.env.example` was confirmed tracked (`git check-ignore -q .env.example` exits 1) and `node_modules`, `dist` and `data/kitaplar.xlsx` were confirmed ignored. The user can run `git check-ignore -v .env.local .env.test.local .env.supabase.local` by hand to close the gap.
- **Human-check not performed:** the Task 3 browser check (Turkish browser, `ayrac-lng` override, OS dark mode, no flash) needs a real browser; only a node `vm` simulation of the inline script was run.

## User Setup Required

None - no external service configuration required in this plan. (Supabase env files are documented in `.env.example` and are used from plan 01-02 onward.)

## Known Stubs

None. `Boot` in `src/main.tsx` is a minimal placeholder boot screen by plan design and will be replaced by the app shell in later plans.

## Threat Flags

None. The `postinstall` check found only `fsevents` with an install script in the lockfile (macOS-only optional dependency); the supabase npm package ran no download script during install.

## Next Phase Readiness
- Ready for 01-02. Toolchain, pinned dependencies and the i18n module exist.
- Open items for the user: run the browser check for the pre-paint script and the three `.env*` `git check-ignore` commands noted above.

## Self-Check: PASSED

All created files exist on disk and commits `9e81992`, `834b42b` and `304ae28` are present in `git log`. Re-run results: `npm ci`, `npm run build`, `npm run lint` and `npm run test:unit` (9 passed) all exit 0; `git status --porcelain` is clean.

---
*Phase: 01-private-shelf-walking-skeleton*
*Completed: 2026-10-02*
