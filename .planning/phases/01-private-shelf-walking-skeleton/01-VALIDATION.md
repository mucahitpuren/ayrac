---
phase: "1"
slug: "private-shelf-walking-skeleton"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-25"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.0.2 (peer-compatible with Vite 8.3.1) |
| **Config file** | `vite.config.ts` `test.projects` (planned in 01-01): `unit` (no network) and `integration` (hosted `dev`, `fileParallelism: false`) |
| **Quick run command** | `npm run test:unit` (= `vitest run --project unit`, no network) |
| **Full suite command** | `npm test` (= `vitest run`, includes the integration project against the hosted `dev` project; needs `.env.test.local`) |
| **Estimated runtime** | ~10 s quick, ~60 s full (network round-trips to `dev`) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:unit`, plus `npm run build` where the task touches app code
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green, plus the manual UAT walkthrough below
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

Filled in by the planner (task IDs = `{plan}-T{n}`). Checkpoint tasks are omitted.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T2 | 01 | 1 | (scaffold) | T-01-01-SC, T-01-01-01 | Exact pins; env files and data/ ignored | build/lint | `npm run build && npm run lint` + pin check | created by task | ⬜ pending |
| 01-01-T3 | 01 | 1 | UI-01, UI-02 | — | Language rule, catalog parity | unit | `npm run test:unit -- tests/unit/i18n.test.ts` | created by task | ⬜ pending |
| 01-02-T2 | 02 | 2 | AUTH-07 | T-01-02-01 | Client refuses secret keys | unit | `npm run test:unit -- tests/unit/client-key.test.ts` | created by task | ⬜ pending |
| 01-02-T3 | 02 | 2 | AUTH-01 | T-01-02-02 | Prod guard; D-05 sign-up; min password 8 | integration | `npm run test:integration -- tests/integration/auth-config.test.ts` | created by task | ⬜ pending |
| 01-03-T1 | 03 | 2 | UI-02 | — | Theme rule | unit | `npm run test:unit -- tests/unit/theme.test.ts` | created by task | ⬜ pending |
| 01-03-T2 | 03 | 2 | UI-02, UI-03 | — | Locked palette + contrast | unit | `npm run test:unit -- tests/unit/tokens.test.ts` | created by task | ⬜ pending |
| 01-03-T3 | 03 | 2 | UI-03 | T-01-03-SC | No unpinned/forbidden packages | build/lint | `npm run build && npm run lint` + forbidden-import grep | created by task | ⬜ pending |
| 01-04-T2 | 04 | 3 | AUTH-01/02/05/07, LIB-01/02/10 | T-01-04-01..04 | RLS + trigger + atomic add, cross-user empty read | integration (tracer) | `npm run test:integration -- tests/integration/tracer.test.ts` | created by task | ⬜ pending |
| 01-05-T1 | 05 | 4 | UI-01/02/03 | — | — | build/unit | `npm run build && npm run lint && npm run test:unit` | exists | ⬜ pending |
| 01-05-T2 | 05 | 4 | AUTH-02, AUTH-05 | T-01-05-01 | Cache cleared on logout/user switch | unit | `npm run test:unit -- tests/unit/avatar-initial.test.ts` | created by task | ⬜ pending |
| 01-06-T1 | 06 | 4 | AUTH-07 | T-01-06-01 | Every table/function hardened | unit | `npm run test:unit -- tests/unit/migrations-rls.test.ts` | created by task | ⬜ pending |
| 01-06-T2 | 06 | 4 | AUTH-07 | T-01-06-01, T-01-06-04 | Account B cannot select/insert/update/delete Account A's rows in any table | integration | `npm run test:integration -- tests/integration/rls-isolation.test.ts` | created by task | ⬜ pending |
| 01-06-T3 | 06 | 4 | LIB-01, LIB-02, LIB-09 | — | Atomic add/delete, concurrency | integration | `npm run test:integration -- tests/integration/schema.test.ts tests/integration/rpc.test.ts` | created by task | ⬜ pending |
| 01-07-T1 | 07 | 4 | (secrets gate) | T-01-07-01..03 | No secret in dist or git history | unit + script | `npm run test:unit -- tests/unit/check-secrets.test.ts && node scripts/check-secrets.mjs --git-history` | created by task | ⬜ pending |
| 01-07-T3 | 07 | 4 | UI-01/02/03 (deployed) | T-01-07-05 | Prod schema pushed, CLI relinked to dev | live checks | curl checks on LIVE_URL + linked-ref check | exists | ⬜ pending |
| 01-08-T1 | 08 | 5 | LIB-01, ADD-02 | T-01-08-01 | Slug/label/DB parity, normalization | unit | `npm run test:unit -- tests/unit/vocab.test.ts tests/unit/book-form.test.ts` | created by task | ⬜ pending |
| 01-08-T2 | 08 | 5 | ADD-02, LIB-10 | T-01-08-02 | — | build/unit | `npm run build && npm run lint && npm run test:unit` | exists | ⬜ pending |
| 01-09-T1 | 09 | 6 | LIB-06, LIB-10 | T-01-09-01 | — | build/unit | `npm run build && npm run lint && npm run test:unit` | exists | ⬜ pending |
| 01-09-T2 | 09 | 6 | READ-04 | T-01-09-03 | Single-flight autosave | unit | `npm run test:unit -- tests/unit/note-autosave.test.ts` | created by task | ⬜ pending |
| 01-09-T3 | 09 | 6 | READ-04 | — | — | build/unit | `npm run build && npm run lint && npm run test:unit` | exists | ⬜ pending |
| 01-10-T1 | 10 | 7 | LIB-02 | T-01-10-01 | — | build/unit | `npm run build && npm run lint && npm run test:unit` | exists | ⬜ pending |
| 01-10-T2 | 10 | 7 | LIB-02 (D-09) | T-01-10-02 | Picker only over own library | unit | `npm run test:unit -- tests/unit/work-picker.test.ts` | created by task | ⬜ pending |
| 01-10-T3 | 10 | 7 | LIB-02, ADD-02 | — | — | build/unit | `npm run build && npm run lint && npm run test:unit` | exists | ⬜ pending |
| 01-11-T1 | 11 | 8 | LIB-08 | T-01-11-01 | — | build/unit | `npm run build && npm run lint && npm run test:unit` | exists | ⬜ pending |
| 01-11-T2 | 11 | 8 | LIB-09 | T-01-11-01, T-01-11-02 | Delete only after confirm; RLS-scoped RPC | build/unit + integration | `npm run build && npm run test:unit && npm run test:integration -- tests/integration/rpc.test.ts` | exists | ⬜ pending |
| 01-11-T3 | 11 | 8 | (release) | T-01-11-04, T-01-11-05 | Full suite, schemas in sync, history clean | full suite | `npm test && node scripts/check-secrets.mjs --git-history` | exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vite.config.ts` `test.projects` (unit + sequential integration) — 01-01 T2 (replaces a separate `vitest.config.ts`)
- [ ] `tests/setup/clients.ts` + `tests/setup/env.ts` — service-key client factory reading `.env.test.local` via `TEST_` vars, prod guard (gitignored, never bundled) — 01-02 T3
- [ ] `tests/integration/rls-isolation.test.ts` — AUTH-07, two throwaway users on `dev`, every table (tied to `tests/setup/schema-tables.ts`) — 01-06 T2
- [ ] `tests/integration/schema.test.ts` — LIB-01/LIB-02 round-trip: work with every field + multiple copies — 01-06 T3
- [ ] `.env.example` section listing test-only variables without values — 01-01 T2
- [ ] Framework install: `vitest@5.0.2` pinned in 01-01 T2 (env loading via Vite `loadEnv`, no `dotenv` package)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sign up with email + password | AUTH-01 | No browser-automation dependency in this phase | Sign up on the deployed URL; land in the empty library |
| Log in / log out | AUTH-02 | Same | Log out from avatar menu, log back in |
| Session survives browser restart | AUTH-05 | Needs a real browser close/reopen | Close the browser fully, reopen the URL, still signed in |
| Work detail lists every copy | LIB-06 | UI walkthrough | Add *1984* novel + graphic novel; both show under the work |
| Edit work and copy | LIB-08 | UI walkthrough | Edit title and publisher; changes persist after reload |
| Delete with confirmation | LIB-09 | UI walkthrough | Delete a copy (others remain), last copy (work gone), whole work |
| Each copy is its own tile | LIB-10 | Visual | Library shows two *1984* tiles, never "×2" |
| Manual add form + work picker | ADD-02, D-08 | UI walkthrough | Add new work; add a copy by picking an existing work from Title suggestions |
| Personal note | READ-04 | UI walkthrough | Note saves and shows save states |
| TR/EN switching, default + remembered | UI-01 | UI walkthrough | Every screen in both languages; choice survives reload |
| Light/dark, system default, no flash | UI-02 | Visual | Cold load in both OS themes; toggle persists |
| Phone + desktop layout | UI-03 | Visual | 375px and desktop widths, one-handed reach |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
