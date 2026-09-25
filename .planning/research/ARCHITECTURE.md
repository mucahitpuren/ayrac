# Architecture Research

**Domain:** Multi-user personal book library / home book catalog web app (Ayraç)
**Researched:** 2026-09-25
**Confidence:** MEDIUM (patterns cross-checked across multiple independent sources; no project-specific prior art for this exact combination, so applied by analogy from adjacent domains — multi-tenant SaaS RLS, library-system schemas, serverless API proxying)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      BROWSER (SPA, Netlify CDN)                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────────┐ │
│  │  Search /  │ │  Work/Copy │ │  Wishlist  │ │ Import (CSV/XLSX)│ │
│  │  Library   │ │  Add/Edit  │ │  + Move    │ │ parse+preview+   │ │
│  │  view      │ │  forms     │ │  to Library│ │ dedupe (client)  │ │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └────────┬──────────┘ │
│        │             │             │                │             │
│  ┌─────┴─────────────┴─────────────┴────────────────┴──────────┐ │
│  │        i18n layer (TR/EN)  +  Supabase client SDK            │ │
│  └───────────────────────────┬────────────────────┬─────────────┘ │
└────────────────────────────┬─┴────────────────────┴───────────────┘
                              │ (JWT-authenticated REST/RPC)   │ (same-origin fetch)
                              ▼                                ▼
                ┌──────────────────────────┐    ┌───────────────────────────┐
                │        SUPABASE          │    │   NETLIFY FUNCTION(S)     │
                │ ┌──────────────────────┐ │    │  book-search proxy        │
                │ │ Postgres + RLS       │ │    │  (holds Google Books key, │
                │ │  works / copies /    │ │    │   fans out to external    │
                │ │  profiles            │ │    │   APIs, merges results)   │
                │ ├──────────────────────┤ │    └─────────────┬─────────────┘
                │ │ Auth (email+pw,      │ │                  │
                │ │  Google OAuth)       │ │                  ▼
                │ ├──────────────────────┤ │    ┌───────────────────────────┐
                │ │ Storage (uploaded    │ │    │  EXTERNAL BOOK APIs       │
                │ │  cover images)       │ │    │  Open Library (no key)    │
                │ └──────────────────────┘ │    │  Google Books (key)       │
                └──────────────────────────┘    └───────────────────────────┘
```

The frontend is a static SPA deployed on Netlify's CDN. It talks to two backends: **Supabase** for everything that is the user's own data (auth, the work/copy catalog, uploaded covers), and a **single Netlify Function** for the one operation that must not run in the browser — looking up a book on external APIs that require a secret key. Everything else (search, CRUD, import, export, stats) is a direct, RLS-protected call from the browser to Supabase; there is no custom application server.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|-------------------------|
| SPA (Netlify static hosting) | UI, client-side search/filter, form state, i18n, CSV/XLSX parsing, client-side dedupe preview | Vite-built TS SPA, deployed as Netlify static site |
| Supabase Postgres + RLS | System of record for works, copies, profiles; per-user isolation enforced at the row level, not in app code | Tables with `user_id` column + RLS policy `user_id = auth.uid()` on every table |
| Supabase Auth | Sign-up/login (email+password, Google OAuth), issues JWT consumed by RLS | Supabase Auth, GoTrue under the hood |
| Supabase Storage | Stores user-uploaded cover images when the user opts out of the API-fetched cover | Storage bucket with path convention `covers/{user_id}/{copy_id}` and matching Storage RLS policies |
| Netlify Function: `book-search` | Sole place external book APIs are called from; hides the Google Books key, merges Open Library + Google Books results, returns normalized JSON | Single Netlify Function reading `GOOGLE_BOOKS_API_KEY` from env, no key needed for Open Library |
| External APIs (Open Library, Google Books) | Metadata + cover lookup by title/author for the "add a book" flow | Called only server-side, from the Netlify Function |

## Recommended Project Structure

```
ayrac/
├── src/                        # SPA source
│   ├── features/
│   │   ├── library/            # search + work/copy list + detail views
│   │   ├── add-book/           # search-external-API flow + manual entry form
│   │   ├── wishlist/           # wishlist list + "move to library" action
│   │   ├── import/             # CSV/XLSX parse, column mapping, preview, dedupe, commit
│   │   ├── stats/               # aggregate views (top authors, read-per-year, series gaps)
│   │   └── auth/                # login/signup, Google OAuth callback
│   ├── lib/
│   │   ├── supabase.ts          # single Supabase client instance
│   │   ├── normalize.ts         # Turkish-aware title/author folding (shared by dedupe + search)
│   │   ├── bookApi.ts           # thin client for the Netlify Function proxy
│   │   └── export.ts            # CSV/JSON export from in-memory data
│   ├── i18n/
│   │   ├── tr.json / en.json     # message catalogs
│   │   └── index.ts              # i18n setup, language persistence
│   └── app/                      # routing, layout, providers
├── netlify/
│   └── functions/
│       └── book-search.ts        # proxy: Open Library + Google Books, key hidden here
├── supabase/
│   └── migrations/                # SQL migrations: tables, RLS policies, indexes
├── .env.example                   # documents required env vars (self-host support)
└── netlify.toml
```

### Structure Rationale

- **`features/` over `components/`:** each feature (library, add-book, wishlist, import, stats, auth) maps to one requirement cluster from PROJECT.md and can be built, reviewed and shipped as a phase without touching the others.
- **`lib/normalize.ts` is shared, not duplicated:** both the import-time dedupe check and the "add a new work" duplicate warning must use the exact same Turkish-aware folding function, or they will disagree about what counts as a duplicate.
- **`netlify/functions/` holds exactly one function for v1:** resist the urge to add more serverless functions than necessary — everything that touches only the user's own data goes straight through Supabase's client SDK, which already enforces isolation via RLS.
- **`supabase/migrations/` is checked into the repo:** required for the "self-hostable with documented env configuration" constraint — anyone forking the repo runs the migrations against their own Supabase project.

## Architectural Patterns

### Pattern 1: Work/Copy split, scoped per user (not a shared global catalog)

**What:** One `works` row (title, author, series, series position, genre) can have zero or many `copies` rows (format, publisher, cover, reading status, rating, note). Both tables carry `user_id` and are scoped entirely to that user — there is no shared, cross-user canonical book catalog.

**When to use:** Any time the same intellectual work legitimately exists in the library more than once in different physical forms (Ayraç's core case: 1984 as novel + graphic novel, three copies of Nutuk).

**Trade-offs:** A shared global catalog (like Open Library's own work/edition model) would reduce data duplication across users and let title/author corrections propagate, but it requires canonicalization, conflict resolution between users' spellings, and moderation — none of which this project needs at ~110 books per user and a self-hosted, single-tenant-per-deployment model. Per-user scoping keeps RLS trivial and keeps every user's data fully independent, which also matches the "libraries stay private" constraint.

**Example:**
```sql
create table works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null,
  normalized_title text not null,        -- Turkish-folded, for search + dedupe
  author text not null,
  normalized_author text not null,
  series text,
  series_position numeric,
  genre text,
  is_wishlist boolean not null default false,
  created_at timestamptz not null default now()
);

create table copies (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  user_id uuid not null references auth.users(id), -- denormalized, see Pattern 2
  format text not null,                   -- 'novel' | 'graphic_novel' | 'special_edition' | 'other'
  publisher text,
  cover_url text,
  cover_source text not null default 'none', -- 'api' | 'upload' | 'none'
  reading_status text not null default 'to_read', -- 'to_read' | 'reading' | 'read' | 'abandoned'
  rating smallint check (rating between 1 and 5),
  note text,
  created_at timestamptz not null default now()
);
```

A work with zero `copies` rows and `is_wishlist = true` **is** the wishlist entry — "move to library" is just inserting a `copies` row and flipping `is_wishlist` to `false`, not a migration between two tables.

### Pattern 2: Denormalized `user_id` on child tables to keep RLS policies join-free

**What:** `copies.user_id` duplicates `works.user_id` instead of requiring the RLS policy on `copies` to join back to `works` to find the owner.

**When to use:** Any child table whose ownership is derived through a parent — always, for this project's scale.

**Trade-offs:** A small amount of denormalization (and a trigger or app-level guarantee that `copies.user_id` always equals `works.user_id`) in exchange for RLS policies that are a single equality check per table. Research on Supabase RLS repeatedly flags cross-table joins inside policies as the most common source of both security gaps (the joined table not having RLS enabled) and query slowdowns (policy re-evaluated per row via a subquery). Denormalizing avoids both failure modes outright.

**Example:**
```sql
alter table works enable row level security;
alter table copies enable row level security;

create policy "own works" on works
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own copies" on copies
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

### Pattern 3: Secret-holding proxy function for the one external, keyed API call

**What:** The browser never calls Google Books directly. A single Netlify Function accepts `{ query }`, calls Open Library (no key needed) and Google Books (key from `process.env.GOOGLE_BOOKS_API_KEY`) in parallel, merges/dedupes the results, and returns a normalized shape to the browser.

**When to use:** Any external API call that needs a secret credential, regardless of how "sensitive" that credential feels — the discipline of "secrets never enter the client bundle" is what makes the project genuinely self-hostable and safe to publish as open source.

**Trade-offs:** One extra network hop and one more moving part to deploy/monitor, versus a client-side call with a domain-restricted key baked into the build. The proxy wins here because (a) it keeps `.env.example` honest — a self-hoster sets one server-side env var and nothing leaks into their public JS bundle, and (b) it gives a single place to add response caching or rate-limit handling later without touching the frontend.

**Example:**
```typescript
// netlify/functions/book-search.ts
export default async (req: Request) => {
  const q = new URL(req.url).searchParams.get('q');
  const [openLib, googleBooks] = await Promise.allSettled([
    fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q!)}`),
    fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q!)}&key=${process.env.GOOGLE_BOOKS_API_KEY}`),
  ]);
  // merge + normalize both result shapes into { title, author, coverUrl, source }[]
  return new Response(JSON.stringify(mergeResults(openLib, googleBooks)), {
    headers: { 'content-type': 'application/json' },
  });
};
```

## Data Flow

### Request Flow — "Do I already own this book?" (core value)

```
User types in search box
    ↓
SPA: normalize query (Turkish fold) client-side
    ↓
Supabase client: select works.* , copies(*) where normalized_title ilike %q% or normalized_author ilike %q%
    (RLS silently restricts to auth.uid() — no app-level filtering needed)
    ↓
Postgres → rows returned, grouped by work in the client
    ↓
SPA renders: "1984 — you own 2 copies: novel, graphic novel"
```

At ~100–500 rows per user, this can run as a single unfiltered fetch on login (cached in memory) with instant client-side filtering as the user types — no round trip per keystroke, no server-side search infrastructure needed for v1.

### Request Flow — Add a book via external API

```
User types title in "add book" search
    ↓
SPA → Netlify Function /book-search?q=...
    ↓
Function → Open Library + Google Books (parallel) → merge → return list
    ↓
User picks a result
    ↓
SPA: run normalized-title/author check against already-loaded works
    ↓ (match found)                          ↓ (no match)
Show non-blocking "you already      Prefill title/author/cover;
own N copies" banner, let user       user confirms format/publisher;
proceed anyway                       SPA inserts work (+copy) directly
                                      into Supabase via client SDK
```

Duplicate detection is a **warning, not a hard block** — the data model explicitly wants to allow more than one copy of the same work, so the check exists only to prevent *accidental* re-purchase, never to prevent a legitimate second copy.

### Request Flow — Excel/CSV import

```
User selects file
    ↓
SPA parses file client-side (no server round trip — dataset is ~110 rows)
    ↓
For each row: normalize title/author, match against existing works (already in memory)
    ↓
Render staged preview table: every row visible, flagged as
  [new] / [likely duplicate of existing work] / [missing required field]
    ↓
User edits/corrects rows inline, confirms
    ↓
SPA batch-inserts confirmed rows (work + copy) via Supabase client SDK
    (nothing is written to the database before this explicit commit step)
```

### Key Data Flows

1. **Search/library view:** Supabase → SPA, read-only, RLS-scoped, client-side aggregation of copies under each work.
2. **Add/edit/import:** SPA → Supabase, all writes carry the authenticated user's JWT; RLS is the only enforcement point, so there is no separate "ownership check" to write in application code.
3. **External lookup:** SPA → Netlify Function → external APIs → SPA. This is the only flow that leaves the Supabase/Netlify boundary, and the only one where a secret exists.
4. **Cover storage:** either an external image URL (from the lookup flow, stored as-is in `copies.cover_url`) or an uploaded file (SPA → Supabase Storage → public/signed URL → stored in the same column). The column's `cover_source` field disambiguates the two without needing separate schema.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|---------------------------|
| 0–1k users (realistic ceiling for this project) | Current design as described: client-side search over an in-memory fetch, one Netlify Function, Supabase free tier. No changes needed. |
| 1k–100k users | Each self-hosted deployment is already isolated (own Supabase project), so this scale only matters for the author's own hosted instance. If reached: add a Postgres trigram index (`pg_trgm`) on `normalized_title`/`normalized_author` instead of client-side filtering once per-user libraries grow past a few thousand books; add a shared `book_lookup_cache` table keyed by normalized query so repeat external-API lookups don't all hit Google Books' daily quota. |
| 100k+ users | Out of scope for a personal/open-source cataloguing tool — the self-host model is the intended scaling strategy (spread load across many independent deployments), not a single shared multi-tenant service. |

### Scaling Priorities

1. **First bottleneck:** Google Books' free-tier daily quota (order of ~1,000 requests/day) shared across all users of one deployment, hit only if a single hosted instance serves many active users simultaneously. Fix: cache external lookup results by normalized query in Postgres, and lean on Open Library (no quota) as the primary source with Google Books as supplement.
2. **Second bottleneck:** unindexed `ilike` search once a single user's library grows past a few thousand rows (not expected here — the seed library is ~110 books). Fix: `pg_trgm` GIN index on the normalized columns.

## Anti-Patterns

### Anti-Pattern 1: Separate `wishlist_items` table mirroring `works`

**What people do:** Model the wishlist as its own table with its own title/author/series columns, then write a migration routine to copy a row into `works` when the user buys the book.

**Why it's wrong:** Duplicates the schema and the duplicate-detection logic in two places, and "move to library" becomes a delete-here/insert-there operation that can lose the row's history or id mid-flight. It also means a book can independently exist as both a wishlist entry and an owned work with no link between them, defeating the "you already wishlisted this" check.

**Do this instead:** A wishlist item *is* a `works` row with zero `copies` and `is_wishlist = true`. Buying the book is one `INSERT` into `copies` plus flipping a boolean — genuinely the "one tap" the requirements ask for.

### Anti-Pattern 2: Storing reading status/rating/note on `works` instead of `copies`

**What people do:** Put `reading_status`, `rating`, `note` on the work, reasoning "it's the same story regardless of edition."

**Why it's wrong:** It breaks the moment two copies of a work are genuinely different reading experiences — a graphic novel adaptation you finished versus a novel you haven't started, or two translations you'd rate differently. Since the domain already treats format/publisher/cover as copy-level, keeping status/rating/note at the work level creates an inconsistent model (some copy-specific facts live on the copy, others that are just as copy-specific live on the work).

**Do this instead:** Keep `reading_status`/`rating`/`note` on `copies`. If a work-level "have I read *any* copy of this" indicator is ever needed for a dashboard, compute it as an aggregate (`OR` across copies) rather than storing it redundantly.

### Anti-Pattern 3: Calling the external book API directly from the browser with an embedded key

**What people do:** Bake a Google Books API key into the frontend build (`VITE_GOOGLE_BOOKS_KEY`) and call the API straight from the client, relying on HTTP-referrer restriction for safety.

**Why it's wrong:** The key is visible in the shipped JS bundle and in every network request in devtools; referrer restriction helps but doesn't fully protect a public, open-source deployment where the domain itself is public knowledge, and it also means every self-hoster must go get and manage their own client-exposed key with no server-side fallback path.

**Do this instead:** Route the call through the single Netlify Function proxy (Pattern 3). It costs one extra hop and keeps the "no secrets in the codebase" constraint genuinely true.

### Anti-Pattern 4: Naive `.toLowerCase()` for duplicate-detection normalization

**What people do:** Fold title/author for comparison with plain `.toLowerCase()`.

**Why it's wrong:** Turkish text breaks this specifically — `'İ'.toLowerCase()` in JavaScript produces `'i̇'` (a plain `i` plus a combining dot above), not the plain ASCII `i`, so "İstanbul" and a user-typed "istanbul" will not compare equal. Given a library that is majority Turkish-language books, this is a near-certain source of missed duplicate warnings.

**Do this instead:** Maintain a single, tested normalization function (`lib/normalize.ts`) that explicitly folds the Turkish special cases (İ/I → i, ı → i, ş → s, ğ → g, ü → u, ö → o, ç → c) plus Unicode NFC normalization, store the result in a dedicated `normalized_title`/`normalized_author` column separate from the display string, and use that column for every comparison — search, import dedupe, and add-flow duplicate warning alike.

### Anti-Pattern 5: RLS policy that joins to a table without its own RLS enabled

**What people do:** Write a policy on `copies` that checks ownership via `exists (select 1 from works where works.id = copies.work_id and works.user_id = auth.uid())`, then forget to enable RLS on `works` itself (or vice versa).

**Why it's wrong:** If either table lacks RLS, the join-based check can be bypassed or the "protected" table can be queried directly without going through the join at all — a classic multi-tenant data-leak pattern.

**Do this instead:** Enable RLS on every table that holds user data (`works`, `copies`, `profiles`) and denormalize `user_id` onto `copies` (Pattern 2) so no policy ever needs to join tables to determine ownership.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|----------------------|-------|
| Supabase (Postgres, Auth, Storage) | Direct client SDK calls from the SPA, authenticated via JWT, isolation enforced by RLS | Free tier covers this project's scale comfortably; self-hosters create their own free Supabase project and run the checked-in migrations |
| Netlify (hosting + one Function) | Static site deploy + a single serverless function for the external-API proxy | `netlify.toml` declares the function; `GOOGLE_BOOKS_API_KEY` set as a Netlify env var, never committed |
| Open Library API | Called only from the Netlify Function; no API key required | Informal rate guidance (~1 req/sec); good coverage for public-domain/older titles, weaker on newer or Turkish-only editions |
| Google Books API | Called only from the Netlify Function, key from env | Free tier on the order of ~1,000 requests/day; better coverage for newer/commercial titles; still expect gaps for Turkish editions, hence manual entry stays a required fallback |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|----------------|-------|
| SPA feature modules ↔ Supabase | Supabase JS client SDK, per-feature query functions in `lib/` | No shared global store required at this scale — features read/write directly, relying on RLS for safety |
| SPA ↔ Netlify Function | `fetch('/.netlify/functions/book-search?q=...')`, same-origin, JSON in/out | Only integration point requiring server-side code; keep its response shape stable so the SPA doesn't need to know which upstream API a given result came from |
| import feature ↔ normalize/dedupe logic | Direct function import from `lib/normalize.ts`, shared with the add-book duplicate-warning check | Must be the same function in both places — see Anti-Pattern 4 |

## Sources

- [Row-Level Security in Supabase: Multi-Tenant SaaS from Day One](https://dev.to/issuecapture/row-level-security-in-supabase-multi-tenant-saas-from-day-one-4lon) (web, cross-checked, MEDIUM confidence)
- [Authorization via Row Level Security | Supabase Features](https://supabase.com/features/row-level-security) (official docs, cross-checked, MEDIUM confidence)
- [Row Level Security in Supabase: The Complete Guide to Multi-Tenant Data Isolation](https://engineersuniverse.com/studios/software-engineering/row-level-security-supabase-guide) (web, cross-checked, MEDIUM confidence)
- [Let's Create a Database Design for a Library System!](https://www.red-gate.com/blog/database-for-library-system/) (web, cross-checked, MEDIUM confidence)
- [Creating a Modern Library Database — Medium](https://medium.com/@danishman/creating-a-modern-library-database-b7dff4313f28) (web, cross-checked, MEDIUM confidence)
- [Bookstore Database Schema | DbModeller.net](https://dbmodeller.net/blog/schema/2022/11/23/bookstore-database-schema.html) (web, cross-checked, MEDIUM confidence)
- [Circumventing CORS with Netlify Functions & Node.js](https://medium.com/@kamry.bowman/circumventing-cors-with-netlify-functions-nodejs-65aa6ec69a65) (web, cross-checked, MEDIUM confidence)
- [Protecting API keys in frontend apps with Netlify Functions](https://msof.me/blog/protecting-api-keys-in-frontend-apps-with-netlify-functions/) (web, cross-checked, MEDIUM confidence)
- [Documentation on the OpenLibrary Covers API](https://github.com/Luca3317/OpenLibrary.NET/blob/main/docs/Covers%20API.md) (web, cross-checked, MEDIUM confidence)
- [Google books API vs open library API cost?](https://www.hinditechblog.com/2026/01/google-books-api-vs-open-library-api-cost.html) (web, cross-checked, MEDIUM confidence)
- [Designing An Attractive And Usable Data Importer For Your App — Smashing Magazine](https://www.smashingmagazine.com/2020/12/designing-attractive-usable-data-importer-app/) (web, cross-checked, MEDIUM confidence)
- [Designing Scalable CSV Importers: What a Good Importer Should Do](https://mfyz.com/designing-scalable-csv-importers-what-a-good-importer-should-do/) (web, cross-checked, MEDIUM confidence)
- [Lowercasing "İ" Adds a Character: How Turkish Text Broke a Keyword Router](https://dev.to/mahmut_gndzalp_c736ac4b/lowercasing-i-adds-a-character-how-turkish-text-broke-a-keyword-router-3com) (web, cross-checked, MEDIUM confidence)
- [Unicode normalization is not a deduplication key](https://dev.to/jack_e2a413ec5d0bba216/unicode-normalization-is-not-a-deduplication-key-4c6d) (web, cross-checked, MEDIUM confidence)
- [UTR #30: Character Foldings — Unicode Technical Report](https://unicode.org/reports/tr30/tr30-4.html) (official spec, HIGH confidence)

---
*Architecture research for: Multi-user personal book library / home book catalog web app*
*Researched: 2026-09-25*
