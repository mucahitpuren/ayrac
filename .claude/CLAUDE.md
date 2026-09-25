<!-- GSD:project-start source:PROJECT.md -->

## Project

**Ayraç**

Ayraç ("bookmark" in Turkish) is an open-source, multi-user web app for cataloguing the physical books you own. Its reason to exist: when you're about to buy a book online, you can pull it up on your phone and know in seconds whether that book is already on your shelf. It's built for book buyers with growing home libraries, starting with the author's own collection of about 110 books. It will be deployed on Netlify under a custom domain and published on GitHub as a portfolio project.

**Core Value:** **"Do I already own this book?" gets a fast, reliable answer from any device.** A quick search by title or author must surface every copy of that work you own, even when it's a different edition, translation or format, so you never buy a duplicate by accident. If everything else fails, this must work.

### Constraints

- **Hosting:** Netlify with a custom domain — the frontend must deploy there. Backend/database/auth must be a service that pairs with Netlify (e.g. a BaaS or Netlify Functions + hosted DB), since Netlify has no built-in database
- **Cost:** Free tiers only (hosting, database, auth, book-cover API) — personal/open-source project
- **Cover source:** Must be a free API (e.g. Open Library Covers, Google Books)
- **Open source:** Public GitHub repo. No secrets in the codebase. Should be self-hostable with documented env configuration
- **Languages:** UI must support Turkish and English from the start

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vite | 8.3.1 | Build tool / dev server | Netlify hosts static files. A Vite SPA builds to plain HTML/JS/CSS with zero server runtime — the cheapest, simplest, most portable target for Netlify's CDN. Next.js exists to solve SSR/server-component problems this app doesn't have (no SEO requirement, no server-rendered pages — it's a private, logged-in tool) and is optimized for Vercel's runtime, not Netlify's. Don't pay for that complexity. **Confidence: HIGH** (verified npm registry + confirmed via web search consensus). |
| React | 19.3.0 | UI library | Default choice paired with Vite; largest ecosystem for the supporting libraries below (forms, i18n, query, component libs). **Confidence: HIGH**. |
| TypeScript | **6.0.3** (not 7.0.2) | Type safety | TypeScript 7.0 (released July 2026) is a from-scratch rewrite of the compiler in Go — 8-10x faster, but it does **not yet expose a stable programmatic API**. Tooling that imports `typescript` as a library (webpack/Vite type-check plugins, editor tooling in some configurations) must stay on the 6.x line until TS 7.1 lands the new API (targeted Nov 2026). For a project starting now, pin to 6.0.3 — the last release on the mature, fully-compatible compiler — and revisit 7.x once the ecosystem (esp. `vite-plugin-checker`, ESLint TS tooling) confirms compatibility. **Confidence: MEDIUM** (verified npm dist-tags directly; ecosystem compatibility claim from web search). |
| react-router-dom | 7.18.4 | Client-side routing | Needed for library/wishlist/stats/series views in a client-only SPA. v7's data APIs (loaders) work fine without a server. **Confidence: HIGH**. |

### Backend / Database / Auth / Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase | `@supabase/supabase-js` 2.117.2 (hosted, free tier) | Postgres DB + Auth + Storage + auto-generated REST API | Netlify has no built-in database, so the backend must be a BaaS or Netlify Functions + hosted DB. Supabase is the best fit here specifically because **one service covers three requirements at once**: (1) a real relational Postgres DB for the work/copy data model (one work → many copies — this is a foreign-key relationship, not a document blob, so Postgres beats Appwrite's MariaDB/document API), (2) built-in email+password **and** Google OAuth in the same Auth product tied directly to Postgres Row-Level Security (RLS) — so "each user's library is private" is enforced at the database layer, not hand-rolled in application code, and (3) S3-compatible object storage for user-uploaded cover images with the same RLS model. Composing Netlify Functions + a separate Neon Postgres + a separate auth provider + a separate storage bucket means gluing four services together and reinventing what Supabase already ships as one coherent product, for a solo/portfolio project where reducing moving parts matters more than micro-optimizing cost. **Confidence: MEDIUM** (architecture reasoning HIGH; free-tier numbers from web search, cross-checked across multiple 2026 pricing writeups). |

- 500 MB database storage (roughly 2–5M rows of typical relational data — a ~110-book library with copies/wishlist/notes won't come close)
- 1 GB file storage (book covers)
- 50,000 monthly active users (auth) — irrelevant at personal-project scale but confirms no surprise cap
- 5 GB egress/month
- Unlimited API requests, 500,000 edge function invocations/month if needed later
- **Caveat:** free projects pause after 7 days of inactivity and auto-resume on next request (a few seconds of cold-start delay) — acceptable for a personal-use app, but document this in the README so contributors aren't surprised. Free tier is capped at 2 active projects (fine — you need exactly one).
- **Pocketbase** (single Go binary + SQLite): simplest to self-host, genuinely great for solo hobby apps, but (a) it's *not* itself a free hosted service — you'd need to run it on a free-tier VM/container (Fly.io, Render) that pairs awkwardly with Netlify's serverless model, and (b) SQLite's single-writer model is a real ceiling if this ever gets other users self-hosting it concurrently. Reasonable alternative if you'd rather self-host from day one and don't want any third-party hosted dependency — see "Stack Patterns by Variant" below.
- **Appwrite**: solid, Docker-composable, but MariaDB's document-collection API is a worse fit for the work→copies relational model, and its free *hosted* Cloud tier is newer/less battle-tested than Supabase's.
- **Firebase**: Firestore's NoSQL model fights the relational work/copy structure (you'd end up hand-rolling joins client-side); also Google's own ecosystem push has been toward "Firebase Auth only" bundling that's less clean to pair with a non-Google hosted Postgres later if you ever outgrow the free tier.
- **Netlify Functions + Neon Postgres** (composed manually): viable and fully free-tier-compatible (Neon has a generous free Postgres tier and an official Netlify Functions integration), but you still need to bring your own auth (e.g., Lucia, or roll JWT sessions by hand) and your own storage (Cloudflare R2 free tier). This is the "more control, more assembly required" path — good if you specifically want to avoid Supabase lock-in for the portfolio narrative, but it roughly triples the integration surface for this project's size.
- **Netlify's own first-party "Netlify DB"** (managed Postgres, zero-config branching): real and current in 2026, but it's tied to Netlify's own runtime/billing and has less mature auth/storage/RLS tooling than Supabase. Not recommended as the primary DB for this project; worth a mention in the README as "why not."
- **Netlify Identity** (Netlify's own auth): had a near-deprecation scare in early 2026 that was reversed after community pushback, but Git Gateway (its CMS bridge) stayed deprecated — a signal of platform risk. More importantly, using it would split auth (Netlify) from data (Supabase), forcing you to sync user IDs across two systems and forfeiting Postgres RLS as your privacy boundary. Don't use it here.

### Book Metadata & Cover APIs

| API | Auth | CORS | Rate Limit | Turkish Coverage | Use For |
|-----|------|------|------------|-------------------|---------|
| Open Library Search API (`openlibrary.org/search.json`) | None | **No CORS headers** — verified directly (no `access-control-*` header on a live request) | ~1 req/s anonymous, 3 req/s if you send an identifying `User-Agent` + contact email | Weak/inconsistent for Turkish-language editions | Call from a Netlify Function (server-side), never directly from the browser |
| Open Library Covers API (`covers.openlibrary.org`) | None | **CORS-enabled** — verified directly: `access-control-allow-origin: *` on a live request | Same family limits as above; cover-by-arbitrary-id lookups are separately throttled | Cover art often missing for Turkish editions | Safe to call **directly from the browser** for cover images by ISBN/OLID/cover ID |
| Google Books API (`googleapis.com/books/v1/volumes`) | API key strongly recommended (restrict by HTTP referrer in Google Cloud Console) | Works fine as a direct client-side `fetch` when keyed (this is the standard/documented pattern in Google's own examples) | ~1,000 requests/day free per project without extra approval; **unkeyed requests share a pool across all callers on the same IP and get rate-limited hard and unpredictably** — reproduced directly during this research (an unauthenticated request returned HTTP 429 immediately) | Better than Open Library for popular titles, but Turkish-specific editions/translations are still hit-or-miss | Primary metadata+cover search-and-pick flow; **always use an API key**, never rely on anonymous requests |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Fuse.js | 7.5.0 | Client-side fuzzy search | Fast fuzzy title/author search against the in-memory library (~110 books, trivially small for client-side indexing — no need for a server-side search engine like Meilisearch/Typesense). **Turkish-character caveat (important, see below).** |
| xlsx (SheetJS) | 0.18.5 (npm) — consider the SheetJS CDN build (`cdn.sheetjs.com`) instead, which ships newer fixes than the npm registry mirror | Excel (.xlsx) and CSV import | Parses the existing ~110-book Excel sheet client-side, no backend round-trip needed. SheetJS reads both XLSX and CSV, so one library covers "Excel/CSV import" as a single dependency rather than two. |
| PapaParse | 5.7.0 | CSV parsing (optional, alternative/supplement to xlsx) | Only add this if you want to also support raw `.csv` exports with a lighter, faster, worker-based parser; xlsx alone is sufficient for both formats and is the simpler single-dependency choice for v1. |
| react-i18next + i18next | react-i18next 17.0.15, i18next 26.4.2 | Turkish/English i18n | This is a Vite SPA, not Next.js — `next-intl` (the other major 2026 option) is built specifically for the Next.js App Router/RSC model and provides no benefit here. react-i18next is the framework-agnostic, far more widely adopted (8.9M vs 1.8M weekly downloads) choice for a plain React SPA, with mature language-detector and lazy-namespace-loading plugins. |
| @tanstack/react-query | 5.103.2 | Server-state caching/fetching | Wraps `supabase-js` calls (library list, wishlist, stats) with caching, refetch-on-focus, and optimistic updates (e.g., instant "move to library" from wishlist) — avoids hand-rolled loading/error state plumbing. |
| react-hook-form | 7.88.0 | Form state | Add-book form, manual entry fallback, profile settings. Uncontrolled-input model keeps forms fast on mobile. |
| zod | 4.6.5 | Schema validation | Validates add-book/import-row shapes; reuse the same schema client-side (form validation) and to sanity-check parsed Excel rows before insert. |
| @hookform/resolvers | 5.9.1 | Bridges react-hook-form + zod | Required glue package; version 5.x supports Zod 4. |
| tailwindcss | 4.3.3 (via `@tailwindcss/vite` plugin) | Styling | v4's CSS-first config (`@import "tailwindcss"` + `@theme`, no `tailwind.config.js` or PostCSS config needed) pairs natively with Vite via the official `@tailwindcss/vite` plugin — the simplest current setup path. Utility classes make mobile-first responsive layout (the app's core UI constraint) fast to iterate on. |
| shadcn/ui (CLI, not an npm dependency) | Latest CLI, official Tailwind v4 + Vite support confirmed | Accessible component primitives (Radix-based) | You copy components into your own codebase and own/restyle them — no version-locked component library dependency, full control over the mobile-first look, and it's the 2026 community default for exactly this kind of small, custom-styled solo project. Chosen over Mantine (120+ components/70+ hooks, batteries-included but heavier and more opinionated — better suited to admin-dashboard-style apps than a small bespoke catalog UI). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint + typescript-eslint | Linting | Standard for a React+TS Vite project; keep on the TS-6.x-compatible ESLint parser version until TS 7 tooling stabilizes. |
| Prettier | Formatting | Pairs with ESLint; no strong opinion beyond "use it consistently" for a portfolio repo. |
| Vitest | Unit testing | Vite-native test runner, zero extra config vs Jest, shares Vite's transform pipeline. |
| Netlify CLI (`netlify dev`) | Local dev against Netlify Functions/redirects | Needed if any Netlify Function (e.g., the Open Library CORS proxy) is added — lets you run the function locally alongside Vite's dev server. |
| GitHub Actions (optional) | CI (lint/typecheck/test on PR) | Free for public repos; strengthens the "open source, self-hostable, portfolio piece" goal from PROJECT.md by showing green checks. |

## Installation

# Scaffold

# Core runtime deps

# Styling

# Dev dependencies

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Backend/BaaS | Supabase | Pocketbase | Not itself a free *hosted* offering — needs its own always-on VM/container, awkward pairing with Netlify's serverless model; fine if self-hosting from day one is a priority over convenience |
| Backend/BaaS | Supabase | Appwrite | Document/MariaDB model is a worse fit for the relational work→copies structure than Postgres |
| Backend/BaaS | Supabase | Firebase | Firestore NoSQL fights the relational data model; would require client-side joins |
| Backend composition | Supabase (single service) | Netlify Functions + Neon Postgres + separate auth/storage | Fully viable and free, but triples integration surface (4 services to glue vs 1) for marginal benefit at this project's scale |
| Frontend framework | Vite + React SPA | Next.js | Optimized for Vercel's server runtime; adds SSR complexity this private, logged-in app doesn't need |
| i18n | react-i18next | next-intl | Built specifically for Next.js App Router/RSC — no benefit in a Vite SPA |
| UI components | shadcn/ui + Tailwind | Mantine | Heavier, more opinionated, 120+ components you won't use; shadcn's copy-in model gives full control for a small custom UI |
| CSV/Excel import | xlsx (SheetJS) alone | xlsx + papaparse | Two libraries when one (SheetJS) already parses both formats; only add papaparse if streaming very large CSVs matters (it doesn't at ~110 rows) |
| TypeScript | 6.0.3 | 7.0.2 (latest) | 7.0's Go-native compiler has no stable programmatic API yet; some build tooling isn't compatible until TS 7.1 (targeted Nov 2026) |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Calling `openlibrary.org/search.json` directly from the browser | No CORS headers — verified directly; the request will be blocked by the browser | Proxy through a Netlify Function, or rely on Google Books for the primary search-and-pick flow |
| Unkeyed/anonymous Google Books API requests | Shared IP-wide quota, gets 429'd fast and unpredictably (reproduced directly in this research) | Always request with an API key restricted by HTTP referrer |
| TypeScript 7.0.x today | No stable programmatic API; breaks some bundler/type-check plugin integrations until 7.1 | TypeScript 6.0.3 |
| Netlify Identity for this project's auth | Splits auth from the Postgres RLS boundary that protects per-user library privacy; recent deprecation scare shows platform risk | Supabase Auth (same underlying GoTrue tech, but co-located with your data and RLS policies) |
| Firestore/NoSQL BaaS for the work/copy model | Forces client-side joins to reconstruct "one work, many copies" relationships that Postgres foreign keys express natively | Supabase Postgres |
| A server-side search engine (Meilisearch, Typesense, Algolia) for search | Massive overkill for ~110–a few thousand rows; adds a service, a free-tier limit, and network latency for something Fuse.js does client-side in milliseconds | Fuse.js over a normalized in-memory array, refetched via TanStack Query |
| Assuming `String.prototype.normalize('NFD')` alone handles Turkish folding | Turkish `ı`/`İ` do **not** decompose into base+combining-mark the way `ş, ç, ö, ü, ğ` do, so an NFD-only diacritic stripper silently fails to fold `ı`→`i` and `İ`→`I` | Custom normalize function: explicit `ı↔i`, `İ↔I` map + NFD strip for the rest, applied to both the query and the indexed title/author fields before handing them to Fuse.js |

## Stack Patterns by Variant

- Use Pocketbase (single binary, SQLite) self-hosted on a free-tier host (Fly.io's free allowance, or a Render free web service) instead of Supabase.
- Because the "self-hostable, documented env configuration" requirement in PROJECT.md is satisfied even more literally — anyone can `docker run` or download one binary and go, with no dependency on a specific SaaS vendor's free tier surviving. Trade-off: you lose Postgres RLS as your privacy mechanism and must implement per-user filtering in Pocketbase's rule syntax instead, and you take on hosting the binary yourself (Supabase's hosted free tier requires no server management at all).
- Add a lightweight Levenshtein-distance layer or lean on Fuse.js's built-in fuzzy threshold tuning rather than reaching for a server-side search engine.
- Because the dataset size (a personal library, realistically under a few thousand books even at extreme collector scale) never justifies the operational cost of a hosted search service.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| tailwindcss@4.3.3 | @tailwindcss/vite (same major line) | v4's CSS-first config requires the v4 Vite plugin, not the old `tailwindcss` PostCSS plugin approach from v3 |
| shadcn/ui CLI (current) | tailwindcss@4.x + React 19 | Official Tailwind v4 support confirmed; older shadcn component snapshots generated under Tailwind v3 will not auto-upgrade — generate all components fresh under v4 from project start |
| zod@4.x | @hookform/resolvers@5.1.0+ | Resolver v5.1.0 is the first line with Zod 4 support while retaining Zod 3 compatibility — do not pair Zod 4 with an older resolver |
| typescript@6.0.3 | vite@8.x, @vitejs/plugin-react, vitest | Full compatibility; this is the "safe" pre-native-compiler line the whole 2026 tooling ecosystem targets |
| typescript@7.0.x | Partial — no stable programmatic API | Avoid until 7.1 ships (targeted Nov 2026) if using any tool that imports `typescript` as a library rather than shelling out to `tsc` |

## Sources

- npm registry (`registry.npmjs.org`) — direct version lookups for react, react-dom, typescript, vite, @supabase/supabase-js, @tanstack/react-query, react-hook-form, zod, @hookform/resolvers, react-i18next, i18next, xlsx, papaparse, fuse.js, tailwindcss, react-router-dom. **Confidence: HIGH** (primary source, fetched live).
- Direct `curl` verification against `covers.openlibrary.org`, `openlibrary.org/search.json`, and `googleapis.com/books/v1/volumes` for CORS headers and rate-limit behavior, performed during this research session. **Confidence: HIGH/MEDIUM** (live, reproducible, but a single sample point in time).
- Web search (general, not library-doc-specific) across ~15 queries covering Supabase pricing, Netlify+DB integration patterns, Pocketbase/Supabase/Appwrite comparisons, Vite-vs-Next.js on Netlify, Supabase OAuth setup, Fuse.js/Turkish folding, SheetJS/PapaParse, react-i18next vs next-intl, Supabase Storage, TanStack Query, shadcn/ui vs Mantine, React Hook Form + Zod, Vite/TypeScript current versions, Netlify Identity status, and Tailwind v4 + shadcn setup. **Confidence: LOW individually, MEDIUM where corroborated by 3+ independent sources** (per this session's classify-confidence seam: uncross-checked websearch = LOW, cross-verified = MEDIUM).
- `developers.google.com/books/docs/v1/using` (official Google docs, fetched directly) — confirms API-key-or-OAuth requirement for Books API requests. **Confidence: HIGH** (primary/official source).

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

- **Sketch findings for ayrac** (design decisions, CSS patterns, visual direction) → `Skill("sketch-findings-ayrac")`. Load it before any UI work (UI-SPEC, planning or implementing screens).
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
