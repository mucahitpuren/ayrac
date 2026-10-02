---
phase: 01-private-shelf-walking-skeleton
plan: 06
subsystem: testing
tags: [supabase, postgres, rls, vitest, integration-tests, security-gate]

requires:
  - phase: 01-private-shelf-walking-skeleton
    provides: "01-02 prod-guarded integration harness (clients, createTestUser, sweepTestUsers); 01-04 works/copies schema, RLS policies, ownership trigger, create_work_with_copy and delete_copy on dev, queries.ts"
provides:
  - "tests/setup/schema-tables.ts: conservative regex reader over supabase/migrations (schemaTables, tableSecurity, rpcFunctions) that throws on anything it cannot parse"
  - "Static AUTH-07 gate (npm run test:unit): every migrated table needs RLS, select/insert/update/delete policies and an anon revoke; every public function needs SECURITY INVOKER, a set search_path and execute revoked from anon and public"
  - "Two-account RLS isolation matrix on dev (20 tests) whose covered-table list must equal schemaTables()"
  - "LIB-01/LIB-02 round-trip and CHECK-constraint suite, ownership-trigger and updated_at checks"
  - "delete_copy / create_work_with_copy semantics suite: last-copy cascade, idempotency, 3 concurrent rounds, atomicity"
affects: [01-07, 01-08, 01-09, 01-10, 01-11, phase-2, phase-3, phase-4]

plan_head_before: a5b775dc451d20605048757db5792c77ee73852a
actuals:
  tokens: 10700
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Security gates are mechanical: the static unit gate and the isolation test both derive their table list from the migration files, so a new table fails a test until it is hardened and covered"
    - "Every negative isolation assertion is paired with an owner read and an admin-client check that the row exists and is unchanged"
    - "Isolation and concurrency assertions compare sorted id sets, never row order"
    - "Concurrency is exercised with two separately signed-in clients of the same user so calls really overlap"

key-files:
  created:
    - tests/setup/schema-tables.ts
    - tests/unit/migrations-rls.test.ts
    - tests/integration/rls-isolation.test.ts
    - tests/integration/schema.test.ts
    - tests/integration/rpc.test.ts
  modified: []

key-decisions:
  - "The migration reader throws on a function it cannot match (non-dollar-quoted body) and on a table created outside public or unqualified, instead of skipping it, so an unparsed object can never silently pass the gate"
  - "A revoke counts only if no later grant gives anon (or public, for functions) the same privilege back; a policy without a FOR clause or with FOR ALL counts as covering all four commands; the last enable/disable row level security statement wins"
  - "Attribute checks for functions read the header and the text after the closing dollar quote, never the body"

patterns-established:
  - "Adding a table in a later phase: add it to COVERED_TABLES in tests/integration/rls-isolation.test.ts and extend the matrix, or the suite stays red"
  - "Integration tests use only tests/setup/clients.ts, so the D-12 prod guard in getTestEnv applies to every suite"

requirements-completed: [AUTH-07, LIB-01, LIB-02, LIB-09]

coverage:
  - id: D1
    description: "Static gate fails the unit run if any migration-created table lacks RLS, a select/insert/update/delete policy or an anon revoke, or any public function lacks SECURITY INVOKER, a set search_path or an execute revoke from anon/public; synthetic negative cases prove it can fail"
    requirement: AUTH-07
    verification:
      - kind: unit
        ref: "tests/unit/migrations-rls.test.ts#AUTH-07 hardening of every migrated table and function"
        status: pass
      - kind: unit
        ref: "tests/unit/migrations-rls.test.ts#the gate can fail (synthetic migrations)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Account B cannot select, update or delete account A's works or copies, cannot insert a work with A's user_id, cannot attach or move a copy onto A's work, and cannot delete A's copy through delete_copy; A's rows are unchanged for the admin client; anon reads nothing and cannot insert, update, delete or call either RPC; two accounts with the same title get separate work ids; a new account's library is empty"
    requirement: AUTH-07
    verification:
      - kind: integration
        ref: "tests/integration/rls-isolation.test.ts#AUTH-07 two-account isolation"
        status: pass
    human_judgment: false
  - id: D3
    description: "The isolation test's covered tables equal the tables created by the migrations, so a later table fails the test until coverage is extended"
    requirement: AUTH-07
    verification:
      - kind: integration
        ref: "tests/integration/rls-isolation.test.ts#AUTH-07 two-account isolation > covers exactly the tables created by the migrations"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every LIB-01 work and copy field (title, authors, genre, series, series_position, format, publisher, edition_title, volume_coverage, note) round-trips exactly through fetchLibrary and direct selects; genre NULL is accepted; Turkish strings are byte-identical"
    requirement: LIB-01
    verification:
      - kind: integration
        ref: "tests/integration/schema.test.ts#LIB-01 / LIB-02 schema > LIB-01 round trip"
        status: pass
    human_judgment: false
  - id: D5
    description: "The database rejects format 'paperback', genre 'romance', a whitespace-only title, series_position without a series and a 10001-character note with 23514, and leaves no partial rows"
    requirement: LIB-01
    verification:
      - kind: integration
        ref: "tests/integration/schema.test.ts#CHECK constraints reject bad data"
        status: pass
    human_judgment: false
  - id: D6
    description: "Nutuk with 3 copies and 1984 with 2 copies are stored as two works whose copies share their work_id; a copy inserted with a client-supplied user_id is owned by the parent work's owner; updated_at advances on update"
    requirement: LIB-02
    verification:
      - kind: integration
        ref: "tests/integration/schema.test.ts#LIB-02 multiple copies of one work"
        status: pass
      - kind: integration
        ref: "tests/integration/schema.test.ts#AUTH-07 trigger and updated_at"
        status: pass
    human_judgment: false
  - id: D7
    description: "delete_copy returns (true,false) then (true,true) and removes the work with its last copy, is idempotent for a copy that is already gone, two concurrent calls on the last two copies leave no zero-copy work in 3 rounds, an already-deleted work deletes 0 rows without error, and a failing create_work_with_copy leaves no work row"
    requirement: LIB-09
    verification:
      - kind: integration
        ref: "tests/integration/rpc.test.ts#create_work_with_copy and delete_copy"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-10-02
status: complete
---

# Phase 1 Plan 06: RLS isolation matrix, static hardening gate and schema/RPC suites Summary

**A migration-derived static gate plus a 20-test two-account RLS matrix on dev prove tenant isolation for every table and RPC (and fail as soon as an unhardened or uncovered table appears), while round-trip, CHECK, trigger and concurrency suites prove the LIB-01/LIB-02 schema and the atomic add/delete functions**

## Performance

- **Duration:** 6 min
- **Started:** 2026-10-02T10:50:22Z
- **Completed:** 2026-10-02T10:56:10Z
- **Tasks:** 3
- **Files modified:** 5 (5 created, no production code changed)

## Accomplishments
- `schema-tables.ts` reads every migration in filename order and reports tables, RLS state, per-command policies, anon revokes and RPC hardening. It throws on anything it cannot interpret, so the gate cannot be bypassed by an unusual function or a non-public table.
- `migrations-rls.test.ts` (19 tests, no network) checks the current migrations, runs synthetic negative cases (no RLS, missing policies, missing anon revoke, anon re-grant, `security definer`, unparseable function, non-public table) and then generically asserts hardening for whatever tables and functions exist.
- `rls-isolation.test.ts` (20 tests on dev): COVERED_TABLES equality gate, positive controls through the admin client and the owners, then B against A on works, copies and `delete_copy`, anon against everything, same-title adjacency and the empty new-account case. Every negative is paired with an admin confirmation that A's rows exist and are unchanged.
- `schema.test.ts` and `rpc.test.ts` (23 tests): all LIB-01 fields and the Turkish strings round-trip, the five CHECK rejections return 23514 and leave no partial rows, the trigger overwrites a forged `user_id`, `updated_at` advances, Nutuk x3 / 1984 x2 share work ids, `delete_copy` cascades and is idempotent, and the concurrency case passed in all 3 rounds with exactly one of the two calls deleting the work.
- Full runs: `npm run test:integration` 54 passed (5 files), `npm run test:unit` 99 passed, `npm run typecheck` and `npx eslint .` exit 0.

## Task Commits

1. **Task 1 (TDD) RED: failing static gate tests against a stub parser** - `d4e8c25` (test)
2. **Task 1 (TDD) GREEN: static RLS and function-hardening gate** - `bdc84f0` (feat)
3. **Task 2: two-account RLS isolation matrix** - `43f92e0` (test)
4. **Task 3: schema round-trip, CHECK constraints and RPC semantics** - `1c43e1d` (test)

**Plan metadata:** committed separately (docs: complete plan).

_`commits: 4` in the frontmatter is the measured `git rev-list --count a5b775d..HEAD` before the metadata commit._

## Files Created/Modified
- `tests/setup/schema-tables.ts` - `schemaTables`, `tableSecurity`, `rpcFunctions` (each accepts an optional SQL string for synthetic cases)
- `tests/unit/migrations-rls.test.ts` - static hardening gate
- `tests/integration/rls-isolation.test.ts` - AUTH-07 matrix
- `tests/integration/schema.test.ts` - LIB-01/LIB-02 round trip, CHECKs, trigger, updated_at
- `tests/integration/rpc.test.ts` - delete_copy and create_work_with_copy semantics

## Decisions Made
- The parser fails loudly rather than skipping: a function whose body is not dollar-quoted, or a table created outside `public` or unqualified, makes the gate throw. A later migration written in an unusual style therefore turns the unit run red instead of passing unchecked.
- A privilege revoke only counts if no later `grant` re-gives it to anon (or public for functions). FOR ALL and FOR-less policies count as all four commands. The last `enable`/`disable row level security` wins.
- Function attributes are read from the header and the text after the closing dollar quote, never from the body, so text inside a body cannot satisfy the check.

## Deviations from Plan

None - plan executed exactly as written. Notes that are not deviations:

- The plan is `type: execute` (only Task 1 is `tdd="true"`), so `check tdd-red-evidence` was not run. RED (`d4e8c25`) still failed on 12 assertions for the planned behaviour against a stub that finds nothing, not on import or fixture errors; the 2 trivially true tests passed by design.
- The isolation and schema/rpc suites passed on their first run against dev, because they test schema and policies that 01-04 had already pushed. The RLS tests were still checked for false greens by pairing each negative with an owner read and an admin check (threat T-01-06-04).
- Two lint-free but unformatted-by-Prettier files: the repo has no Prettier config, so lines were wrapped by hand to 120 columns instead of running `prettier --write`.

**Total deviations:** 0
**Impact on plan:** None.

## Issues Encountered
- A first regex for "create table outside public" mis-read `create table if not exists public.x` (the optional group backtracked and matched `if`). Caught while writing the synthetic cases, fixed with a second lookahead, and covered by a regression test.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None. These are tests only; no new endpoints, auth paths or schema. T-01-06-01 (future table without RLS) is mitigated by the static gate and the COVERED_TABLES equality test. T-01-06-02 is mitigated because every suite uses only `tests/setup/clients.ts`, whose `getTestEnv` refuses the prod ref. T-01-06-03: only synthetic and public titles are used, nothing is read from `data/`. T-01-06-04: every negative isolation read is paired with an owner read and an admin confirmation.

## Next Phase Readiness
- Ready for 01-07 and later plans: `npm run test:unit` now fails on an unhardened table or function, and `npm run test:integration` fails until a new table is added to COVERED_TABLES and covered.
- Later phases that add tables (Phase 2 wishlist and similar) must extend `tests/integration/rls-isolation.test.ts` in the same change.
- Test accounts are removed by `afterAll` sweeps in every suite; no `ayrac-test+` user is expected to remain on dev.

## Self-Check: PASSED

All five created files exist on disk and commits `d4e8c25`, `bdc84f0`, `43f92e0` and `1c43e1d` are in `git log`. Acceptance criteria re-run: `schema-tables.ts` exports `schemaTables`, `tableSecurity` and `rpcFunctions`; `rls-isolation.test.ts` contains `schemaTables()` and the COVERED_TABLES assertion with 58 `expect(` calls; `rpc.test.ts` contains `Promise.all` inside a 3-round `it.each`; `schema.test.ts` asserts `edition_title`, `volume_coverage`, `series_position` and `note` explicitly. Plan-level verification: `npm run test:unit` (99 passed) and `npm run test:integration` (54 passed) exit 0 on dev; `npm run typecheck` and `npx eslint .` exit 0; `git status --porcelain` lists no `.env.*` file.

---
*Phase: 01-private-shelf-walking-skeleton*
*Completed: 2026-10-02*
