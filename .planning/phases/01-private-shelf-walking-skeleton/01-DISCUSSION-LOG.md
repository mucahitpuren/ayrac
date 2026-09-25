# Phase 1: Private Shelf (Walking Skeleton) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-25
**Phase:** 01-private-shelf-walking-skeleton
**Areas discussed:** Format and genre lists, Sign-up / email confirmation, Authors and work identity, Environments and deployment

Area selection: user gave no preference, so all four proposed areas were discussed. Conversation held in Turkish.

---

## Format and genre lists

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed list | Novel, graphic novel, hardcover…; clean filters/stats, Excel maps onto it | ✓ |
| Fixed list + user can add | Needs a formats table and management UI | |
| Free text | Simplest, inconsistent values break filters | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed genre list from day one | ~15–20 TR/EN genres; ADD-05 and Phase 5 shelves build on it, no migration | ✓ |
| Free text for now | UI-SPEC's original; needs migration in Phase 4/5 | |
| Free text + suggestions | Middle ground, inconsistency risk remains | |

| Option | Description | Selected |
|--------|-------------|----------|
| One field, single choice | Standard, Graphic novel, Hardcover, Pocket, Special edition, Other | ✓ |
| Two fields (type + binding) | More precise, extra field, harder Excel mapping | |

| Option | Description | Selected |
|--------|-------------|----------|
| Claude proposes the genre list, user reviews | List written into CONTEXT.md | ✓ |
| User supplies the list | | |

## Sign-up / email confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Off in Phase 1, on in Phase 7 | Avoids free-tier email rate limit; custom SMTP in Phase 7 | ✓ |
| Required from the start | Safer, but rate limit and an extra screen | |

## Authors and work identity

| Option | Description | Selected |
|--------|-------------|----------|
| Store as a list, comma-separated input | Author page and top-authors stats work correctly | ✓ |
| Store as a single string | Simple, co-authored works count as a different author | |

| Option | Description | Selected |
|--------|-------------|----------|
| Only from the work page | UI-SPEC's original; add form always creates a new work | |
| Existing work selectable in the add form | More flexible, grows Phase 1 scope a bit | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Suggestions under the Title field | Picking locks work fields, form reduces to copy fields | ✓ |
| Two-option switch at the top of the form | Clearer but one extra step | |

| Option | Description | Selected |
|--------|-------------|----------|
| Simple matching, improved in Phase 2 | Case-insensitive with Turkish locale; full folding comes with Phase 2 | ✓ |
| Write Phase 2's normalize module now | Full folding in Phase 1, grows the phase | |

## Environments and deployment

First ask ("local Supabase + cloud prod / two cloud projects / one project"): user said they didn't fully understand. Re-explained in plain terms (real library vs test data, Docker not installed on this machine) and asked again.

| Option | Description | Selected |
|--------|-------------|----------|
| Two cloud projects: dev + prod | No install; uses both free-tier slots | ✓ |
| Install Docker, run locally | Offline dev, heavy on Windows | |
| One project is enough | Test data mixed with the real library | |

| Option | Description | Selected |
|--------|-------------|----------|
| `*.netlify.app` for now | Custom domain in Phase 7 | ✓ |
| Custom domain now | Requires DNS setup by the user | |

## Claude's Discretion

- Postgres enforcement of slugs; `authors text[]` vs child table; password rules; deploy-preview wiring; isolation-test user cleanup; picker UX details.

## Deferred Ideas

- Full Turkish folding for the picker (Phase 2), email confirmation (Phase 7), user-editable genre list (not planned).
