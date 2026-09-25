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
| **Config file** | none — Wave 0 installs `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/ --exclude tests/rls-isolation.test.ts` (no network) |
| **Full suite command** | `npx vitest run` (includes RLS isolation test against the hosted `dev` project; needs `.env.test.local`) |
| **Estimated runtime** | ~10 s quick, ~60 s full (network round-trips to `dev`) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/ --exclude tests/rls-isolation.test.ts`, plus `npx tsc -b` / `npm run build` where the task touches app code
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green, plus the manual UAT walkthrough below
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

Filled in by the planner/executor once task IDs exist. Requirement → test mapping from research:

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | AUTH-07 | RLS isolation | Account B cannot select/insert/update/delete Account A's rows in any table | integration | `npx vitest run tests/rls-isolation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | LIB-01, LIB-02 | — | N/A | integration | `npx vitest run tests/schema.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — base config; RLS isolation test runs sequentially
- [ ] `tests/setup/admin-client.ts` — service-role client factory reading `.env.test.local` (gitignored, never bundled)
- [ ] `tests/rls-isolation.test.ts` — AUTH-07, two throwaway users on `dev`, every table
- [ ] `tests/schema.test.ts` — LIB-01/LIB-02 round-trip: work with every field + 2 copies
- [ ] `.env.test.local.example` (or `.env.example` section) listing test-only variables without values
- [ ] Framework install: `npm install -D vitest@5.0.2 dotenv`

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
