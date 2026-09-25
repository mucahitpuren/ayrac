# Phase 1: Private Shelf (Walking Skeleton) - Research

**Researched:** 2026-09-25
**Domain:** Greenfield Vite+React SPA scaffold, Supabase Postgres+Auth+RLS multi-tenant data model, Netlify static deployment
**Confidence:** HIGH (package versions verified live against npm registry this session; Supabase CLI/Docker behavior and framework setup steps verified against official docs; ecosystem "best practice" claims MEDIUM, cross-checked 2+ sources each)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Format and genre (controlled vocabularies)**
- **D-01:** Copy `format` is a **fixed list**, single choice, not user-extensible. Stored as a stable English slug; labels live only in the TR/EN i18n catalogs. — Reversibility: one-way — changing or removing a slug later needs a data migration of existing copies and of the Phase 3 import mapping.
- **D-02:** One format field (content type and binding are **not** split into two fields). The list replaces the one in `01-UI-SPEC.md`:

  | slug | TR | EN |
  |---|---|---|
  | `standard` | Normal Baskı | Standard edition |
  | `graphic_novel` | Grafik Roman | Graphic novel |
  | `hardcover` | Ciltli | Hardcover |
  | `pocket` | Cep Boy | Pocket size |
  | `special_edition` | Özel Baskı | Special edition |
  | `other` | Diğer | Other |

  Rationale: maps 1:1 onto the Excel "Kitap Türü" values the author actually uses, which Phase 3 import will map into this list.
- **D-03:** Work `genre` is a **fixed list from day one** (not free text), stored as a slug with TR/EN labels in the i18n catalogs. Phase 4's API genre mapping (ADD-05) and Phase 5 genre shelves build on this list, so no free-text → list migration is ever needed. — Reversibility: one-way — same migration cost as D-01. Proposed list (user delegated the contents, may edit later):

  | slug | TR | EN |
  |---|---|---|
  | `novel` | Roman | Novel |
  | `short_stories` | Öykü | Short stories |
  | `poetry` | Şiir | Poetry |
  | `drama` | Tiyatro | Drama |
  | `essay` | Deneme | Essay |
  | `classics` | Klasik | Classics |
  | `science_fiction` | Bilim Kurgu | Science fiction |
  | `fantasy` | Fantastik | Fantasy |
  | `crime` | Polisiye | Crime & mystery |
  | `humor` | Mizah | Humour |
  | `children` | Çocuk & Gençlik | Children & young adult |
  | `biography` | Biyografi & Anı | Biography & memoir |
  | `history` | Tarih | History |
  | `philosophy` | Felsefe | Philosophy |
  | `psychology` | Psikoloji | Psychology |
  | `politics_society` | Siyaset & Toplum | Politics & society |
  | `religion_mythology` | Din & Mitoloji | Religion & mythology |
  | `science` | Bilim | Science |
  | `art` | Sanat | Art |
  | `self_help` | Kişisel Gelişim | Self-help |
  | `travel` | Gezi | Travel |
  | `other` | Diğer | Other |

- **D-04:** `genre` is **nullable in the database** (Phase 3 import rows mostly lack genre and Phase 4 fills it later), but the manual add/edit form keeps it required as `01-UI-SPEC.md` says, with "Diğer / Other" as the escape hatch.

**Authentication**
- **D-05:** **Email confirmation is OFF** in Phase 1 on both Supabase projects: sign-up logs the user straight in. Turned on in Phase 7 together with custom SMTP. No "check your inbox" screen in Phase 1.

**Authors and work identity**
- **D-06:** A work's authors are stored as a **list of names** (e.g. `authors text[]`, or a child table if the planner prefers — see Claude's Discretion), entered in the form as one comma-separated field, trimmed and de-duplicated on save. Needed so Phase 5's author page and top-authors stats count each author separately. — Reversibility: costly — switching to a single string later loses structure; switching array ↔ join table touches every query.
- **D-07:** A new copy can be attached to an existing work from **two** entry points: the "Yeni nüsha ekle" card on the copy/work detail page **and** the "Kitap ekle" form (D-08).
- **D-08:** Work picker on the add form = **suggestions under the Title field**. As the user types, matching works from their own library appear (e.g. "1984 — George Orwell · 1 nüsha"). Picking one locks the work fields (shown read-only with a way to clear the choice) and the form reduces to copy fields; submitting then creates only a copy under that work. Not picking anything creates a new work.
- **D-09:** Picker matching in Phase 1 is **simple**: case-insensitive substring on title (and author) using Turkish-locale lowercasing (`toLocaleLowerCase('tr')`), over the already-loaded works list. Full Turkish folding is Phase 2's shared normalize module.

**Environments and deployment**
- **D-10:** **Two hosted Supabase projects**: `dev` (development, test accounts, the two-account isolation test) and `prod` (the author's real library). No Docker / local Supabase (Docker is not installed on the dev machine). This uses both free-tier project slots. — Reversibility: reversible.
- **D-11:** Schema changes live as SQL migration files in the repo (Supabase CLI via `npx supabase`, hand-written migrations, `db push` to each project). Nothing is created by clicking in the dashboard without a matching migration.
- **D-12:** The two-account RLS isolation test runs against the **dev** project only, never prod.
- **D-13:** Phase 1 ships to a **`*.netlify.app` URL** (e.g. `ayrac.netlify.app`), wired to the prod Supabase project. The custom domain comes in Phase 7 (OPS-01).

### Claude's Discretion

- How slugs are enforced in Postgres (CHECK constraint vs enum type vs lookup table), as long as D-01/D-03 hold. **Research recommendation: CHECK constraint (`text` + `CHECK (val IN (...))`)** — see `## Architecture Patterns`.
- `authors text[]` vs a `work_authors` child table (both satisfy D-06; child table must carry `user_id` + RLS). **Research recommendation: `authors text[]`** — see `## Architecture Patterns`.
- Password minimum length / rules (Supabase default or stricter, e.g. 8 chars) and their TR/EN error copy. **Research recommendation: 8 characters, set via dashboard on both projects** — see `## Manual Setup Steps`.
- Whether Netlify deploy previews point at the dev project; env var naming (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). **Research recommendation: yes, scope by Netlify deploy context** — see `## Architecture Patterns`.
- How the isolation test creates and cleans up its throwaway users on dev (service-role key only in local `.env` / CI secret, never in the client bundle).
- Exact picker UX details (debounce, max suggestions, keyboard navigation), within the sketch/UI-SPEC visual language.

### Deferred Ideas (OUT OF SCOPE)

- Full Turkish-folding match for the add-form work picker — arrives with Phase 2's normalize module (D-09).
- Email confirmation on sign-up — Phase 7 with custom SMTP (D-05).
- User-editable genre list — not planned; revisit only if the fixed list proves too narrow.
- Search, duplicate warning (Phase 2); import (Phase 3); book API/covers/genre auto-fill (Phase 4); reading status, shelves, sort/filter (Phase 5); wishlist, series views (Phase 6); password reset, Google sign-in, custom domain (Phase 7).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up with email and password | Supabase Auth `signUp()`, email confirmation OFF (D-05) — see Code Examples |
| AUTH-02 | User can log in and log out | Supabase Auth `signInWithPassword()` / `signOut()` — see Code Examples |
| AUTH-05 | User session persists across browser restarts | `supabase-js` default `persistSession: true` + `storage: localStorage` — see Architecture Patterns |
| AUTH-07 | User can only ever see and change their own data (two-account isolation test on every table) | RLS policies + denormalized `user_id` + trigger; Vitest isolation-test pattern — see Code Examples + Validation Architecture |
| LIB-01 | A work stores title, author(s), genre, optional series name+position; a copy stores format, publisher, cover, optional volume coverage, optional edition title | Schema in Code Examples (cover/volume columns nullable, populated later phases) |
| LIB-02 | User can own multiple copies of one work | `works` 1:N `copies` FK — see Architecture Patterns |
| LIB-06 | User can open a work detail page showing every owned copy | Query pattern in Architecture Patterns |
| LIB-08 | User can edit work and copy details | Standard RLS-scoped `UPDATE`, react-hook-form + zod |
| LIB-09 | User can delete a copy or a work after confirming | `ON DELETE CASCADE` from `works`→`copies`; AlertDialog per UI-SPEC |
| LIB-10 | Every owned copy is its own tile, never merged | Copy-level rendering already implied by `copies` table being the display unit |
| ADD-02 | User can add a book manually | Add-work-and-copy form, react-hook-form + zod — Code Examples |
| READ-04 | User can add a personal note to a book | `copies.note` column, autosave pattern per UI-SPEC |
| UI-01 | UI available in TR/EN, defaults to browser language, remembered | react-i18next + i18next-browser-languagedetector — Architecture Patterns |
| UI-02 | Light/dark theme, defaulting to system | No-flash inline-script pattern — Architecture Patterns |
| UI-03 | Responsive, mobile-first, works on phone and desktop | Tailwind v4 + shadcn/ui, `sm:` breakpoint per UI-SPEC |
</phase_requirements>

## Summary

Phase 1 is a from-scratch scaffold: the repo has no `package.json` yet. The build is a Vite 8 + React 19 + TypeScript 6.0.3 SPA styled with Tailwind v4 and shadcn/ui, talking directly to a hosted Supabase project (Postgres + Auth) via `@supabase/supabase-js`, deployed as a static site to Netlify. There is **no Netlify Function in this phase** — ADD-01/COVR-01 (external book APIs) are Phase 4, so the only backend is Supabase itself, reached with only the anon key from the client.

The two structurally important pieces of this phase are (1) the **work/copy schema with RLS from creation**, denormalizing `user_id` onto `copies` and using a trigger to guarantee it always matches the parent work's owner, and (2) the **Supabase CLI without Docker** workflow — confirmed directly against Supabase's own CLI reference docs: `supabase link` and `supabase db push` connect straight to the remote Postgres connection string and do **not** require Docker; only `db diff`, `db pull`, and `db start` (which spin up a local shadow/full Postgres via Docker) do. This resolves D-10/D-11 cleanly: `supabase migration new`, hand-edit the SQL file, `supabase link --project-ref <dev-or-prod-ref>`, `supabase db push` — twice, once per project, no Docker involved at any step.

Controlled-vocabulary slugs (D-01/D-03 format/genre) should be enforced with a `text` column + `CHECK (val IN (...))`, not a native Postgres `enum` — enums have no `DROP VALUE` and require a full column rewrite under an `ACCESS EXCLUSIVE` lock to change their value set, while a `CHECK` constraint swap is a fast metadata-only change. Since both D-01 and D-03 are explicitly flagged "one-way, needs a data migration" if the list changes, minimizing the *mechanical* cost of that future migration is a direct win. Authors (D-06) should be a simple `text[]` column rather than a child table at this project's scale (~110 books): Postgres's `unnest()` handles the Phase 5 "list every work by this author" query natively without a join table, and D-06 explicitly permits either.

**Primary recommendation:** Scaffold with `npm create vite@latest` (react-ts template) → Tailwind v4 via `@tailwindcss/vite` → `npx shadcn@latest init` (stable, no canary needed) → wire Supabase client, i18n, and theme providers before the first screen is built, and write the RLS + trigger + CHECK-constraint schema as hand-written SQL migrations pushed via `npx supabase db push` to both the `dev` and `prod` projects from day one.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Sign up / log in / log out | API/Backend (Supabase Auth) | Browser/Client (form, redirect) | GoTrue issues and validates the JWT; the SPA only calls the SDK and reacts to `onAuthStateChange` |
| Session persistence across restarts | Browser/Client (localStorage via `supabase-js`) | API/Backend (refresh-token exchange) | `persistSession` writes to `localStorage`; on reload the SDK silently exchanges the stored refresh token for a fresh access token |
| Per-user data isolation (AUTH-07) | Database/Storage (Postgres RLS) | — | RLS is the *only* enforcement point by design (Pattern 2 in `.planning/research/ARCHITECTURE.md`) — no app-level ownership checks exist to get wrong |
| Work/copy CRUD (LIB-01/02/06/08/09/10) | API/Backend (Postgres via PostgREST, through `supabase-js`) | Browser/Client (forms, optimistic cache) | Direct RLS-scoped client calls; no custom server needed for this phase |
| Add-form work picker (D-08/D-09) | Browser/Client | — | Runs over the already-loaded, already RLS-scoped works list in memory; no new query per keystroke |
| i18n (UI-01) | Browser/Client | — | Pure client-side string/locale switching; no server involvement |
| Theme (UI-02) | Browser/Client | — | CSS class + `prefers-color-scheme`, resolved before first paint via an inline script |
| Responsive layout (UI-03) | Browser/Client | — | Tailwind breakpoints; no server-side device detection |
| Static hosting + SPA routing fallback | CDN/Static (Netlify) | — | Netlify serves the built assets and rewrites unknown paths to `index.html` for client-side routing |
| RLS isolation test (AUTH-07 verification) | Database/Storage (subject under test) | API/Backend (test runner drives it through `supabase-js`, same path the app uses) | Vitest acts as a second, adversarial client against the same RLS policies the app relies on — testing the real enforcement boundary, not a mock |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | 8.3.1 | Build tool / dev server | Confirmed current via `npm view` this session. Matches project-level `STACK.md`. `[VERIFIED: npm registry]` |
| React / react-dom | 19.3.0 | UI library | Confirmed current via `npm view`. `[VERIFIED: npm registry]` |
| TypeScript | 6.0.3 | Type safety | Confirmed this exact version exists and is stable via `npm view typescript@6.0.3` (registry `dist-tags.latest` is `7.0.2`, a Go-native rewrite without a stable programmatic API yet — pin to 6.0.3 per project CLAUDE.md). `[VERIFIED: npm registry]` |
| @vitejs/plugin-react | 6.1.1 | Vite's React plugin (JSX/Fast Refresh) | Confirmed current via `npm view`. `[VERIFIED: npm registry]` |
| react-router-dom | 7.18.4 | Client-side routing | Confirmed current via `npm view`. Data-API (loader) features are usable without a server. `[VERIFIED: npm registry]` |

### Backend / Data

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.117.2 | Postgres/Auth client SDK | Confirmed current via `npm view`. `[VERIFIED: npm registry]` |
| Supabase CLI | via `npx supabase@latest` (no fixed pin — CLI is invoked, not imported) | Migrations, link, push | `supabase link` and `supabase db push` connect directly to the remote DB connection string and do **not** require Docker; `db diff`/`db pull`/`db start` (local shadow/full Postgres) do. Confirmed by fetching `supabase.com/docs/reference/cli/supabase-db-push` and `.../supabase-link` directly this session. `[CITED: supabase.com/docs/reference/cli/supabase-db-push, supabase.com/docs/reference/cli/supabase-link]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | 4.3.3 | Styling | Confirmed current via `npm view`. `[VERIFIED: npm registry]` |
| @tailwindcss/vite | 4.3.3 | Tailwind v4's native Vite plugin | Required for v4's CSS-first config (`@import "tailwindcss"`, no `tailwind.config.js`). Confirmed current via `npm view`. `[VERIFIED: npm registry]` |
| shadcn (CLI) | 4.21.0 | Copy-in component generator | Confirmed current via `npm view`; confirmed against `ui.shadcn.com/docs/installation/vite` that the **stable** `shadcn@latest` CLI has official Tailwind v4 + Vite + React 19 support — no `@canary` tag needed (some 2025-era blog posts still reference canary; that requirement has been absorbed into stable). `[VERIFIED: npm registry]` + `[CITED: ui.shadcn.com/docs/installation/vite]` |
| @phosphor-icons/react | 2.1.10 | Icon set (locked, replaces shadcn's default lucide-react) | Confirmed current via `npm view`. `[VERIFIED: npm registry]` |
| react-i18next | 17.0.15 | React bindings for i18next | Confirmed current via `npm view`. `[VERIFIED: npm registry]` |
| i18next | 26.4.2 | i18n core | Confirmed current via `npm view`. `[VERIFIED: npm registry]` |
| i18next-browser-languagedetector | 8.2.1 | Browser language detection + persistence | Confirmed current via `npm view`. Default detection order is `querystring, cookie, localStorage, sessionStorage, navigator, htmlTag, path, subdomain` — configure `order: ['localStorage', 'navigator']` so a saved choice beats the browser default once one exists. `[VERIFIED: npm registry]` + `[CITED: github.com/i18next/i18next-browser-languageDetector]` |
| react-hook-form | 7.88.0 | Form state | Confirmed current via `npm view`. Auth, add/edit forms. `[VERIFIED: npm registry]` |
| zod | 4.6.5 | Schema validation | Confirmed current via `npm view`. `[VERIFIED: npm registry]` |
| @hookform/resolvers | 5.9.1 | react-hook-form ↔ zod bridge | Confirmed current via `npm view`. 5.x is required for zod 4 compatibility. `[VERIFIED: npm registry]` |
| @tanstack/react-query | 5.103.2 | Server-state caching for Supabase calls | Confirmed current via `npm view`. Wraps library-list/mutation calls with caching and loading/error state, avoiding hand-rolled fetch plumbing across the add/edit/delete flows. `[VERIFIED: npm registry]` |
| sonner | 2.0.8 | Toasts (shadcn's toast primitive) | Confirmed current via `npm view`. Used for note-save-failure/session-expired/delete-failure toasts per UI-SPEC. `[VERIFIED: npm registry]` |
| class-variance-authority, clsx, tailwind-merge | 0.7.1 / 2.1.1 / 3.7.0 | shadcn component utility deps | Auto-installed by the shadcn CLI when components are added; confirmed current via `npm view`. `[VERIFIED: npm registry]` |
| vitest | 5.0.2 | Test runner | Confirmed current via `npm view`. Peer-compatible with Vite 8 (`peerDependencies.vite: "^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0"`, confirmed via `npm view vitest peerDependencies`). `[VERIFIED: npm registry]` |
| dotenv (dev only) | latest | Load `.env.test.local` (service-role key, dev project URL) into the Vitest isolation test | Never imported by app/client code — test-only, gitignored env file. `[ASSUMED]` — standard pattern, not independently verified this session |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `text` + `CHECK` for format/genre slugs | Native Postgres `enum` | Enum gives type safety and slightly smaller storage, but has no `DROP VALUE` — changing the value set means creating a new type, `ALTER TABLE ... USING`, dropping the old type, all under an `ACCESS EXCLUSIVE` lock. Since D-01/D-03 both flag the list as "one-way, may need a data migration," a `CHECK` constraint keeps that migration to a constraint swap instead of a type rewrite |
| `text` + `CHECK` for format/genre slugs | Lookup table (`formats`, `genres` tables with FK) | More flexible (localized labels in DB, runtime activation) but adds a join for every read and this project already keeps labels in the i18n catalog, not the DB (D-01/D-03) — a lookup table would duplicate that source of truth for no benefit at this scale |
| `authors text[]` | `work_authors` child table | Child table is more "correctly normalized" and scales better if per-author metadata (bio, external ID) is ever needed, but adds a join, its own RLS policy, and its own `user_id` denormalization for a project topping out around a few hundred books per user. `text[]` + Postgres `unnest()` satisfies every Phase 5 requirement (per-author listing, counting) without it |
| Direct Supabase client calls | A thin Netlify Function API layer in front of Supabase | Would add a server hop for zero benefit in this phase — there is no secret to hide (Phase 1 has no external API keys) and RLS already does the access-control work `.planning/research/ARCHITECTURE.md` documents this as Anti-Pattern territory (don't add a server tier that has no job) |

**Installation:**
```bash
# Scaffold
npm create vite@latest . -- --template react-ts

# Core runtime deps
npm install react-router-dom@7.18.4 @supabase/supabase-js@2.117.2 @tanstack/react-query@5.103.2
npm install react-hook-form@7.88.0 zod@4.6.5 @hookform/resolvers@5.9.1
npm install react-i18next@17.0.15 i18next@26.4.2 i18next-browser-languagedetector@8.2.1
npm install @phosphor-icons/react@2.1.10

# Styling
npm install tailwindcss@4.3.3 @tailwindcss/vite@4.3.3
npx shadcn@latest init

# Dev dependencies
npm install -D typescript@6.0.3 vitest@5.0.2 @vitejs/plugin-react@6.1.1 dotenv
npm install -D eslint typescript-eslint prettier

# Supabase CLI (no fixed npm dependency — invoke via npx per command)
npx supabase login
npx supabase init
```

**Version verification:** all versions above were confirmed via `npm view <package> version` against the live npm registry on 2026-09-25 (see per-row tags). `typescript@6.0.3` was independently confirmed to exist as a real published stable version (not just a dist-tag guess) via `npm view typescript@6.0.3 version`.

## Package Legitimacy Audit

`gsd_run query package-legitimacy check --ecosystem npm` was run against every runtime/dev package this phase installs. Most flagged `SUS` for the `too-new` reason — this heuristic checks the **latest published version's** date, not the package's age or trustworthiness, and every package below is a top-tier, extremely high-download, officially-repo'd library with an active release cadence (a *good* sign for a package expected to still be maintained in years). All `SUS` verdicts below are assessed as **false positives** against the actual concern the gate protects against (hallucinated/typosquatted packages) and are approved without a `checkpoint:human-verify` gate; the evidence (multi-million weekly downloads, matching official GitHub org, already used in the project-level `.planning/research/STACK.md`) is presented so the planner/reviewer can independently confirm this judgment.

| Package | Registry | Weekly Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-------------------|--------------|---------|-------------|
| react / react-dom | npm | 134.8M / 127.4M | github.com/facebook/react (npm metadata shows `react/react.git`, matches upstream mirror) | SUS (`too-new`) | Approved — false positive, latest patch release is recent, package is 10+ years old |
| vite | npm | 133.9M | github.com/vitejs/vite | SUS (`too-new`) | Approved — false positive |
| @vitejs/plugin-react | npm | 68.9M | github.com/vitejs/vite-plugin-react | SUS (`too-new`) | Approved — false positive |
| react-router-dom | npm | 33.6M | github.com/remix-run/react-router | SUS (`too-new`) | Approved — false positive |
| @supabase/supabase-js | npm | 20.2M | github.com/supabase/supabase-js | SUS (`too-new`) | Approved — false positive; official Supabase org repo, matches project-level STACK.md |
| react-i18next | npm | 11.8M | github.com/i18next/react-i18next | SUS (`too-new`) | Approved — false positive |
| i18next | npm | 16.1M | github.com/i18next/i18next | SUS (`too-new`) | Approved — false positive |
| react-hook-form | npm | 43.3M | github.com/react-hook-form/react-hook-form | SUS (`too-new`) | Approved — false positive |
| zod | npm | 216.5M | github.com/colinhacks/zod | SUS (`too-new`) | Approved — false positive |
| @tanstack/react-query | npm | 49.3M | github.com/TanStack/query | SUS (`too-new`) | Approved — false positive |
| shadcn (CLI) | npm | 6.9M | github.com/shadcn-ui/ui | SUS (`too-new`) | Approved — false positive; CLI tool, not a runtime dependency |
| tailwind-merge | npm | 63.1M | github.com/dcastil/tailwind-merge | SUS (`too-new`) | Approved — false positive; shadcn utility dep |
| vitest | npm | 75.7M | github.com/vitest-dev/vitest | SUS (`too-new`) | Approved — false positive |
| typescript | npm | 214.3M | github.com/microsoft/TypeScript | OK | Approved |
| tailwindcss / @tailwindcss/vite | npm | 97.5M / 36.0M | github.com/tailwindlabs/tailwindcss | OK | Approved |
| i18next-browser-languagedetector | npm | 4.6M | github.com/i18next/i18next-browser-languageDetector | OK | Approved |
| @hookform/resolvers | npm | 36.6M | github.com/react-hook-form/resolvers | OK | Approved |
| @phosphor-icons/react | npm | 3.2M | github.com/phosphor-icons/react | OK | Approved |
| sonner | npm | 39.1M | github.com/emilkowalski/sonner | OK | Approved |
| class-variance-authority | npm | 49.2M | github.com/joe-bell/cva | OK | Approved |
| clsx | npm | 92.0M | github.com/lukeed/clsx | OK | Approved |

**Packages removed due to `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** all `too-new`-flagged packages above are dispositioned "Approved — false positive" per the reasoning stated; no `checkpoint:human-verify` gate is recommended for any package in this phase's dependency list. No `postinstall` scripts were reported for any package checked.

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    BROWSER (Vite SPA, Netlify CDN)                │
│                                                                     │
│   ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐    │
│   │ Auth screens │   │  Library /   │   │ Add/Edit work+copy  │    │
│   │ (signup,     │   │  Copy detail │   │ forms (react-hook-  │    │
│   │  login)      │   │  (route)     │   │ form + zod)          │    │
│   └──────┬───────┘   └──────┬───────┘   └──────────┬──────────┘    │
│          │                  │                       │              │
│          └────────┬─────────┴───────────┬───────────┘              │
│                    ▼                     ▼                          │
│   ┌────────────────────────┐  ┌─────────────────────────────┐     │
│   │ AuthProvider            │  │ i18n (react-i18next) +      │     │
│   │ (session, onAuthState-  │  │ ThemeProvider (system pref, │     │
│   │  Change, protects /     │  │ no-flash inline script)     │     │
│   │  routes)                │  │                              │     │
│   └────────────┬─────────────┘  └─────────────────────────────┘     │
│                │ session JWT (localStorage, auto-refresh)          │
│                ▼                                                    │
│   ┌────────────────────────────────────────────────────────┐      │
│   │   @supabase/supabase-js client (single instance)        │      │
│   │   + @tanstack/react-query wrapping every call            │      │
│   └────────────────────────┬───────────────────────────────┘      │
└────────────────────────────┼──────────────────────────────────────┘
                              │ JWT-authenticated PostgREST calls
                              ▼
              ┌──────────────────────────────────────┐
              │              SUPABASE                 │
              │  ┌──────────────────────────────────┐ │
              │  │ Auth (GoTrue) — email+password,   │ │
              │  │ email confirmation OFF (D-05)     │ │
              │  ├──────────────────────────────────┤ │
              │  │ Postgres + RLS                    │ │
              │  │  works (user_id, title,           │ │
              │  │    authors text[], genre CHECK,   │ │
              │  │    series, series_position)       │ │
              │  │  copies (user_id denormalized,    │ │
              │  │    work_id FK CASCADE, format      │ │
              │  │    CHECK, publisher, note, ...)    │ │
              │  │  trigger: copies.user_id :=        │ │
              │  │    (select user_id from works      │ │
              │  │     where id = NEW.work_id)         │ │
              │  └──────────────────────────────────┘ │
              └──────────────────────────────────────┘
                              ▲
                              │ service-role key (never in client bundle)
              ┌───────────────────────────────────────┐
              │  Vitest isolation test (CI / local)    │
              │  admin client creates/deletes 2 users; │
              │  each user's own client attempts       │
              │  cross-read/write, must fail            │
              └───────────────────────────────────────┘
```

A reader can trace the primary "add a book, see it on the shelf" use case: form submit → `supabase-js` insert (JWT-authenticated) → RLS `WITH CHECK` passes because `user_id = auth.uid()` → trigger sets `copies.user_id` from the parent work → React Query cache invalidates → library grid re-renders. There is no server tier in this phase besides Supabase itself.

### Recommended Project Structure

```
ayrac/
├── src/
│   ├── features/
│   │   ├── auth/                 # signup/login/logout screens, AuthProvider
│   │   ├── library/               # library grid, copy/work detail, siblings
│   │   └── add-book/              # add/edit work+copy forms, work picker (D-08)
│   ├── lib/
│   │   ├── supabase.ts            # single Supabase client instance
│   │   ├── theme.ts                # theme resolve/apply/persist helpers (paired with the inline bootstrap script)
│   │   └── format-genre.ts        # the D-01/D-02/D-03 slug lists, single source shared by zod schemas + i18n key lookups
│   ├── i18n/
│   │   ├── locales/tr.json, en.json
│   │   └── index.ts                # i18next + language-detector setup
│   ├── components/ui/              # shadcn-generated components (not hand-written)
│   └── app/                        # routing (react-router-dom), providers, protected-route wrapper
├── supabase/
│   └── migrations/                 # hand-written SQL, pushed via `supabase db push` to dev AND prod
├── tests/
│   ├── rls-isolation.test.ts       # AUTH-07 two-account isolation test (Vitest, hosted dev project)
│   └── setup/admin-client.ts       # service-role client, test-only, reads from .env.test.local (gitignored)
├── public/
├── .env.example                    # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY placeholders only
├── netlify.toml                    # SPA redirect rule
└── vitest.config.ts
```

### Structure Rationale

- **`lib/format-genre.ts` as a single source of truth for slugs:** D-01/D-02/D-03 lock the slug lists; both the zod validation schema and the i18n label lookup must read from the same array so a slug can never exist in one place without the other.
- **`tests/` separate from `src/`, with its own `setup/admin-client.ts`:** the service-role key must never be importable from any file under `src/` (which gets bundled into the client), so the admin-client helper lives in a directory that is never part of the Vite build.
- **`supabase/migrations/` is the only way schema changes happen** (D-11) — no dashboard clicking. This also satisfies the project-level self-hostability constraint.

### Pattern 1: Denormalized `user_id` with an enforcing trigger (not just a convention)

**What:** `copies.user_id` duplicates `works.user_id`, and a `BEFORE INSERT OR UPDATE OF work_id` trigger sets it from the parent row every time, so it is structurally impossible for `copies.user_id` to drift from its work's owner — this closes the gap `.planning/research/ARCHITECTURE.md` Pattern 2 leaves as "a trigger or app-level guarantee."

**When to use:** Any child table whose ownership is derived through a parent, whenever RLS policies are kept join-free by denormalizing `user_id` onto the child.

**Example:**
```sql
-- Source: standard PostgreSQL trigger syntax (postgresql.org/docs/current/sql-createtrigger.html), applied to this project's schema
create or replace function copies_set_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select user_id into new.user_id from works where id = new.work_id;
  if new.user_id is null then
    raise exception 'work % not found', new.work_id;
  end if;
  return new;
end;
$$;

create trigger copies_set_user_id_trigger
  before insert or update of work_id on copies
  for each row execute function copies_set_user_id();
```
`[ASSUMED]` — the trigger syntax itself is standard, well-documented Postgres (not project-specific), but this exact function/trigger combination was authored for this research session, not copied verbatim from a fetched source; verify it against Postgres 15+ (Supabase's current Postgres major version) during Wave 0.

### Pattern 2: `text` + `CHECK` for controlled vocabularies (D-01/D-03)

**What:** `format text not null check (format in ('standard','graphic_novel','hardcover','pocket','special_edition','other'))` and `genre text check (genre in (...))` (nullable per D-04).

**When to use:** Any fixed-but-possibly-evolving vocabulary where the *labels* live outside the database (here: in the i18n catalogs, per D-01/D-03) and the DB's only job is to reject invalid slugs.

**Trade-offs:** A native `enum` type is marginally more storage-efficient and gives ordering for free, but PostgreSQL has no `DROP VALUE` — removing or renaming a value requires creating a new type, rewriting the column with `USING`, and dropping the old type, all under an `ACCESS EXCLUSIVE` lock. A `CHECK` constraint change is `ALTER TABLE ... DROP CONSTRAINT ...; ALTER TABLE ... ADD CONSTRAINT ...` — no table rewrite. Since D-01/D-03 both explicitly flag the slug list as "one-way, may need a data migration" if it changes, this minimizes the mechanical cost of that future migration. `[CITED: crunchydata.com/blog/enums-vs-check-constraints-in-postgres, cybertec-postgresql.com/en/lookup-table-or-enum-type]` — MEDIUM confidence, cross-checked across 3 independent Postgres-focused sources during this session's web search.

**Example:**
```sql
-- Source: this session's research synthesis of the enum-vs-check tradeoff
alter table copies add constraint copies_format_check
  check (format in ('standard','graphic_novel','hardcover','pocket','special_edition','other'));

alter table works add constraint works_genre_check
  check (genre is null or genre in (
    'novel','short_stories','poetry','drama','essay','classics','science_fiction',
    'fantasy','crime','humor','children','biography','history','philosophy',
    'psychology','politics_society','religion_mythology','science','art',
    'self_help','travel','other'
  ));
```

### Pattern 3: RLS policies + Supabase CLI without Docker (D-10/D-11)

**What:** Enable RLS on every table at creation; write per-operation policies scoped to `user_id = auth.uid()`; author every schema change as a hand-written SQL file under `supabase/migrations/`, pushed with the CLI directly against each hosted project's connection string.

**When to use:** Every table from the first migration — never as a follow-up.

**Docker boundary, confirmed via official CLI reference docs this session:**

| Command | Needs Docker? | Why |
|---|---|---|
| `supabase login` | No | Browser OAuth / stores a token locally |
| `supabase init` | No | Scaffolds local config files only |
| `supabase migration new <name>` | No | Creates an empty timestamped `.sql` file under `supabase/migrations/` — pure file I/O |
| `supabase link --project-ref <ref>` | No | Fetches project config from the Supabase platform, stores DB password in native credential storage `[CITED: supabase.com/docs/reference/cli/supabase-link]` |
| `supabase db push` | **No** | Connects directly to the remote DB via connection string, applies pending migrations in order against `supabase_migrations.schema_migrations` `[CITED: supabase.com/docs/reference/cli/supabase-db-push]` |
| `supabase db diff` | **Yes** | Spins up a local shadow Postgres in Docker to compute a schema diff |
| `supabase db pull` | **Yes** | Same shadow-DB mechanism as `db diff` |
| `supabase start` (full local stack) | **Yes** | Runs the entire local Supabase stack in Docker containers |

**Two-project workflow (D-10):**
```bash
npx supabase login
npx supabase init
npx supabase migration new init_schema
# hand-edit supabase/migrations/<timestamp>_init_schema.sql

npx supabase link --project-ref <dev-project-ref>
npx supabase db push

npx supabase link --project-ref <prod-project-ref>
npx supabase db push
```
Both projects apply the exact same migration files — no schema drift between dev and prod, no dashboard SQL editor use (D-11).

### Pattern 4: Session persistence via `supabase-js` defaults (AUTH-05)

**What:** `createClient(url, anonKey, { auth: { persistSession: true, storage: localStorage, autoRefreshToken: true } })` — `persistSession` + the default `localStorage` adapter are what makes the session survive a full browser restart; `autoRefreshToken` keeps the JWT valid while a tab is in the foreground.

**When to use:** Always, for this project — no custom session-storage code needed.

**Example:**
```typescript
// src/lib/supabase.ts
// Source: this session's synthesis of supabase-js documented auth client options
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // no OAuth redirect flow in Phase 1
    },
  }
)
```
`[CITED: supabase.com/docs/reference/javascript, cross-checked via web search this session]` — MEDIUM confidence (options list matches multiple independent sources, not fetched from the live JS client reference page directly this session).

### Pattern 5: No-flash theme bootstrap (UI-02)

**What:** A tiny inline `<script>` in `index.html`'s `<head>`, before the bundle loads, reads a persisted theme choice from `localStorage` and falls back to `window.matchMedia('(prefers-color-scheme: dark)')`, then sets a class/attribute on `<html>` synchronously — this is the only way to avoid a flash of the wrong theme in a plain Vite SPA (no SSR to inject the right class server-side).

**Example:**
```html
<!-- index.html, inside <head>, immediately after charset/viewport -->
<!-- Source: this session's synthesis of the documented flicker-free-dark-mode pattern for Vite SPAs -->
<script>
  (function () {
    var stored = localStorage.getItem('ayrac-theme'); // 'light' | 'dark' | null (= system)
    var isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
  })();
</script>
```
`[CITED: dev.to/izznatsir/flicker-free-dark-mode-in-vite-spa, dev.to/gaisdav/how-to-prevent-theme-flash-in-a-react-instant-dark-mode-switching]` — MEDIUM confidence, cross-checked 2 independent sources.

### Pattern 6: i18n language detection with saved-choice priority (UI-01)

**What:** `i18next-browser-languagedetector` defaults to `order: ['querystring','cookie','localStorage','sessionStorage','navigator','htmlTag','path','subdomain']`; explicitly set `order: ['localStorage', 'navigator']` and `caches: ['localStorage']` so the browser's language is only used the *first* visit, and every visit after the user picks a language, the saved choice wins. Also set `<html lang>` from the resolved locale per the UI-SPEC cross-cutting rule (Turkish uppercase folding requires it).

**Example:**
```typescript
// src/i18n/index.ts
// Source: this session's synthesis of i18next-browser-languageDetector's documented options
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import tr from './locales/tr.json'
import en from './locales/en.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { tr: { translation: tr }, en: { translation: en } },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ayrac-lng',
    },
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export default i18n
```

### Pattern 7: Netlify SPA redirect + per-context env vars

**What:** A catch-all `netlify.toml` rewrite so client-side routes (`/kitap/:copyId`, etc.) don't 404 on direct load/refresh, plus Netlify's per-deploy-context environment variable scoping (set in the Netlify UI, not `netlify.toml`, since these are not secrets that belong in the repo but do differ by environment) to point Production at the `prod` Supabase project and Deploy Previews/local dev at the `dev` project.

**Example:**
```toml
# netlify.toml
# Source: this session's synthesis of Netlify's documented SPA rewrite pattern
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set in the Netlify dashboard under **Site configuration → Environment variables**, with a different value per deploy context (Production vs. Deploy Previews) selectable from a dropdown — no plugin or extra `netlify.toml` config needed. `[CITED: docs.netlify.com/build/environment-variables/overview, netlify.com/blog/scopes-and-contextual-values-for-environment-variables]` — MEDIUM confidence, cross-checked 3 sources.

### Anti-Patterns to Avoid

- **Enabling RLS with no policy and calling it "secure":** returns zero rows for everyone, looks like "it's private" in single-account testing, is actually just broken — always pair `enable row level security` with explicit per-operation policies in the same migration, and verify with the two-account test, not a single account. (`.planning/research/PITFALLS.md` Pitfall 5)
- **A server-side ownership check instead of relying on RLS:** this phase has no Netlify Function and needs none — every write goes straight from `supabase-js` to Postgres with RLS as the only gate. Adding an app-level check duplicates the enforcement point and is a place for it to drift from the real policy.
- **Using `service_role` key anywhere reachable from the browser bundle**, including as a `VITE_`-prefixed env var. It belongs only in `.env.test.local` (gitignored, test-only) or a CI secret store for the isolation test's admin client.
- **Native Postgres `enum` for format/genre** — see Pattern 2 trade-off above; avoid given D-01/D-03's explicit "one-way, may migrate" framing.
- **Running the Vitest isolation test suite in parallel:** Vitest's default parallel test execution can race against Supabase FK constraints/cleanup ordering when multiple tests create/delete the same throwaway accounts; configure the isolation-test file (or its whole file) to run sequentially. `[CITED: index.garden/supabase-vitest, cross-checked via web search this session]`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-user data isolation | An app-level `WHERE user_id = ?` check on every query | Postgres RLS policies (`user_id = auth.uid()`) | RLS is enforced at the database layer regardless of which code path reaches the table — an app-level check is one query away from being forgotten, RLS is not |
| Session storage / refresh | A custom `localStorage` wrapper + manual token-refresh timer | `supabase-js`'s built-in `persistSession`/`autoRefreshToken` | Already handles tab-focus-aware refresh, race-condition prevention, and storage — re-implementing it risks subtly breaking AUTH-05 |
| Form validation | Hand-rolled required-field/type checks scattered across components | react-hook-form + zod, one schema shared between the work-form and the copy-form | Centralizes the D-01/D-02/D-03 slug validation and the required-field rules (per UI-SPEC's "Bu alan zorunlu." copy) in one place |
| Password hashing / auth security | Any custom auth logic | Supabase Auth (GoTrue) | Password hashing, session tokens, and rate limiting on auth endpoints are handled server-side by Supabase; never reimplement |
| Theme toggling | A React Context re-render loop that flips classes after mount | The inline pre-paint script (Pattern 5) + a thin React state that reads the already-applied class on mount | A React-only solution cannot run before first paint — the flash is unavoidable without the inline script |

**Key insight:** every "don't hand-roll" item above exists because this phase's two truly hard requirements — provable per-user isolation (AUTH-07) and no theme/language flash (UI-02/UI-01) — have off-the-shelf, correctly-tested solutions (RLS, `supabase-js` defaults, an inline bootstrap script) that a hand-rolled equivalent would take significant effort to match and would be exactly the kind of subtle bug this phase's own automated isolation test is designed to catch.

## Common Pitfalls

### Pitfall 1: RLS enabled, but the ownership-sync trigger is missing or wrong

**What goes wrong:** `copies.user_id` is set from client-supplied data (or left to default) instead of being derived from the parent `works.user_id`, so a manipulated request could insert a copy with a `user_id` that doesn't match its work — either silently orphaning the copy from RLS visibility or, worse, attaching it to another user's `works` row if the FK check alone doesn't catch it.

**Why it happens:** Denormalization for RLS performance (Pattern 2 in project ARCHITECTURE.md) is usually described as "a trigger *or* an app-level guarantee" — the app-level version is easy to reach for first and easy to forget on one of the two insert paths (D-07's two copy-add entry points).

**How to avoid:** Use the enforcing trigger from Pattern 1 above so it's structurally impossible to set `copies.user_id` to anything but the parent work's owner, regardless of which code path performs the insert. Cover both D-07 entry points (add-form-with-picker, and the copy-detail "Yeni nüsha ekle" flow) in the isolation test.

**Phase to address:** This phase — the trigger must exist before the AUTH-07 isolation test can be considered to have actually verified anything.

### Pitfall 2: Trying to run `db diff`/`db pull`/`start` without Docker, on a machine that doesn't have it (D-10)

**What goes wrong:** The dev machine has no Docker installed (explicit in D-10). If a task in the plan reaches for `supabase db diff` to "check what changed" or `supabase start` for a "quick local test," it fails with a Docker-not-found error, and the failure mode looks like a Supabase CLI bug rather than a command-selection mistake.

**How to avoid:** Only use `supabase migration new` (file scaffold), `supabase link`, and `supabase db push` in this phase's plan — confirmed Docker-free per Pattern 3. If a schema-diff-against-remote need ever arises, do it by hand (compare the migration file to the intended schema) rather than reaching for `db diff`.

**Phase to address:** This phase, in the plan's task descriptions — name the exact CLI commands, not "use the Supabase CLI to migrate."

### Pitfall 3: Isolation test creates real orphaned test users in the `dev` project if cleanup fails mid-test

**What goes wrong:** A test that creates two throwaway accounts via the service-role admin client, then fails an assertion partway through, can leave those accounts (and any rows they created) behind in the `dev` project if cleanup is only in a "happy path" `afterAll`. Repeated CI runs then accumulate junk accounts.

**How to avoid:** Use `afterEach`/`afterAll` cleanup that runs regardless of test outcome (Vitest's `afterAll` runs even on failure by default), and give test accounts an identifiable, greppable email pattern (e.g. `isolation-test-+{timestamp}@ayrac.test`) so a manual sweep is possible if automated cleanup is ever skipped.

**Phase to address:** This phase, in the Vitest isolation-test file itself.

### Pitfall 4: `text-transform: uppercase` badges/labels break under the wrong `lang` attribute

**What goes wrong:** The UI-SPEC's cross-cutting rule requires `<html lang>` to track the active locale specifically because CSS uppercase-folding of Turkish `ı`/`İ` only behaves correctly under `lang="tr"`. If the i18n setup (Pattern 6) doesn't sync `document.documentElement.lang` on every language change (not just at boot), badges/labels will silently render with the wrong casing after a language switch without a page reload.

**How to avoid:** Wire `i18n.on('languageChanged', ...)` to set `document.documentElement.lang`, as shown in Pattern 6, not just a one-time set at app boot.

**Phase to address:** This phase (UI-01 cross-cutting rule).

### Pitfall 5: CHECK-constraint slug drift between DB, zod schema, and i18n catalog

**What goes wrong:** D-01/D-02/D-03 slugs are hand-maintained in three places conceptually (the migration's `CHECK` list, the zod enum used by the add/edit form, the i18n key lookup) — if a slug is added/renamed in only one of the three, the form either lets an invalid value through client-side (rejected at insert with an opaque Postgres constraint error) or a stored value has no display label (renders `undefined`/the raw slug).

**How to avoid:** Define the slug list once, in `src/lib/format-genre.ts` (see Project Structure), export a zod `z.enum([...])` derived from it for form validation, and use the same array to generate/verify the i18n keys exist. The migration's `CHECK` list is the one place that can't literally import that TS file (SQL can't `require()`), so add a comment in the migration linking back to `format-genre.ts` and treat any future slug change as "edit both, in the same commit."

**Phase to address:** This phase, and every phase touching this vocabulary afterward (Phase 3 import mapping, Phase 4 API genre mapping, Phase 5 shelves).

### Pitfall 6 (inherited from project-level pitfalls, phase-specific angle): Turkish `toLocaleLowerCase('tr')` still needs a real Turkish locale test word in the work picker (D-09)

**What goes wrong:** D-09's simple substring picker relies on `toLocaleLowerCase('tr')` for its matching — this is *more* correct than bare `.toLowerCase()` but the project-level `PITFALLS.md` already documents that `toLocaleLowerCase('tr')` alone can still leave the combining-dot edge case (`'İ'.toLocaleLowerCase('tr')` behavior varies by JS engine) in some cases. Since D-09 explicitly defers *full* Turkish folding to Phase 2, this is an accepted, scoped gap — but it must not be silently assumed to be "already correct" when Phase 2 builds the real `normalize.ts`.

**How to avoid:** Test the picker with at least one word from PITFALLS.md's known-gotcha list (İstanbul, Nutuk, Işık) during this phase's UAT so the *scoped* limitation (misses only Turkish-specific edge cases, not ASCII substrings) is confirmed rather than assumed, and note in code that this is intentionally superseded by Phase 2.

**Phase to address:** This phase (UAT), formally fixed in Phase 2.

## Code Examples

### Full schema migration (works/copies with RLS, trigger, CHECK constraints)

```sql
-- supabase/migrations/<timestamp>_init_schema.sql
-- Source: this session's synthesis of Architecture Pattern 1/2 + project-level ARCHITECTURE.md Pattern 2

create table works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  authors text[] not null default '{}',
  genre text,
  series text,
  series_position numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table copies (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  user_id uuid not null,                     -- set by trigger, never client-supplied
  format text not null,
  publisher text,
  edition_title text,                        -- e.g. "Gençler İçin Fotoğraflarla Nutuk" under work "Nutuk"
  volume_coverage text,                       -- schema-complete for Phase 6 series omnibus support; unused UI in Phase 1
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table copies add constraint copies_format_check
  check (format in ('standard','graphic_novel','hardcover','pocket','special_edition','other'));

alter table works add constraint works_genre_check
  check (genre is null or genre in (
    'novel','short_stories','poetry','drama','essay','classics','science_fiction',
    'fantasy','crime','humor','children','biography','history','philosophy',
    'psychology','politics_society','religion_mythology','science','art',
    'self_help','travel','other'
  ));

create or replace function copies_set_user_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select user_id into new.user_id from works where id = new.work_id;
  if new.user_id is null then
    raise exception 'work % not found', new.work_id;
  end if;
  return new;
end;
$$;

create trigger copies_set_user_id_trigger
  before insert or update of work_id on copies
  for each row execute function copies_set_user_id();

alter table works enable row level security;
alter table copies enable row level security;

create policy "own works select" on works for select using (user_id = auth.uid());
create policy "own works insert" on works for insert with check (user_id = auth.uid());
create policy "own works update" on works for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own works delete" on works for delete using (user_id = auth.uid());

create policy "own copies select" on copies for select using (user_id = auth.uid());
create policy "own copies insert" on copies for insert with check (user_id = auth.uid());
create policy "own copies update" on copies for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own copies delete" on copies for delete using (user_id = auth.uid());

create index copies_work_id_idx on copies(work_id);
create index works_user_id_idx on works(user_id);
create index copies_user_id_idx on copies(user_id);
```
`[ASSUMED]` for the exact column set/constraint combination (authored this session for this project's specific schema, not copied verbatim from a single fetched source) — the RLS policy shape itself is `[CITED: supabase.com/docs/guides/troubleshooting/rls-simplified-BJTcS8]`, cross-checked against project-level `ARCHITECTURE.md` Pattern 2.

### Two-account RLS isolation test skeleton (AUTH-07)

```typescript
// tests/rls-isolation.test.ts
// Source: this session's synthesis of the admin-client + per-user-client testing pattern
// (index.garden/supabase-vitest, axonbuild.com/blog/how-to-test-supabase-rls — cross-checked)
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const url = process.env.VITE_SUPABASE_URL!
const anonKey = process.env.VITE_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // .env.test.local, gitignored; never in client code

const admin = createClient(url, serviceRoleKey)

async function createTestUser(emailPrefix: string) {
  const email = `${emailPrefix}-${Date.now()}@ayrac.test`
  const password = 'Test-Password-123!'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  const client = createClient(url, anonKey)
  await client.auth.signInWithPassword({ email, password })
  return { client, userId: data.user!.id, email }
}

describe('AUTH-07: two-account RLS isolation', () => {
  let userA: Awaited<ReturnType<typeof createTestUser>>
  let userB: Awaited<ReturnType<typeof createTestUser>>
  let workAId: string

  beforeAll(async () => {
    userA = await createTestUser('isolation-a')
    userB = await createTestUser('isolation-b')
    const { data } = await userA.client
      .from('works').insert({ title: 'A-only work', authors: ['Test Author'] })
      .select().single()
    workAId = data!.id
  })

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userA.userId)
    await admin.auth.admin.deleteUser(userB.userId)
  })

  it('user B cannot select user A\'s work', async () => {
    const { data, error } = await userB.client.from('works').select().eq('id', workAId)
    expect(error).toBeNull()
    expect(data).toEqual([]) // RLS silently filters, not an error
  })

  it('user B cannot update user A\'s work', async () => {
    const { data, error } = await userB.client.from('works').update({ title: 'hacked' }).eq('id', workAId).select()
    expect(error).toBeNull()
    expect(data).toEqual([]) // 0 rows affected, not a thrown error
  })

  it('user B cannot insert a copy under user A\'s work', async () => {
    const { error } = await userB.client.from('copies').insert({ work_id: workAId, format: 'standard' })
    expect(error).not.toBeNull() // trigger looks up work_id, RLS WITH CHECK rejects mismatched user_id
  })
})
```
Run this file sequentially (`vitest.config.ts` → `test.sequence.concurrent: false` for this file, or `describe.sequential`) to avoid the FK/cleanup races noted in Anti-Patterns.

### netlify.toml, .env.example, and vite env typing

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

```bash
# .env.example — committed, placeholders only
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

```bash
# .env.test.local — gitignored, test-only, never bundled
VITE_SUPABASE_URL=https://your-dev-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `shadcn@canary` required for React 19 + Tailwind v4 support | `shadcn@latest` (stable, currently 4.21.0) has this support natively | Absorbed into stable sometime in 2025; confirmed against `ui.shadcn.com/docs/installation/vite` this session | Plan/executor should use `npx shadcn@latest init`, not chase a canary tag some older tutorials still reference |
| `tailwind.config.js` + PostCSS plugin | CSS-first config (`@import "tailwindcss"` + `@theme` in CSS, `@tailwindcss/vite` plugin) | Tailwind v4 (2025) | No `tailwind.config.js`/PostCSS setup needed for this phase |
| TypeScript's JS-based compiler as the only option | TS 7's Go-native compiler exists (`typescript@7.0.2`) but lacks a stable programmatic API | TS 7.0 released July 2026; 7.1 (with the new API) targeted Nov 2026 | Stay on `typescript@6.0.3` for this phase — confirmed to exist and be current via `npm view` this session |
| Manually diffing local vs. remote schema with `supabase db diff` (needs Docker) | Hand-written migrations + `supabase db push` (no Docker) | N/A — always been true, just under-documented in most tutorials that assume local Docker development | Confirms D-10's no-Docker constraint is achievable without workarounds |

**Deprecated/outdated:** None specific to this phase beyond the shadcn canary-tag note above.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | The exact `copies_set_user_id` trigger function/schema shape (Code Examples, Pattern 1) — standard Postgres trigger syntax, but this specific function body was authored for this session, not fetched from a working example | Architecture Patterns, Code Examples | Low — syntax errors would surface immediately when the migration is applied via `db push`; verify against Supabase's current Postgres major version during Wave 0 |
| A2 | `supabase-js` session-persistence option shape (`persistSession`, `autoRefreshToken`, `detectSessionInUrl`) — cross-checked via web search, not fetched from the live `supabase.com/docs/reference/javascript` client-options page directly | Architecture Patterns Pattern 4 | Low — these are among the most stable, long-documented `supabase-js` options; if a field name has changed, TypeScript's own type-checking against `@supabase/supabase-js`'s types will catch it immediately at build time |
| A3 | `dotenv` as the mechanism for loading `.env.test.local` into the Vitest isolation test | Standard Stack | Low — Vitest has multiple equally-valid ways to load env files (its own `envDir` config, `dotenv`, `dotenv-flow`); any of them satisfies the "service-role key never in client bundle" requirement, this is an implementation detail |
| A4 | Recommendation to set Supabase Auth minimum password length to 8 (Supabase's own docs recommend "anything less than 8 is not recommended," default is 6) | Manual Setup Steps | Low — this is Supabase's own stated recommendation, not a contested claim, but the exact value (8 vs. a longer minimum) is this session's judgment call, not a locked requirement |
| A5 | `i18next-browser-languagedetector`'s exact default `order` array (`querystring, cookie, localStorage, sessionStorage, navigator, htmlTag, path, subdomain`) — from the library's GitHub README/DeepWiki summary, not the npm-published README fetched directly | Architecture Patterns Pattern 6 | Low — even if the exact default order differs slightly, the recommended override (`order: ['localStorage', 'navigator']`) is explicit and doesn't depend on knowing the default precisely |

**If this table is empty:** N/A — see entries above. All other claims in this document are either `[VERIFIED: npm registry]` (package versions, checked live this session) or `[CITED: ...]` (fetched/cross-checked against official docs or 2+ independent sources this session).

## Open Questions (RESOLVED)

1. **Exact Supabase Postgres major version on new free-tier projects in 2026** — RESOLVED (planning, 01-04): non-blocking; the executor records the dashboard-reported version in the header comment of `supabase/migrations/20260926120000_init_schema.sql`, and the trigger/functions use only syntax valid on Postgres 13–17.
   - What we know: Supabase has run Postgres 15+ for some time; the trigger syntax in Code Examples is standard PL/pgSQL that has worked unchanged across Postgres 13–17.
   - What's unclear: The exact version assigned to a newly created free-tier project today was not queried this session (would require actually creating the `dev` project, a manual step — see below).
   - Recommendation: Non-blocking. Confirm the version shown in the Supabase dashboard once the `dev` project is created (Manual Setup Steps), and note it in the migration file's header comment for future reference.

2. **Whether Netlify Deploy Previews should point at `dev` or `prod` Supabase project (CONTEXT.md discretion item)** — RESOLVED (planning, 01-07): Deploy Previews and Branch deploys → `dev`, Production → `prod`, via Netlify per-context env vars (Claude's discretion per CONTEXT.md).
   - What we know: This session's research recommends Deploy Previews → `dev` (keeps unreviewed preview builds away from the author's real library) via Netlify's per-context env var scoping (Pattern 7).
   - What's unclear: Whether the user has a preference for previews to show real prod data during review (unlikely given D-13's "prod = author's real library" framing, but not explicitly ruled out in CONTEXT.md).
   - Recommendation: Default to Deploy Previews → `dev`; flag as a one-line confirmation during planning rather than blocking on it.

## Manual Setup Steps (Cannot Be Automated by the Executor)

These require dashboard access, account credentials, or interactive OAuth the executor agent cannot perform from the CLI:

1. **Create two Supabase projects** (`dev`, `prod`) via the Supabase dashboard — project creation ties to the user's account/org and (per D-10) uses both free-tier project slots.
2. **Run `supabase login` interactively** once, locally — opens a browser OAuth flow; the resulting token is stored in native credential storage and reused by subsequent `supabase link`/`db push` calls. (A non-interactive `SUPABASE_ACCESS_TOKEN` env var is an alternative if the user prefers to generate a personal access token from the dashboard instead.)
3. **Copy each project's `anon` key, URL, and `service_role` key** from Supabase dashboard → Project Settings → API, into `.env.local` (client) and `.env.test.local` (service-role, test-only) — both gitignored.
4. **Set Auth → Providers → Email → "Confirm email" to OFF** on both `dev` and `prod` projects (D-05).
5. **Set Auth → Providers → Email → minimum password length to 8** on both projects (research recommendation, resolves the CONTEXT.md discretion item; Supabase's own docs state the 6-character default is weaker than recommended).
6. **Create the Netlify site** and connect it to the GitHub repo (or configure manual deploys).
7. **Set Netlify environment variables** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) per deploy context in the Netlify dashboard (Site configuration → Environment variables) — Production → `prod` project values, Deploy Previews/Branch deploys → `dev` project values.
8. **Verify GitHub secret scanning + push protection are enabled** on the repo (Settings → Code security) — on by default for public repos, but the repo isn't yet confirmed public/pushed, so this should be explicitly checked once it is.
9. **Store the `dev` project's `service_role` key as a CI secret** (e.g. a GitHub Actions repository secret) if the AUTH-07 isolation test is wired into CI in this phase or a later one — never as a plain committed value.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js / npm | Vite build, all tooling | Not checked this session (no shell probe requested against the dev machine beyond `npm view` registry calls, which confirms npm itself is present and network-reachable) | — | — |
| Docker | Explicitly NOT required for this phase's Supabase workflow (Pattern 3) | N/A by design | — | D-10 already accounts for this — no fallback needed, the no-Docker path is the primary path |
| Git | Version control, already in use | ✓ (repo is an active git repo per project state) | — | — |
| Supabase CLI | Migrations, link, push | Invoked via `npx supabase@latest` — no persistent install required, `npx` resolves and runs it on demand | latest | — |

**Missing dependencies with no fallback:** none identified — the phase's tooling is npm-installable or npx-invocable, and the one traditionally-Docker-dependent piece (Supabase CLI) has a confirmed Docker-free path for every command this phase needs.

**Missing dependencies with fallback:** none beyond the Docker note above (which isn't "missing," it's "intentionally unused").

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 5.0.2 (peer-compatible with Vite 8.3.1) |
| Config file | none yet — `vitest.config.ts` is a Wave 0 gap |
| Quick run command | `npx vitest run tests/ --exclude tests/rls-isolation.test.ts` (fast, no network) |
| Full suite command | `npx vitest run` (includes the RLS isolation test against the hosted `dev` project — requires `.env.test.local`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| AUTH-01 | Sign up with email+password | manual (UAT) — optionally supplement with an integration smoke test | manual walkthrough | N/A — no component/e2e framework in this phase's stack |
| AUTH-02 | Log in / log out | manual (UAT) | manual walkthrough | N/A |
| AUTH-05 | Session persists across browser restart | manual (UAT) — genuinely requires closing/reopening a real browser, not automatable with Vitest alone (no Playwright/browser-automation dep in this phase's stack) | manual walkthrough (close browser fully, reopen, confirm still logged in) | N/A |
| AUTH-07 | Two-account isolation, every table | **automated** | `npx vitest run tests/rls-isolation.test.ts` | ❌ Wave 0 — file described in Code Examples, must be created |
| LIB-01 | Work/copy schema completeness (all fields incl. series, volume coverage, edition title) | automated (schema-level) — a simple insert-and-read-back test asserting every column round-trips | `npx vitest run tests/schema.test.ts` | ❌ Wave 0 |
| LIB-02 | Multiple copies per work | automated — covered by the same schema test (insert 2 copies under 1 work, assert both readable) | `npx vitest run tests/schema.test.ts` | ❌ Wave 0 (same file as LIB-01) |
| LIB-06 | Work detail page shows every copy | manual (UAT) | manual walkthrough | N/A |
| LIB-08 | Edit work/copy | manual (UAT) | manual walkthrough | N/A |
| LIB-09 | Delete with confirmation | manual (UAT) | manual walkthrough | N/A |
| LIB-10 | Every copy is its own tile | manual (UAT, visual) | manual walkthrough | N/A |
| ADD-02 | Manual add form | manual (UAT) | manual walkthrough | N/A |
| READ-04 | Note field | manual (UAT) | manual walkthrough | N/A |
| UI-01 | TR/EN switching, default+persistence | manual (UAT) — walk every screen in both languages per PITFALLS.md's "i18n retrofit" checklist item | manual walkthrough | N/A |
| UI-02 | Light/dark theme, system default | manual (UAT) — visually confirm no flash on cold load in both OS theme settings | manual walkthrough | N/A |
| UI-03 | Responsive phone/desktop | manual (UAT) | manual walkthrough | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/ --exclude tests/rls-isolation.test.ts` (fast subset, no network dependency)
- **Per wave merge:** `npx vitest run` (full suite, including the hosted-`dev`-project isolation test)
- **Phase gate:** Full suite green, plus the manual UAT walkthrough for every `manual (UAT)` row above, before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — base config, plus `test.sequence.concurrent: false` or an equivalent scoped to `tests/rls-isolation.test.ts`
- [ ] `tests/setup/admin-client.ts` — service-role client factory reading from `.env.test.local` (gitignored)
- [ ] `tests/rls-isolation.test.ts` — AUTH-07, per Code Examples skeleton above
- [ ] `tests/schema.test.ts` — LIB-01/LIB-02 round-trip coverage (insert a work with every field populated + 2 copies, read back, assert all fields incl. `series_position`, `edition_title`, `volume_coverage`)
- [ ] `.env.test.local.example` (or a documented section in `.env.example`) listing the three test-only variables without values, so self-hosters know what the isolation test needs
- [ ] Framework install: `npm install -D vitest@5.0.2 dotenv` (dotenv or equivalent for loading `.env.test.local`)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | yes | Supabase Auth (GoTrue) email+password; minimum password length raised to 8 via dashboard config (Manual Setup Steps) |
| V3 Session Management | yes | `supabase-js` JWT session in `localStorage`, `autoRefreshToken` — never hand-rolled (Don't Hand-Roll) |
| V4 Access Control | yes | Postgres RLS, `user_id = auth.uid()` per table, denormalized + trigger-enforced on `copies` (Pattern 1) |
| V5 Input Validation | yes | zod schemas (react-hook-form + `@hookform/resolvers`) client-side; `CHECK` constraints DB-side as the trust boundary of record (Pattern 2) |
| V6 Cryptography | yes (delegated) | Password hashing and JWT signing handled entirely by Supabase Auth — never hand-rolled, no custom crypto in this phase |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Cross-user data read/write (IDOR) — fetching/mutating another user's work or copy by guessing/enumerating its UUID | Elevation of Privilege / Information Disclosure | RLS policies on every table, verified by the AUTH-07 automated two-account isolation test (this is the entire point of that test) |
| RLS silently disabled or missing a policy on a newly added table | Elevation of Privilege | Every migration that creates a table in the same file also enables RLS and writes all four (select/insert/update/delete) policies — never split across migrations; the isolation test should be extended for any new table added in a later phase, not just re-run as-is |
| `service_role` key leaking into the client bundle or committed history | Elevation of Privilege / Information Disclosure | Key lives only in `.env.test.local` (gitignored) or a CI secret; never referenced from any file under `src/`; `.gitignore` covers env files from the first commit; GitHub push protection as a backstop (Manual Setup Steps item 8) |
| SQL injection | Tampering | Not directly exposed — all queries go through PostgREST via `supabase-js`'s query builder (parameterized), not raw SQL string concatenation from user input |
| Stored XSS via user-entered title/author/note text | Tampering | React's default JSX escaping; never use `dangerouslySetInnerHTML` on any work/copy field (title, author names, note) |
| Secrets committed to git history before `.gitignore` exists | Information Disclosure | `.gitignore` and `.env.example` must exist from the first commit of the scaffold — this is explicitly the phase's "Secrets hygiene gate" note in ROADMAP.md |

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view <package> version` / `dist-tags` / `peerDependencies`), fetched live this session, for every package version cited in `## Standard Stack` and `## Package Legitimacy Audit`
- `gsd_run query package-legitimacy check --ecosystem npm` — direct tool output for the Package Legitimacy Audit section

### Secondary (MEDIUM confidence, cross-checked or official docs fetched directly)
- `supabase.com/docs/reference/cli/supabase-db-push` (fetched directly this session) — Docker requirement, connection mechanism
- `supabase.com/docs/reference/cli/supabase-link` (fetched directly this session) — Docker requirement, credential flow
- `ui.shadcn.com/docs/installation/vite` (fetched directly this session) — stable CLI, no canary needed, exact setup steps
- Web search, cross-checked 2-3+ independent sources each: Supabase RLS trigger patterns, i18next-browser-languagedetector default order, supabase-js session-persistence options, Vitest+Supabase RLS testing pattern, no-flash theme bootstrap pattern, gitleaks/GitHub push protection setup, Postgres CHECK vs enum vs lookup table, Netlify SPA redirects, Netlify per-context env vars, Supabase Auth password-length default/recommendation
- `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md`, `.planning/research/STACK.md`, `.planning/research/SUMMARY.md` — project-level research this phase builds on directly, not re-derived

### Tertiary (LOW confidence, single web search pass, flagged for validation)
- Exact trigger function body in Code Examples (A1 in Assumptions Log)
- `i18next-browser-languagedetector`'s precise default `order` array (A5)
- `dotenv` as the specific env-loading mechanism for tests (A3)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version verified live against the npm registry this session
- Architecture: MEDIUM-HIGH — RLS/trigger/CHECK-constraint patterns are standard and cross-checked, but the exact schema in Code Examples was authored for this session, not copied from a single verified source
- Pitfalls: HIGH — inherited from project-level `PITFALLS.md` (already HIGH-confidence, tested/documented) plus phase-specific pitfalls reasoned directly from the locked CONTEXT.md decisions
- Supabase CLI Docker boundary: HIGH — confirmed by fetching the official CLI reference pages directly this session, resolving what was an open question in the phase's research brief

**Research date:** 2026-09-25
**Valid until:** 2026-10-25 (30 days — package versions and CLI behavior in this ecosystem move fast; re-verify `npm view` output and the shadcn/Supabase CLI docs if planning is delayed past this window)

---
*Phase: 01-private-shelf-walking-skeleton*
*Research completed: 2026-09-25*
