# Project Research Summary

**Project:** Ayraç — Multi-user personal book library / home book catalog
**Domain:** Web SPA + serverless backend, book-collection management
**Researched:** 2026-09-25
**Confidence:** MEDIUM (core architecture HIGH; stack version strategy HIGH; feature competitive analysis MEDIUM; pitfall prevention HIGH where tested, MEDIUM where inferred)

## Executive Summary

Ayraç is a focused cataloguing tool for one pain point that existing competitors (Goodreads, LibraryThing, StoryGraph) don't solve: reliably telling you at purchase time whether you already own a book, in any format or translation. The recommended build is a Vite-based React SPA on Netlify's CDN, backed by Supabase (Postgres, Auth and Storage in one service), plus a single Netlify Function that proxies external book-metadata APIs. This favours simplicity and self-hostability: no custom application server, no data synchronisation, and everything runs on free tiers.

The approach is deliberately narrow. v1 ships the work/copy data model, search, import and core CRUD, and defers most social and discovery features. The main technical risks are about execution rather than the product itself:

- Turkish case-folding in search, which fails silently if done naively.
- RLS misconfiguration in Supabase, which can leak one user's data to another.
- Duplicate-detection thresholds that are too strict or too loose, which erodes user trust.

All three are well documented and have concrete prevention strategies.

The project has a real niche and can be hosted credibly on free tiers, which makes it a good portfolio piece. The roadmap can go straight to planning without more research, provided implementation follows the pitfall checklist, especially for Turkish text handling and RLS testing.

## Key Findings

### Recommended Stack

**Frontend & Build:**
- **Vite 8.3.1**: SPA build tool suited to static CDN deployment on Netlify. No server runtime or SSR needed.
- **React 19.3.0 + TypeScript 6.0.3**: The default ecosystem choice. TypeScript is pinned to 6.0.3 rather than the latest 7.0.x because TS 7's programmatic API isn't stable yet, and tooling won't support it until about Nov 2026.
- **react-router-dom 7.18.4**: Client-side routing for a multi-view SPA.
- **Tailwind CSS 4.3.3 + shadcn/ui (CLI)**: Styling with copy-in components, which gives full control.

**Runtime & Data:**
- **Supabase** (`@supabase/supabase-js` 2.117.2): One service for Postgres, Auth and Storage. The free tier fits: 500 MB database, 1 GB file storage, 50k MAU. **Critical caveat:** projects auto-pause after 7 days of inactivity, so a keep-alive job is needed.
- **@tanstack/react-query**: Server-state caching, refetch-on-focus and optimistic updates.
- **react-hook-form + zod**: Form state and validation.
- **Fuse.js**: Client-side fuzzy search; indexing ~110 books in the browser is trivial. **Requires Turkish-aware normalization.**
- **xlsx 0.18.5**: Excel/CSV import. **Use the patched CDN build**, because the npm version has the unfixed CVE-2023-30533.

**i18n & APIs:**
- **react-i18next + i18next**: Bilingual TR/EN from day 1.
- **Google Books API**: Primary metadata lookup. The key stays server-side behind the Netlify Function.
- **Open Library API**: Fallback. No key needed, but the search API has no CORS, so it's called server-side. The Covers API does support CORS and can be called from the browser.

**Confidence: HIGH on core technologies, MEDIUM on ecosystem opinions.**

### Expected Features

**Table Stakes (must ship v1):**
- Account and a private per-user library (AUTH)
- Work/copy data model (LIB): one work, many copies, each with its own format and publisher
- Work-level instant search (SRCH), e.g. "1984 — you own 2 copies: novel, graphic novel"
- Excel/CSV import with preview (IMP)
- Search-and-pick add with a manual fallback (ADD)
- Cover images: auto-fetch and manual upload (COVR)
- Reading status (to-read / reading / read / abandoned)
- Wishlist kept separate from the owned library (WISH)
- Series grouping with visible gaps (SER)
- Rating and personal note
- Basic stats (counts, top authors, books per year)
- CSV/JSON export (EXP)
- Turkish/English UI (I18N)

**Differentiators:**
- Work-level matching across editions and formats. Goodreads and LibraryThing don't warn at purchase time.
- Copies are first-class records rather than being deduplicated away.
- Series gaps are visible.
- Onboarding starts from a spreadsheet and copes with messy existing data.
- Built for Turkish books: manual entry is a first-class path, not a last resort.

**Defer (v2+):** Barcode scanning, PWA, shelf location, public sharing, recommendation engine.

**Confidence: MEDIUM (cross-verified across 5+ competitors).**

### Architecture Approach

Three tiers: a browser SPA (Vite, static CDN), Supabase (Postgres, Auth and Storage, with RLS isolating each user's data), and a single Netlify Function that proxies book search.

**Key Patterns:**
1. **Work/copy split per user.** There's no shared global catalogue. RLS policies scope everything to `user_id = auth.uid()`.
2. **Denormalized `user_id` on child tables.** This keeps RLS policies from having to join tables, which is a common security gap.
3. **Secret-holding proxy function.** The Google Books key lives server-side and never ends up in the client bundle.
4. **Wishlist is a `works` row with zero copies (`is_wishlist = true`).** "Move to library" inserts a copy and flips the flag.
5. **Reading status, rating and note live on `copies`.** A novel and its graphic-novel adaptation are different reading experiences.

**Data Flow (core):**
1. The user types a search.
2. The client normalizes the query with Turkish-aware folding.
3. The Supabase client queries works and copies where `normalized_title ilike %q%`.
4. RLS silently limits the rows to that user.
5. The browser renders the results grouped by work.

**Confidence: MEDIUM (standard patterns, but no prior art for this exact combination).**

### Critical Pitfalls

1. **Turkish case-folding silently breaks search.**
   - Problem: `.toLowerCase()` and Postgres `ILIKE` mishandle Turkish İ/i, so a search for "istanbul" doesn't match a stored "İstanbul".
   - Prevention: Use Turkish-aware normalization (explicit İ→i and I→ı mapping, then NFD), store a precomputed normalized column, and test with known problem words (İstanbul, Işık, Kırık).
2. **Duplicate/edition matching has no single right threshold.**
   - Problem: Exact matching misses variants (extra whitespace, subtitles), while fuzzy matching produces false positives.
   - Prevention: Use a deterministic normalized title+author key as the primary match, and show fuzzy near-matches as dismissible suggestions rather than merging automatically.
3. **The `xlsx` npm package has an unfixed CVE (CVE-2023-30533).**
   - Problem: High-severity prototype pollution, with no fix published to npm since 2022.
   - Prevention: Use the patched CDN build via `package.json` `overrides`, or switch to CSV-only import with papaparse.
4. **The Supabase free tier auto-pauses after 7 days of inactivity.**
   - Problem: This breaks the promise that the app is always available.
   - Prevention: A GitHub Actions keep-alive job (free on public repos) that pings an endpoint at least every 6 days.
5. **RLS misconfiguration leaks user data.**
   - Problem: RLS is opt-in per table and easy to forget. In a documented 2025 incident, more than 170 Supabase apps leaked every user's records.
   - Prevention: Enable RLS when each table is created, write explicit policies, and test cross-user isolation with two accounts before sign-off.
6. **OAuth redirect URLs are misconfigured.**
   - Problem: Google login succeeds, then bounces to a blank or error page if the Site URL doesn't include the production custom domain.
   - Prevention: Add the custom domain, the default Netlify subdomain and a preview-URL wildcard to the redirect allow-list.
7. **Secrets or API keys get committed to the public repo.**
   - Problem: Either `.env` files with real credentials get committed, or it's unclear which key is safe to expose (the anon key is public; the service/secret key must never appear).
   - Prevention: `.gitignore` from commit #1, a `.env.example` with placeholders, and secret scanning enabled.

**Confidence: HIGH on prevention strategies; MEDIUM on actual likelihood.**

## Implications for Roadmap

A 9-phase structure is suggested, following feature dependencies and pitfall mitigation:

### Phase 1: Project Setup & Infrastructure
- **Scope:** Vite + React scaffold, Netlify config, Supabase setup, i18n wiring, `.gitignore`, secret scanning.
- **Avoids:** Pitfall 7 (secrets) and Pitfall 4 (keep-alive placeholder).

### Phase 2: Authentication & Multi-user Data Model
- **Scope:** User auth (email/password + Google OAuth), `works`/`copies` tables with RLS, Turkish-aware `normalize.ts`, Storage RLS.
- **Avoids:** Pitfall 5 (RLS) and Pitfall 1 (normalization is in place).

### Phase 3: Search & Duplicate Detection
- **Scope:** Work-level instant search (Fuse.js), duplicate warning as a fuzzy suggestion rather than a hard block, test suite with Turkish problem words.
- **Avoids:** Pitfall 1 (Turkish folding) and Pitfall 2 (fuzzy matching).
- **Research flag:** A small spike to validate the Fuse.js threshold against the user's real ~110-book library.

### Phase 4: Add Book via External API + Manual Entry
- **Scope:** Search-and-pick flow, Netlify Function proxy, Google Books (key server-side) with Open Library as fallback, manual entry, duplicate warning.
- **Avoids:** Pitfall 2 (non-blocking warning) and API key exposure.

### Phase 5: Excel/CSV Import with Preview
- **Scope:** Client-side parsing, Turkish-aware column auto-detection, row dedup, within-file dedup (several rows become one work plus copies), preview before commit.
- **Avoids:** Pitfall 3 (xlsx vulnerability), Pitfall 1 (Turkish headers) and Pitfall 2 (duplicates are surfaced for confirmation).
- **Research flag:** A small spike to test column detection and within-file dedup against the user's actual Excel sheet.

### Phase 6: Core Library Features (Reading Status, Wishlist, Series, Stats)
- **Scope:** Reading status, wishlist with one-tap move to library, series grouping with visible gaps, basic stats.

### Phase 7: Data Export & Portability
- **Scope:** CSV and JSON export. The schema mirrors the internal model and is defined last, so no second migration is needed.

### Phase 8: Deployment & Monitoring
- **Scope:** Supabase live, custom domain attached, Auth redirect URLs registered, keep-alive job deployed, a friendly "waking up" state, README and `.env.example` complete.
- **Avoids:** Pitfall 4 (keep-alive job is live), Pitfall 6 (OAuth URLs on the production domain) and Pitfall 5 (RLS re-verified on live data).

### Phase 9: Bilingual UI Polish & i18n
- **Scope:** Every user-facing string goes through i18n keys, TR/EN catalogues are complete, the language toggle is tested on every screen, and layouts are tested for text expansion.

### Phase Ordering Rationale

- AUTH and LIB are foundational; nothing works without them.
- SRCH comes before ADD and IMP, because both depend on the duplicate-detection logic.
- IMP builds on SRCH's normalized search and shares its Turkish-aware folding.
- The core library features (READ/WISH/SER/STAT) are independent of each other once LIB exists.
- EXP comes last, because it depends on every data shape being final.
- Deployment is its own phase so RLS and OAuth get re-verified on the live domain.
- The i18n polish pass is last: a UI and copy sweep across everything. i18n *wiring* starts in Phase 1.

### Research Flags

- **Phase 3:** Moderate research. Validate the Fuse.js fuzzy threshold on the real ~110-book library.
- **Phase 5:** Moderate research. Test column detection and within-file dedup on the user's actual Excel data.
- **All others:** Standard patterns; proceed directly to planning.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified against the npm registry, live APIs and official docs. Pinning TS to 6.0.3 is defensible. |
| Features | MEDIUM | Cross-verified across 5+ competitors and spreadsheet-import UX research. No authoritative spec exists for work-level dedup; the approach is inferred from adjacent domains. |
| Architecture | MEDIUM | The design is sound and uses standard multi-tenant SaaS patterns, applied by analogy with no project-specific prior art. Scaling assumptions are realistic up to about 1k users. |
| Pitfalls | HIGH | Prevention strategies are tested or documented. The Turkish case-folding bug is reproducible (Unicode spec verified), the RLS patterns come from 2025 security incident data, and the xlsx CVE is official. |

**Overall: MEDIUM–HIGH.** The roadmap can proceed to planning directly, provided implementation follows the pitfall-avoidance checklist.

## Gaps to Address During Planning

1. **Fuzzy-match threshold tuning (Phase 3):** Run the user's real library through Fuse.js at several thresholds and measure false-positive and false-negative rates.
2. **Excel import edge cases (Phase 5):** Test column detection and within-file dedup against the user's actual `.xlsx`, including BOMs, quoted multi-line cells and Turkish headers.
3. **Keep-alive job (Phase 8):** Confirm the cron schedule (e.g. every 6 days) and pick a cheap endpoint to ping.
4. **Open Library Covers fallback (Phase 4):** Detect the `?default=false` 404 and fall back to manual upload.
5. **Cover image storage quota (Phase 4/5):** Decide the maximum file size (e.g. 2–5 MB), whether to resize, and how to communicate the limit.
6. **i18n key naming convention (Phase 1):** Pick a consistent hierarchy, e.g. flat keys with dots such as `button.addBook` and `search.noResults`.

## Sources

- `.planning/research/STACK.md`: technology stack, versions verified live against the npm registry, book API CORS and rate limits verified with live `curl`
- `.planning/research/FEATURES.md`: competitor analysis (Goodreads, LibraryThing, StoryGraph, Libib, BookBuddy), table stakes, differentiators, anti-features
- `.planning/research/ARCHITECTURE.md`: component boundaries, work/copy/wishlist schema, RLS pattern, proxy pattern, build order
- `.planning/research/PITFALLS.md`: Turkish case-folding, RLS, xlsx CVE, Supabase pausing, OAuth redirects, secret leakage

---
*Research completed: 2026-09-25*
*Ready for roadmap: yes*
