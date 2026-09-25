# Pitfalls Research

**Domain:** Multi-user personal book catalog / home library web app (Ayraç)
**Researched:** 2026-09-25
**Confidence:** MEDIUM (web-search-derived, cross-checked across 2+ independent sources per claim; no official Turkish-locale case study found, so that section is HIGH on the JS/Postgres mechanics and MEDIUM on the recommended fix)

## Critical Pitfalls

### Pitfall 1: Turkish case folding breaks "search across whole library" (the core value prop)

**What goes wrong:**
Turkish has two pairs of "I" that don't follow the ASCII rule: dotted İ/i and dotless I/ı. JavaScript's `String.prototype.toLowerCase()` is locale-independent and applies the default Unicode mapping, so `"İstanbul".toLowerCase()` produces `"i̇stanbul"` (with a stray combining dot, U+0069 + U+0307) instead of `"istanbul"`, and `"I".toLowerCase()` produces `"i"` instead of the correct Turkish `"ı"`. If title/author search does a naive `.toLowerCase()` (client-side) or a naive `ILIKE`/`lower()` (Postgres, default `C`/`en_US` collation) compare, a search for "istanbul" will silently fail to match a stored "İstanbul", and a search for "kırık" (dotless ı) won't match if the stored text used a capital dotless I. Since this app's entire value proposition is "search finds every copy of a work," this is not cosmetic — it's the core feature failing quietly for a large fraction of the Turkish-majority library.

**Why it happens:**
Developers reach for `.toLowerCase()`/`ILIKE` out of habit because it "just works" in English testing, and the failure only shows up with specific Turkish letters (İ, I, ı) that a non-Turkish-speaking reviewer or an English-seeded test suite won't catch. Postgres's own Turkish collation has documented cross-platform inconsistencies (a Windows-vs-Linux ILIKE bug report showed different result counts for the same query), and the `unaccent` extension's default rules file silently drops untranslatable characters — meaning Turkish dotless-ı/dotted-İ folding is not handled by unaccent out of the box.

**How to avoid:**
- Client-side: never use bare `.toLowerCase()` on user-facing search input or stored text; use `.toLocaleLowerCase('tr')` (or `.toLocaleLowerCase('tr-TR')`) consistently for both the query and the compared value, or better, use a small dependency-free Turkish-aware fold function (map İ→i, I→ı→i, ı→i explicitly) before comparing — because `toLocaleLowerCase('tr')` still leaves the combining-dot edge case in some engines.
- Server-side (Postgres/Supabase): don't rely on `lower()`/`ILIKE` with default collation for search. Either (a) store a precomputed, explicitly-folded search column (fold at write time using the same TR-aware function, in a trigger or in application code) and index that column, or (b) build a custom `unaccent.rules` file that adds Turkish-specific mappings, or (c) use a `citext`/ICU collation created explicitly for `tr-TR-x-icu` and verify it behaves identically on your actual hosting platform (Windows-vs-Linux collation divergence is real and documented).
- Write a unit test suite with known Turkish gotcha words (İstanbul, İzmir, İşte, Kırık, Işık, Nutuk) run against both client and server search paths before treating search as "done."

**Warning signs:**
- Search for a lowercase query typed with a Turkish keyboard doesn't return a book whose title/author contains İ, I, or ı in a different case.
- Manual QA only ever tests with English or already-correctly-cased sample data.
- The search index/column is built directly from raw title/author text with `lower()` and no locale argument.

**Phase to address:**
Search/data-model phase (the phase that implements title/author search and the "you already own this" match). Must be verified before that phase is marked done — this is the core value proposition, not a nice-to-have.

---

### Pitfall 2: Edition/duplicate matching threshold is either too strict (misses real duplicates) or too loose (false "you own this" warnings)

**What goes wrong:**
The project's stated model is work-level matching: search and duplicate-detection must treat "1984 (novel)" and "1984 (graphic novel)" as the same *work* with two copies, while not incorrectly merging genuinely different books that happen to share a similar title (e.g., two different books both titled "Yol" by different authors, or a reissue vs. an unrelated same-titled work). Naive approaches — exact title+author string match, or Levenshtein/fuzzy-string distance on title alone — fail in both directions: exact match misses trivial differences (subtitle, "Cilt 1" suffix, punctuation, whitespace, Turkish suffix conventions), while a loose fuzzy threshold produces false positives between unrelated books with similar titles. There is no universally correct fuzzy threshold; research on title-deduplication explicitly notes this is a precision/recall tradeoff with no free lunch, and character-based similarity (Levenshtein) "does not understand meaning or identity."

**How to avoid:**
- Match on a normalized (folded, trimmed, punctuation-stripped, Turkish-case-folded) **title+author composite key** as the primary work identity, not fuzzy string distance — this is deterministic and matches the actual mental model ("same title, same author = same work").
- Treat fuzzy/near-matches (small edit distance) as a *suggestion* surfaced to the user at add-time ("Did you mean this existing work?") rather than an automatic merge or automatic reject — since the user is manually curating ~110 books, human-in-the-loop confirmation is cheap and eliminates both false-positive and false-negative risk.
- Do not silently auto-merge on import; the Excel import phase should surface likely-duplicate rows for user confirmation rather than deciding automatically.

**Warning signs:**
- Import silently creates two "works" for what the user considers one book (over-strict), or merges two unrelated books because titles happen to be similar (over-loose).
- No user-facing "possible duplicate" prompt exists anywhere in the add/import flow.

**Phase to address:**
Data model / work-copy phase, and the Excel import phase (duplicate surfacing during bulk import is a distinct sub-problem from duplicate surfacing during single-book add).

---

### Pitfall 3: `xlsx` (SheetJS) npm package is a known-vulnerable, effectively unmaintained dependency

**What goes wrong:**
The most common library reached for to parse `.xlsx`/`.csv` imports in a Node/browser project is `xlsx` (SheetJS). The npm-published version (0.18.5, last published 2022) has an unpatched high-severity Prototype Pollution vulnerability (CVE-2023-30533) and a ReDoS issue, both without an npm-distributed fix — SheetJS stopped publishing patched releases to the public npm registry after 2023 and moved active development to their own CDN (`cdn.sheetjs.com`). `npm audit` will flag this, and many projects either ignore the audit warning or downgrade/pin without understanding why a fix "doesn't exist" on npm.

**Why it happens:**
`xlsx` is still the top search result and most-recommended library for "parse Excel in JS," and its README/Stack Overflow answers predate the maintainer's move away from npm. Developers copy-paste `npm install xlsx` without checking the security advisory.

**How to avoid:**
- If parsing is limited to the user's own Excel import (a trusted, single-operator file — not arbitrary user-uploaded files from the public internet), the actual risk is low, but still install the patched build explicitly via the `overrides` field in `package.json` (e.g. `"overrides": { "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.x/xlsx-0.20.x.tgz" }`) rather than the vulnerable npm-registry version.
- Prefer `.csv` as the import format if feasible (simpler parser, no macro/formula/OOXML attack surface, avoids the whole SheetJS trust question) using a well-maintained parser (e.g. `papaparse` or Node's `csv-parse`), and treat `.xlsx` as a "nice to support" rather than the only path — the source data described in PROJECT.md is a simple flat table (title/author/publisher/series/genre), which doesn't need Excel's formula/merged-cell features.
- If `.xlsx` support is kept, since this import feature will only ever be user-invoked (not exposed as a public multi-tenant upload endpoint accepting arbitrary files from strangers), scope and document the residual risk in the README rather than silently shipping a flagged dependency in an open-source portfolio project (a `npm audit` red flag on a public repo looks bad even if practically low-risk).

**Warning signs:**
- `npm audit` / GitHub Dependabot shows a high-severity unfixed advisory on `xlsx`.
- Import feature accepts arbitrary file uploads with no file-type/size validation before parsing.

**Phase to address:**
Excel/CSV import phase. Decide file-format scope and pin the dependency choice explicitly in that phase's plan, not as an afterthought.

---

### Pitfall 4: Free-tier BaaS (Supabase) pauses the project after 7 days of inactivity — breaks the "always available on my phone" promise

**What goes wrong:**
Supabase's free tier automatically pauses a project after roughly 7 days with no meaningful database/API activity, to conserve resources. A paused project returns errors to the app until manually (or automatically) resumed from the dashboard — which defeats the core use case of "pull it up in the store and check in seconds." Since this is a personal-scale app likely to sit idle for stretches (the user isn't buying books daily), this is a near-certain occurrence, not an edge case. Free-tier projects paused for an extended period beyond the 1-year restore window are eventually deleted outright.

**Why it happens:**
Free-tier resource conservation policy; most tutorials for Supabase+Netlify don't mention it because demo/development usage patterns keep projects "warm."

**How to avoid:**
- Document this constraint explicitly (README + in-app messaging) since it's inherent to the free-tier constraint chosen in PROJECT.md, not a bug.
- Add a lightweight keep-alive: a scheduled GitHub Action (free on public repos) or a Netlify scheduled function that pings a cheap read endpoint on a interval under 7 days, resetting the inactivity timer. This is the standard community workaround.
- Alternatively/additionally, build in a clear "project is waking up, retry in a moment" UX state rather than a bare fetch failure, since even with a keep-alive job, occasional cold starts or dashboard-side pause events (rate/quota related) can still happen.

**Warning signs:**
- App works fine during active development, then fails mysteriously after a week of no usage — classic "worked yesterday" bug report.
- No monitoring/keep-alive job exists in the repo.

**Phase to address:**
Infrastructure/deployment phase (where Supabase is chosen and wired up) — the keep-alive job and degraded-state UX should ship alongside the initial backend setup, not be retrofitted after a real outage.

---

### Pitfall 5: Row Level Security misconfiguration leaks one user's library to another

**What goes wrong:**
This is a multi-user app where "each user's library is private and separate" is an explicit requirement. Supabase tables default to RLS **disabled**, meaning a newly created table is fully public through the API the moment it exists — before any policy is written. A second, subtler failure mode: RLS gets enabled but no policy is added, which doesn't error, it just silently returns zero rows for everyone (looks like "it's private" in testing when it's actually "broken"), masking the bug until a policy is added later and inadvertently made too permissive. A third failure mode is exposing the `service_role` (secret) key to client code — that key bypasses RLS entirely regardless of how well policies are written. Documented real-world incidents (170+ apps in one 2025 sweep) show this exact class of mistake leaking every user's private records via a public anon key + missing RLS.

**Why it happens:**
RLS is opt-in per table and easy to forget on new tables added mid-project; the dashboard shows a warning but the SQL editor does not, so schema-migration-driven workflows can create unprotected tables invisibly. Confusing anon-key-is-safe-to-expose (true) with "therefore no further protection is needed" (false — RLS is what actually protects it) is a common conceptual error.

**How to avoid:**
- Enable RLS on every table at creation time as a non-negotiable step in the schema migration, before any data is inserted — never as a follow-up task.
- Write an explicit policy for every operation (select/insert/update/delete) scoped to `auth.uid() = user_id`, and add an automated check (a small CI script or Supabase's own linter) that fails the build if any table has RLS disabled.
- Never ship the `service_role`/secret key to any client bundle, Netlify Function env var exposed to the browser, or `.env` file that gets committed; only the anon/publishable key belongs in frontend code.
- Test RLS by manually attempting a cross-user query (log in as user B, try to fetch user A's book by ID) as part of phase verification, not just "it worked for one test user."

**Warning signs:**
- A new table exists without a corresponding RLS policy commit in the same PR.
- Manual test only ever uses a single test account, never verifies isolation between two accounts.
- `service_role` key appears anywhere in frontend source, `VITE_`/`NEXT_PUBLIC_`-prefixed env vars, or client-side network requests.

**Phase to address:**
Auth/multi-user data model phase — RLS policies must be part of the initial schema, and a two-user isolation test must be part of that phase's verification/UAT, not deferred to a later "security pass."

---

### Pitfall 6: OAuth/redirect URL misconfiguration breaks Google login on the real custom domain

**What goes wrong:**
Supabase Auth only redirects to URLs explicitly allow-listed in "Authentication → URL Configuration." If the Site URL is left pointing at `localhost` or the default Netlify subdomain after the custom domain goes live, Google sign-in will succeed at Google's end but bounce the user to the wrong URL (or a blank/error page) afterward. This is a very common "worked in dev, broke in prod" class of bug, made worse because Netlify's preview-deploy URLs, the default `*.netlify.app` domain, and the eventual custom domain are all different origins that each need to be registered.

**How to avoid:**
- Register the exact production custom domain, the Netlify default subdomain (as a fallback), and a wildcard for Netlify deploy-preview URLs in Supabase's redirect allow-list from the start.
- Set `redirectTo` dynamically in code (derive from `window.location.origin`) rather than hardcoding a single environment's URL, so local dev, previews, and production all resolve correctly without code changes.
- Update the Site URL the same day the custom domain is attached to Netlify — treat it as a checklist item in the deployment phase, not an afterthought discovered when login breaks for real users.

**Warning signs:**
- Login works locally but redirects to a blank page or a Netlify default subdomain in production.
- Only one redirect URL is registered in the Supabase dashboard.

**Phase to address:**
Auth phase (initial Google OAuth wiring) and again explicitly re-verified in the deployment/custom-domain phase.

---

### Pitfall 7: Committing secrets or exposing the wrong key in a public, self-hostable open-source repo

**What goes wrong:**
Because PROJECT.md requires "no secrets in the codebase" and "self-hostable with documented env configuration," the two realistic failure modes are: (1) a `.env` file with real credentials accidentally committed (classic git mistake, especially early in a project before `.gitignore` is set up), and (2) confusing which Supabase key is safe to expose — the anon/publishable key is designed to be public and only matters if RLS is correct (see Pitfall 5), but the `service_role`/secret key must never appear in any committed file, CI config, or client bundle. Supabase does auto-scan public GitHub repos and revoke leaked secret keys, but only after the key has already been visible long enough for scraper bots to copy it — revocation is not prevention.

**How to avoid:**
- Set up `.gitignore` for `.env*` files before the first commit, and provide a checked-in `.env.example` with placeholder names only, as the documented self-hosting path.
- Add a pre-commit secret scanner (e.g. `gitleaks` or GitHub's own secret scanning, free on public repos) early in the project, not after a leak.
- Document explicitly in the README which env vars are safe to expose client-side (anon key) vs. server-only (any secret/service key, OAuth client secret), since this project's audience includes other developers self-hosting it.

**Warning signs:**
- `git log` shows a `.env` file ever committed, even if later removed (history still contains it — needs history rewrite, not just deletion).
- No `.gitignore` entry for env files exists in the first commit.

**Phase to address:**
Project setup/scaffolding phase — this must be in place before the first line of backend integration code, since it's much cheaper to prevent than to remediate (rotating keys, rewriting git history) after the repo is public.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Using `.toLowerCase()` instead of Turkish-aware folding for search | Faster to write, works in English demo | Core search silently fails for a large share of the actual (Turkish) library | Never — this is the product's core value prop |
| Exact title+author string match with no normalization | Simple to implement first pass | Misses trivial variants (extra whitespace, punctuation, subtitle) that are still "the same work" | Only as an interim step before normalization is added in the same phase |
| Skipping cross-user RLS isolation test ("it works for my one account") | Saves a few minutes of manual testing | Silent data leak between users, discovered only by an attacker or an embarrassed second user | Never |
| Hardcoding UI strings in English "for now, will i18n later" | Faster initial UI build | 3-5x more expensive to retrofit once strings are scattered across components; layout wasn't built with text-expansion in mind | Never for this project — bilingual TR/EN is a stated v1 requirement, so wire up the translation-key pattern from the first component |
| Skipping a keep-alive job for Supabase free tier | One less thing to build early | App silently breaks for real usage after ~7 idle days, looks like a bug report rather than a known constraint | Acceptable only during pure local development, must exist before any real usage/demo |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Open Library Covers API | Treating the "no cover found" blank/placeholder image as a valid cover and displaying it as-is | Append `?default=false` to get a proper 404 you can detect, and fall back to the user-upload-cover flow instead of showing a blank placeholder image |
| Open Library Covers API | Hammering the by-ISBN endpoint during bulk Excel import without throttling | Respect the documented ~100 requests / 5 minutes per-IP limit on non-CoverID/OLID lookups; batch/queue cover fetches during import with a delay, and cache results |
| Google Books API | Assuming full Turkish-edition coverage; showing "not found" as a dead end | Treat Google Books/Open Library as a convenience prefill only; always offer manual entry as a first-class fallback, exactly as PROJECT.md already anticipates |
| Google Books API | Calling the API with no key and hitting the shared global unauthenticated quota, causing intermittent unexplained 429s for all users | Register a free API key even though auth isn't required for basic search, to get project-specific (not globally shared) rate limits; keep the key server-side/proxied if any per-key restriction is applied |
| Supabase Auth (Google OAuth) | Hardcoding a single redirect URL / relying on default Site URL across dev, preview, and prod | Register all three origins in the allow-list and derive `redirectTo` dynamically from `window.location.origin` |
| Supabase Storage | Letting users upload arbitrary-size/type images directly to the covers bucket | Validate file type/size client- and server-side (RLS storage policy + a max size well under the 50MB/file free-tier cap, e.g. 2-5MB) and compress/resize before upload to conserve the 1GB free storage and 5GB egress quotas |
| Excel/CSV import | Splitting the file by newline before parsing (breaks on quoted multi-line fields), or not stripping a UTF-8 BOM (corrupts the first header name, e.g. `title` becomes `﻿title` and silently fails to map) | Use a real CSV/XLSX parser (not hand-rolled line-splitting), strip BOM, and validate header names case-insensitively with Turkish-aware folding (see Pitfall 1) since headers may themselves contain Turkish characters |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Client-side full-library scan for every keystroke in search | Feels fine at ~110 books, laggy or janky on low-end phones as the library grows | Debounce input; for this project's realistic scale (hundreds to low thousands of books), an indexed Postgres query (or a client-side prebuilt index with proper folding) is enough — no need for a search service | Noticeable above roughly 1,000-2,000 rows scanned client-side per keystroke without indexing/debouncing |
| Fetching full cover images (uncompressed, original API resolution) for every list row | Slow initial library load, wasted egress against the 5GB/month free-tier cap | Use the API's small/thumbnail cover size (Open Library `-S`/`-M` suffix, Google Books `smallThumbnail`) for list views, full-size only in a detail view | Noticeable once the library and its image traffic grow past a few hundred books viewed repeatedly per month |
| Re-fetching cover images from the external API on every page load instead of caching the URL/blob | Extra external API calls counted against rate limits, slower page loads | Store the resolved cover URL (or upload once to Supabase Storage) at add-time instead of re-querying the API on every render | As soon as more than a handful of books are viewed repeatedly |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| RLS disabled or missing policy on any table | Cross-user data leak (one user reads/writes another's library) | Enable RLS at table creation, write explicit per-operation policies, test with two real accounts (see Pitfall 5) |
| `service_role` key in any client-reachable code/env var | Full database bypass of all access control for anyone who finds it | Keep secret keys server-side only (Netlify Function env vars not exposed to the browser bundle); never prefix with a client-exposed env var convention |
| `.env` or API keys committed to public repo history | Credential theft, quota abuse on your account, or (for the secret key) full data exposure | `.gitignore` from commit #1, secret scanning enabled, `.env.example` with placeholders only |
| No file-size/type validation on cover image upload | Storage/bandwidth abuse against the free-tier quota, or malicious file upload | Validate MIME type and size both client- and server-side (Supabase Storage policy), cap well below the platform max |
| Trusting Excel/CSV import content without sanitizing before rendering | Stored XSS if a malicious or corrupted title/author field contains script-like content and is rendered unescaped | Rely on the frontend framework's default escaping (React/JSX escapes by default) and never use `dangerouslySetInnerHTML`/raw HTML injection for imported text fields |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Search silently returns zero results for Turkish-cased queries | User concludes "the book isn't in the app," possibly buys a duplicate — the exact failure the app exists to prevent | Fix folding (Pitfall 1) and add a "no results — try manual entry?" fallback distinct from a broken-search false negative |
| Cover image shows a blank/placeholder square with no indication it's "unavailable" vs. "still loading" | Confusing, looks broken | Detect the `?default=false` 404 case explicitly and show a deliberate "no cover — upload one?" state instead of an ambiguous blank image |
| Duplicate/edition warning fires on unrelated books with similar titles (false positive) | User loses trust in the "you already own this" signal and starts ignoring it | Use deterministic normalized title+author matching as primary signal, surface fuzzy near-matches as a dismissible suggestion, not a hard warning (Pitfall 2) |
| Bilingual UI where only some strings are translated (partial i18n) | Jarring mixed-language screens look unfinished, undermines portfolio-piece goal | Route every user-facing string through the i18n key system from the first component, never hardcode literal text even during early development |
| App appears to hang/error with no explanation when the free Supabase project is paused | Looks like the app is broken/abandoned | Detect the specific error/timeout pattern of a paused project and show a friendly "waking up, try again in a moment" message |

## "Looks Done But Isn't" Checklist

- [ ] **Search:** Often missing Turkish-aware case folding — verify with test words containing İ, I, ı in both query and stored data, not just ASCII test data.
- [ ] **Duplicate/edition detection:** Often missing a user-facing "possible duplicate" confirmation step during both manual add and bulk import — verify by importing/adding a title that's a near-miss (extra whitespace, subtitle) of an existing work.
- [ ] **Excel import:** Often missing BOM stripping, empty-cell tolerance, and Turkish-character header matching — verify with a real exported `.xlsx`/`.csv` from Turkish Excel containing empty series/genre cells, not a hand-crafted clean fixture.
- [ ] **Row Level Security:** Often missing on newly added tables during later phases (not just the first schema) — verify every table via a two-account cross-read/write test before each phase is marked done, not just once at the start.
- [ ] **Cover fetching:** Often missing a proper "not found" vs "blank placeholder" distinction and a fallback to manual/user-uploaded cover — verify by searching a Turkish-only title likely absent from both APIs.
- [ ] **OAuth login:** Often missing redirect URL registration for the final production custom domain — verify Google sign-in specifically on the deployed custom domain, not just localhost or the Netlify default subdomain.
- [ ] **i18n:** Often missing translation coverage on secondary screens (settings, stats, empty states, error messages) even when the main flows are translated — verify by fully switching the language toggle and walking every screen, not just the home search.
- [ ] **Free-tier resilience:** Often missing any keep-alive/monitoring for the Supabase project pause behavior — verify by checking whether a scheduled ping job exists and is actually running (not just written and forgotten).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|------------------|
| Turkish case-folding bug discovered post-launch | MEDIUM | Add the TR-aware fold function, backfill/recompute any precomputed search column via a migration, add regression tests with known Turkish gotcha words |
| RLS leak discovered post-launch | HIGH | Immediately enable RLS/fix policy, rotate any exposed keys, audit logs for unauthorized access, notify the (likely one, since this starts as a personal project) affected user if real leakage occurred |
| Committed secret found in git history | HIGH | Rotate the exposed key/credential immediately (assume compromised regardless of Supabase's auto-revocation), then rewrite git history (e.g. `git filter-repo`) to remove it from all commits, force-push with team/self awareness that history changed |
| `xlsx` vulnerability flagged by `npm audit`/Dependabot after the fact | LOW | Swap to the CDN-hosted patched build via `overrides`, or migrate the import path to CSV-only with a maintained parser; low urgency if import is not exposed as a public upload endpoint |
| i18n partially retrofitted, strings hardcoded in several places | MEDIUM-HIGH | Audit component-by-component for literal strings, move to translation keys incrementally, prioritize the most-used screens (search, add-book) first |
| Duplicate-detection false positives eroding trust | LOW | Adjust matching to deterministic normalized title+author, downgrade fuzzy matches to non-blocking suggestions, communicate the change so the user re-trusts the signal |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| Turkish case-folding search failure | Search/data-model phase | Test suite with known TR gotcha words (İstanbul, Işık, Kırık) run against both client and server search paths |
| Duplicate/edition matching false positives/negatives | Data model (work/copy) phase + Excel import phase | Manual test: add/import a near-miss title against an existing work, confirm suggestion (not silent merge/reject) behavior |
| Vulnerable `xlsx` dependency | Excel/CSV import phase | `npm audit` clean (or documented accepted-risk note in README) after dependency choice is finalized |
| Supabase free-tier project pausing | Infrastructure/deployment phase | Confirm a scheduled keep-alive job exists and has run successfully at least once within a 7-day window; confirm a friendly "waking up" UX state exists |
| RLS misconfiguration / data leak between users | Auth/multi-user data model phase | Two-account cross-read/write test performed and passing before phase sign-off; repeated for every new table added in later phases |
| OAuth redirect URL misconfiguration | Auth phase, re-verified in deployment phase | Google sign-in tested on the actual deployed custom domain, not just localhost |
| Secret leakage in public repo | Project setup/scaffolding phase | `.gitignore` covers env files from commit #1; secret scanning enabled; `.env.example` exists with placeholders only |
| i18n retrofit cost | Every UI-building phase from the first one | Language toggle walkthrough of every screen built in that phase before sign-off, not deferred to a dedicated "i18n phase" |

## Sources

- [MDN: String.prototype.toLocaleLowerCase()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/toLocaleLowerCase)
- [Dotted and dotless I in computing (Wikipedia)](https://en.wikipedia.org/wiki/Dotted_and_dotless_I_in_computing)
- [i18next-node Issue #157: Testing the Turkish "I" Problem](https://github.com/i18next/i18next-node/issues/157)
- [PostgreSQL mailing list: Turkish collation ILIKE bug (Windows vs Linux)](https://www.postgresql.org/message-id/19048-21ab9e2c673cf572%40postgresql.org)
- [CYBERTEC: Case-insensitive pattern matching in PostgreSQL](https://www.cybertec-postgresql.com/en/case-insensitive-pattern-matching-in-postgresql/)
- [PostgreSQL unaccent documentation](https://www.postgresql.org/docs/current/unaccent.html)
- [Postgres Professional: unaccent does not remove all diacritics](https://postgrespro.com/list/thread-id/1233978)
- [Snyk: CVE-2023-30533 Prototype Pollution in xlsx](https://security.snyk.io/vuln/SNYK-JS-XLSX-5457926)
- [SheetJS official CVE-2023-30533 advisory](https://cdn.sheetjs.com/advisories/CVE-2023-30533)
- [SarmaLinux: From xlsx to exceljs, when the advisory says "no fix available"](https://www.sarmalinux.com/blog/xlsx-to-exceljs-no-fix-available)
- [Supabase Docs: Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [SimpleBackups: Supabase Free Tier Paused and Lost Data](https://simplebackups.com/blog/supabase-free-tier-paused)
- [Open Library Developer Docs: Covers API](https://openlibrary.org/dev/docs/api/covers)
- [GitHub: openlibrary Issue #3362 — some covers not available via API](https://github.com/internetarchive/openlibrary/issues/3362)
- [DEV Community: Supabase RLS — 5 Common Mistakes](https://dev.to/lazydev_oh/supabase-rls-5-common-mistakes-i-broke-and-fixed-myself-38bl)
- [Medium: How Missing Row Level Security in Supabase Can Expose User Data](https://medium.com/@Gakusen/how-missing-row-level-security-in-supabase-can-expose-user-data-599dcab749f3)
- [Supabase Blog: Supabase Security Retro 2025](https://supabase.com/blog/supabase-security-2025-retro)
- [GuardLayer: Is it safe to expose the Supabase anon key?](https://www.guardlayer.io/blog/is-supabase-anon-key-safe)
- [Supabase Docs: Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [GitHub supabase/supabase Issue #41700: Google OAuth redirects to localhost](https://github.com/supabase/supabase/issues/41700)
- [René Kulik: Solving 404 errors with client-side routing on Netlify](https://www.kulik.io/2024/09/19/solving-404-errors-with-client-side-routing-in-react-applications-on-netlify/)
- [Datablist: What is Levenshtein distance for fuzzy matching?](https://www.datablist.com/learn/data-cleaning/fuzzy-matching-levenshtein-distance)
- [Journal of Informatics and Web Engineering: Lightweight String Similarity for Duplicate Detection in Academic Titles](https://journals.mmupress.com/index.php/jiwe/article/view/2107)
- [Xlork: How to Fix CSV Encoding Issues (UTF-8 BOM)](https://xlork.com/blog/csv-encoding-issues-utf8-windows1252)
- [NanToo Blog: CSV and Excel — UTF-8, Quoting, Line Breaks, and Lost Leading Zeros](https://nandemo-tools.com/en/blog/csv-rfc4180-excel-quirks)
- [SimpleLocalize: Why retrofitting i18n is expensive](https://simplelocalize.io/blog/posts/why-retrofitting-i18n-is-expensive/)
- [Supabase Docs: Storage file size limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Codementor: How I bypassed Google Books API rate limits](https://www.codementor.io/@srvkataria/how-i-bypassed-google-books-api-rate-limits-or-quota-vpmra29q0)

---
*Pitfalls research for: Ayraç (multi-user personal book catalog web app)*
*Researched: 2026-09-25*
