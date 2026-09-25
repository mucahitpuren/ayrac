# Walking Skeleton — Ayraç

**Phase:** 1
**Generated:** 2026-09-26

## Capability Proven End-to-End

A new user signs up with email and password, lands in their own RLS-scoped library read from the
hosted Supabase `dev` project, and the same build is served from a live `*.netlify.app` URL wired to
the `prod` project (tracer: plan 01-04; live: plan 01-07).

The whole-application tracer is spread over the first plans because the repo is greenfield:
01-01 scaffold → 01-02 backend provisioned → 01-03 design system → **01-04 tracer (first task that
crosses every layer: UI → supabase-js → Auth → Postgres RLS → UI)** → 01-07 deployed. Every later
plan (01-05, 01-08 … 01-11) is an expansion slice on top of it and does not change a decision below.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Vite 8.3.1 + React 19.3.0 + TypeScript 6.0.3 SPA, react-router-dom 7.18.4 (`createBrowserRouter`) | Private logged-in tool, no SEO/SSR need; static build is the cheapest Netlify target (CLAUDE.md stack). TS pinned to 6.0.3 (7.x lacks a stable programmatic API) |
| Styling / UI kit | Tailwind v4 via `@tailwindcss/vite` (CSS-first `@theme`, no `tailwind.config.js`), shadcn/ui CLI 4.21.0 (copy-in, Radix via the `radix-ui` package), Phosphor icons only | Locked by CLAUDE.md + sketch findings; shadcn default icon set is replaced project-wide |
| Visual tokens | Warm-paper palette from `sketch-findings-ayrac/sources/themes/default.css`, dark = `.dark` class on `<html>`, self-hosted Fraunces 600 + DM Sans 400/600 via `@fontsource-variable/*` | Locked sketch decision; self-hosting avoids a third-party font request (prohibition P3) |
| Data layer | Hosted Supabase Postgres, two projects: `dev` (tests, local dev, deploy previews) and `prod` (real library, Netlify production) — D-10 | One BaaS covers DB + Auth + (later) Storage; free tier fits |
| Schema | `works` (title, `authors text[]`, `genre` slug nullable, `series`, `series_position`) 1:N `copies` (`format` slug, `publisher`, `edition_title`, `volume_coverage numeric[]`, `cover_url`, `note`); denormalized `copies.user_id` set by trigger; `text` + `CHECK` slug vocabularies — D-01..D-04, D-06 | Complete LIB-01 shape from day one so Phase 3 import and Phase 6 series need no disruptive migration |
| Multi-step writes | Postgres functions called via `supabase.rpc`: `create_work_with_copy` (atomic work + first copy) and `delete_copy` (deletes the work too when its last copy goes, row-locked) — both `security invoker`, so RLS still applies | Atomicity for ADD-02/LIB-09 without a server tier |
| Access control | RLS on every table at creation, four per-operation policies `(select auth.uid()) = user_id`, `anon` role revoked, `authenticated` granted explicitly | RLS is the only enforcement point (AUTH-07); proven by the two-account isolation test on `dev` only (D-12) |
| Migrations | Hand-written SQL in `supabase/migrations/`, applied with `npx supabase link` + `npx supabase db push` to dev then prod (no Docker, no dashboard DDL) — D-11 | Reproducible, self-hostable schema |
| Auth | Supabase Auth email + password, email confirmation OFF (D-05), min password length 8, session in `localStorage` via supabase-js defaults (`persistSession`, `autoRefreshToken`) | AUTH-01/02/05 with no hand-rolled session code |
| Server state | TanStack Query 5 wrapping pure data functions in `src/features/library/queries.ts` that take a `SupabaseClient<Database>` argument | The same functions run in the app and in integration tests (tests exercise the real app path) |
| Forms | react-hook-form 7 + zod 4 via `@hookform/resolvers` 5; owned `FormField` wrapper (label + control + helper + error) | One schema module for work/copy validation, error messages are i18n keys |
| i18n | i18next 26 + react-i18next 17 + browser language detector (`order: ['localStorage','navigator']`, key `ayrac-lng`, `supportedLngs: ['tr','en']`, fallback `en`); `<html lang>` synced on every change | UI-01; Turkish uppercase needs the right `lang` |
| Theme | Inline pre-paint script in `index.html` (key `ayrac-theme`: `light`/`dark`, absent = system) + `src/lib/theme.ts` store | UI-02 with no flash |
| Deployment target | Netlify static site from the GitHub repo, `netlify.toml` SPA rewrite, env vars per deploy context (Production → prod, Deploy Previews / Branch deploys → dev), `*.netlify.app` URL — D-13 | Custom domain is Phase 7 |
| Secrets hygiene | `.gitignore` covers `.env*` (except `.env.example`) and `data/` from the first commit; client gets only the publishable/anon key; runtime key guard in `src/lib/client-key.ts`; `scripts/check-secrets.mjs` scans the build and git history before pushes | ROADMAP secrets gate |
| Tests | Vitest 5 with two projects: `unit` (pure TS, no network) and `integration` (hosted `dev`, sequential, service key only from `.env.test.local`, prod-ref guard) | Nyquist sampling: fast unit loop per task, integration per wave |
| Directory layout | `src/app` (router, shell), `src/features/{auth,library,book}`, `src/lib` (client, vocab, theme), `src/components` (+ `ui/` shadcn), `src/i18n`, `supabase/`, `tests/{unit,integration,setup}`, `scripts/` | Feature folders; test-only code never under `src/` |

## Conventions Established Here

- **i18n keys:** two catalogs, `src/i18n/locales/tr.json` and `en.json`, one `translation` namespace.
  Keys are dot paths whose first segment is the feature area (`common`, `auth`, `library`, `book`,
  `form`, `format`, `genre`, `shell`, `theme`, `language`), camelCase segments after that, and plurals
  use i18next `_one` / `_other` suffixes in **both** catalogs (TR texts may be identical). Every key
  exists in both catalogs; `tests/unit/i18n-catalogs.test.ts` enforces exact key parity.
- **Controlled vocabularies:** slug lists live once in `src/lib/vocab.ts`; the migration `CHECK` lists
  and the `format.*` / `genre.*` catalog keys must match it (`tests/unit/vocab.test.ts`).
- **Routes:** `/signup`, `/login`, `/` (library), `/kitap/yeni`, `/kitap/:copyId`,
  `/kitap/:copyId/duzenle`, `/eser/:workId/nusha-ekle`.
- **Ordering:** library tiles `copies.created_at desc, id desc`; siblings `created_at asc, id asc`.
- **Every new table** gets RLS + four policies in the same migration and is added to the isolation
  test (`tests/setup/schema-tables.ts` makes the test fail until it is).

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build, lint, test runner) — 01-01
- [x] Routing — at least one real route — 01-04 (`/signup`, `/login`, `/`)
- [x] Database — at least one real read AND one real write — 01-04 (library read in UI; `create_work_with_copy` write in the tracer integration test), UI write in 01-08
- [x] UI — at least one interactive element wired to the API — 01-04 (sign-up / log-in forms)
- [x] Deployment — running on a dev environment — 01-07 (`*.netlify.app` on prod project; local `npm run dev` on dev project)

## Out of Scope (Deferred to Later Slices)

- Search, Turkish folding module, duplicate warning (Phase 2)
- Excel/CSV import (Phase 3)
- Book API search-and-pick, covers, genre auto-fill, Netlify Functions (Phase 4)
- Reading status, rating, shelves home, sort/filter, grid⇄list, author pages, stats (Phase 5)
- Wishlist, series view, volume-coverage UI (Phase 6; the column exists already)
- Password reset, Google sign-in, email confirmation + custom SMTP, custom domain, export, account deletion, keep-alive, self-host README (Phase 7)
- CI workflow (optional; not part of Phase 1)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: "Do I already own this?" — Turkish-aware instant search + duplicate warning (hooks into the add-form title picker from D-08)
- Phase 3: Excel/CSV import with preview into works + copies (maps "Kitap Türü" onto the D-02 format slugs)
- Phase 4: Search-and-pick add via a key-hiding Netlify Function, covers (fills `copies.cover_url`), genre mapping onto the D-03 slugs
- Phase 5: Browse, reading tracking, statistics
- Phase 6: Wishlist and series gaps (uses `works.series*` and `copies.volume_coverage`)
- Phase 7: Public launch on the custom domain
