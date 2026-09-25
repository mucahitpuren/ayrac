# Feature Research

**Domain:** Personal book library / home book catalog web app (multi-user)
**Researched:** 2026-09-25
**Confidence:** MEDIUM (cross-verified across multiple competitor products, user forums, and app-store listings; no single authoritative spec exists for this product category)

## Feature Landscape

### Table Stakes (Users Expect These)

Features every personal library app in this space has (Goodreads, LibraryThing, StoryGraph, Libib, BookBuddy). Missing these makes Ayraç feel unfinished, even though most are already scoped in PROJECT.md.

| Feature | Why Expected | Complexity | Notes | REQ prefix |
|---------|--------------|------------|-------|------------|
| Account + private library | Every competitor gates data behind an account; users expect their shelf to be theirs alone | LOW | Email+password + Google sign-in per PROJECT.md decision | AUTH |
| Add a book via search-and-pick | LibraryThing, Goodreads, BookBuddy all offer "search by title/ISBN, pick from results, autofill metadata" as the primary add path | MEDIUM | Needs a free book metadata API (Open Library / Google Books) with graceful "no exact match, add manually" fallback | ADD |
| Manual entry fallback | Every cataloging app supports this because API coverage is never complete, especially for non-English/regional editions | LOW | Critical for Turkish-language books per PROJECT.md context | ADD |
| Cover images | All competitors show cover art; users browse visually, not just by text list | LOW–MEDIUM | Auto-fetch + manual upload override, exactly as scoped | COVR |
| Reading status | Goodreads (want-to-read/currently-reading/read), StoryGraph, BookBuddy, Libib all have this as a primary filter axis | LOW | to-read/reading/read/abandoned covers the standard set plus DNF, which most competitors also track | READ |
| Wishlist / want-to-buy list, separate from owned | BookBuddy, Goodreads ("want to read" shelf), StoryGraph all separate "want" from "have" | LOW–MEDIUM | Must be a distinct list, not a status flag on an owned book, since an unowned book isn't a copy yet | WISH |
| Rating + personal note | Universal across every competitor studied — 5-star (or similar) rating plus free-text note/review | LOW | Standard 1–5 scale matches user mental model from Goodreads/StoryGraph | LIB |
| Series grouping | LibraryThing and Goodreads both group books into series with position numbers; StoryGraph and BookBuddy support series metadata | MEDIUM | Ordering by position number, not just alphabetical, is the expected behavior | SER |
| Basic stats (counts, top authors, per-year) | StoryGraph's stats/graphs are a headline feature; Goodreads' yearly reading challenge is one of its most-used features; BookBuddy has "reading insights" | LOW–MEDIUM | Simple aggregate counts are table stakes; StoryGraph-style mood/pace graphs are not (see Differentiators) | STAT |
| CSV/data export | LibraryThing and Book Track explicitly support CSV import/export; users of cataloging tools expect to own their data and not be locked in | LOW | Straightforward given a settled schema | EXP |
| Bulk import from spreadsheet | Book Track and LibraryThing both document CSV import as a first-class onboarding path; the "file → map columns → preview → confirm" pattern is the accepted UX standard for spreadsheet importers generally | MEDIUM–HIGH | See dedicated section below — this is higher complexity than it looks because of dedup and column-mapping edge cases | IMP |
| Instant/responsive search | Every competitor's core interaction is a search box; on Goodreads/LibraryThing it's edition-level, which is the gap Ayraç exploits (see Differentiators) | MEDIUM | Must be fast enough to feel instant on a phone over mobile data | SRCH |
| Mobile-usable UI | StoryGraph and BookBuddy are mobile-native; Goodreads/LibraryThing feel dated specifically because their mobile web experience lags their apps | MEDIUM | Responsive, one-handed, matches PROJECT.md's stated core-value scenario (checking while shopping on a phone) | LIB |

### Differentiators (Competitive Advantage)

These map directly to Ayraç's stated Core Value and are where it should out-perform every competitor studied, none of which fully solve "do I already own this, in any edition/format?"

| Feature | Value Proposition | Complexity | Notes | REQ prefix |
|---------|-------------------|------------|-------|------------|
| Work-level "already own it" match across editions/formats | This is the single feature no competitor gets right. Goodreads and LibraryThing model "work" internally (an ISBN edition rolls up to a work), but that grouping exists for browsing/reviews, not as a purchase-time duplicate *warning*. LibraryThing users explicitly ask on the forums "will LT warn me about a duplicate?" and the answer is no — LT only flags exact/near-exact ISBN matches, not a different edition or translation. Libib's duplicate warning is scan/ISBN-triggered, so a different edition's ISBN won't trigger it either | HIGH | This is Ayraç's headline differentiator. Needs fuzzy title+author matching (not just exact string match) surfaced prominently, e.g. "1984 — you own 2 copies: novel, graphic novel" | SRCH, LIB |
| Copies as first-class citizens, not deduped away | Standard cataloging apps treat a second copy of the same ISBN as a "you already have this" error to prevent, or silently increment a quantity field. Ayraç must actively support N distinct owned copies of one work (3× Nutuk) with independent format/publisher/cover per copy | MEDIUM–HIGH | Falls directly out of the work/copy schema decision; must be visible in both search results and the book detail view | LIB |
| Series gap visibility | LibraryThing/Goodreads show series membership as a list; they don't visually flag "you're missing #3." A dedicated "gap" indicator (own #1, #2, #4 → #3 highlighted as missing) is a small addition with outsized value for a book buyer actively completing series | LOW–MEDIUM | Pure UI/query feature on top of the series+position data already in scope | SER |
| Spreadsheet-first onboarding tuned for an existing Excel sheet | Book Track and LibraryThing support CSV import generically; few personal-library tools are designed around "you already have 100+ books catalogued informally and just need them ingested with minimal friction," including tolerating blank cells and multiple loosely-formatted rows for the same work | MEDIUM | Directly addresses the stated origin story: retyping ~110 books is unacceptable | IMP |
| Turkish-first metadata resilience | Open Library/Google Books coverage of Turkish editions is uneven (per PROJECT.md); competitors built for the English-language market don't design their add-flow around this gap. Making manual entry and manual cover upload first-class, not an apologetic fallback, is a differentiator for the TR audience specifically | LOW–MEDIUM | Mostly a UX/copy framing decision on top of already-scoped ADD/COVR features | ADD, COVR |
| Fast, unauthenticated-feeling mobile lookup as the app's front door | Competitors lead with a feed, a dashboard, or a "currently reading" widget. Ayraç's home screen should lead with the search box, because the core value moment is "I'm standing in a bookstore/browsing online, phone in hand" | LOW | Interaction-design choice more than a new feature — but it changes the priority of SRCH relative to everything else in the UI | SRCH |
| Self-hosted, open-source, free-tier-only | LibraryThing is free but closed-source and ad-supported at scale; StoryGraph is free-with-paid-tier; none of the studied competitors are designed to be self-hosted on a free-tier stack | LOW (product positioning, not a feature per se) | Supports the portfolio/open-source goal in PROJECT.md, not the core "already own it" value, but worth noting as a secondary differentiator | — |

### Anti-Features (Commonly Requested, Often Problematic)

All of these are already correctly placed in PROJECT.md's Out of Scope. Documenting *why* they're traps (not just "not doing it") so the decision survives roadmap and requirements phases.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Barcode/ISBN camera scanning | Feels like the "modern" fast-add method; Libib and BookBuddy both lead with it | Doesn't actually serve Ayraç's core value: you scan a barcode on a book you're physically holding, but the moment Ayraç exists to serve is checking a book you *don't* have in hand (browsing online/in a store display copy without a personal barcode to scan). It only accelerates adding books you've already decided to keep — a secondary workflow, not the core one. Also needs camera permission handling, device support triage, and doesn't work for import-from-Excel (the real onboarding path) | Search-and-pick by title/author (already scoped); scanning can be revisited in v2+ purely as an ADD convenience, not for the ownership check itself |
| Paste a store link (Amazon/Kitapyurdu) to check ownership | Feels magical — "check without typing anything" | Requires scraping third-party sites with unstable markup, is a ToS/legal risk, breaks silently when sites change layout, and doesn't scale to every store a user might browse | Instant title/author search already answers this in under a few keystrokes on mobile |
| PWA / offline mode | Feels essential for "modern web app" checklist completeness | Adds service-worker cache invalidation complexity and sync-conflict edge cases for a tool whose core use case (checking before buying) inherently happens with a network connection available | Fast online search is sufficient; revisit only if usage data shows frequent offline attempts |
| Shelf location tracking | Common in larger personal-library tools (LibraryThing supports it) | Only pays off at collection sizes/physical layouts (multiple rooms/bookcases) well beyond the ~110-book starting collection; adds a field to every copy that most users will leave blank and get stale | Series/genre grouping already gives enough browsing structure at this scale |
| Public shareable library/wishlist links | Goodreads' social graph is a major feature; sharing feels like an obvious add-on | Introduces privacy review, access-control surface, and social-feature scope (comments, follows) that has nothing to do with the core "do I own this" value and multiplies QA surface | Keep libraries private; if sharing is wanted later, ship as an explicit, separately-scoped feature with its own privacy model |
| Free-form tags | Goodreads' "shelves" are essentially user tags and are heavily used | Free-form taxonomies drift into duplicate/inconsistent tags over time and need merge/cleanup tooling to stay useful — real maintenance burden for a single-user-scale library | Genre + series + reading status already provide the structured axes this collection size needs |
| Purchase info (date, store, price) | Useful for budget-conscious buyers, and "how much have I spent" is a fun stat | Adds fields to every single add/import row for a benefit orthogonal to the core value; also makes CSV import mapping more complex for data the existing Excel sheet doesn't even contain | Skip for v1; if requested later, add as optional fields, not required ones |
| Lending tracker | BookBuddy has this; "who has my book" is a real pain point for some users | Different problem domain (social/trust tracking) requiring its own UI, notifications, and status model; scope creep relative to a private cataloging tool | Out of scope; a personal note field can informally cover "lent to X" if a user wants it |
| Native mobile apps | Every competitor studied ships app-store apps, which can feel more "real" | Doubles the build/maintenance surface (two more platforms) for a product whose mobile need is "open a browser tab and search," which a responsive web app already satisfies | Mobile-first responsive web UI (already scoped) |
| Multi-media cataloging (movies, music, games) | Libib supports all of these and it broadens the addressable use case | Every additional media type multiplies the metadata schema, external API integrations, and UI surface, diluting focus on the one thing Ayraç needs to nail (books) | Stay single-domain: books only |
| Social recommendations / algorithmic "what to read next" | StoryGraph's mood/pace-based recommendation engine is its most-loved feature | Requires either a licensed recommendation dataset or meaningful ML investment, and doesn't serve the "do I own this" question at all — it's a discovery feature, not an ownership feature | Not in scope for this product's value proposition; revisit only if the product's mission changes toward discovery |

## Feature Dependencies

```
AUTH (accounts + privacy)
    └──requires──> nothing (foundational, must ship first)

LIB (work/copy data model)
    └──requires──> AUTH (data must be scoped to a user)

SRCH (work-level instant search)
    └──requires──> LIB (needs work/copy schema to group editions under one work)

ADD (search-and-pick + manual entry)
    └──requires──> LIB (writes into the work/copy schema)
    └──enhances──> COVR (external API lookup can return a cover in the same call)

COVR (auto cover fetch + manual upload)
    └──enhances──> ADD, LIB (visual browsing/search results)
    └──conflicts (partially)──> Turkish-edition coverage gaps (external API often has no cover for TR editions; manual upload must never feel like a broken fallback)

IMP (Excel/CSV import)
    └──requires──> LIB (must resolve rows into the work/copy schema, including grouping multiple rows into one work with multiple copies, e.g. 3 rows of "Nutuk")
    └──enhances──> SRCH (import is the main way the "already own it" corpus gets populated on day one)

WISH (wishlist)
    └──requires──> LIB (moving a wishlist item to the library creates a copy in the existing schema)
    └──enhances──> SRCH (should the "already own it" search also surface "already on your wishlist" as a softer signal? — flag as an open question, see Gaps)

SER (series grouping + gap visibility)
    └──requires──> LIB (series + position fields on the work)

READ (reading status)
    └──requires──> LIB (status lives on the copy/work)
    └──enhances──> STAT (status feeds "books read per year")

STAT (statistics)
    └──requires──> LIB, READ (needs populated book + status data to be meaningful)

EXP (CSV/JSON export)
    └──requires──> LIB, READ, WISH, SER (export schema must mirror the finalized internal data model — should be one of the last things finalized before implementation, so the schema doesn't need a second export-format revision)

I18N (TR/EN)
    └──cross-cuts──> every user-facing feature (string externalization should start on day one, not be retrofitted — retrofitting i18n after UI copy is hardcoded is a common rewrite trigger)
```

### Dependency Notes

- **SRCH requires LIB:** The entire "already own it" value proposition depends on the work/copy model existing first. If search ships against a flat book-per-row model, work-level matching across editions becomes a retrofit, not a feature. This is the single most important ordering constraint for the roadmap.
- **IMP requires LIB, and must handle within-file duplicates:** The Excel import is not just "one row → one copy." Multiple rows in the same spreadsheet may represent multiple copies of the same work (the user's own Nutuk example). Import logic needs the same work-matching logic that SRCH uses, applied at ingest time — treat this as shared logic, not two separate implementations.
- **ADD enhances COVR, doesn't require it:** A book can be added with no cover (blank placeholder) and the cover can be filled in later; don't block the add flow on a successful cover fetch.
- **WISH requires LIB:** Converting a wishlist entry to an owned copy is a state transition on the same schema, not two independent record types with an ad hoc conversion script.
- **EXP should be scheduled last among data features:** Because it requires all other data-shape decisions (LIB, READ, WISH, SER) to be settled, define it after the others, not before, to avoid a second migration of the export format.
- **I18N cross-cuts everything:** LibraryThing and Goodreads both retrofitted internationalization years after launch and it shows in UI inconsistency across languages. Since PROJECT.md commits to bilingual from v1, string externalization (i18n keys, not hardcoded copy) should be a day-one convention enforced across every phase, not a separate phase bolted on at the end.

## Delight Requirements: "Already Own It" Check and Import Flow

These are UX behaviors (not new features) that determine whether the two flows tied to Core Value actually feel delightful rather than merely functional.

### The "already own it" check

- **Zero-friction entry point:** search must be reachable in one tap from anywhere in the app (persistent search bar or prominent home-screen placement), because the real-world trigger is "phone out, standing in a store or browsing a site" — any extra navigation step defeats the purpose.
- **Match at the work level, always, by default:** a search for "1984" must return one grouped result showing all owned copies, not two separate rows a user has to mentally merge. Competitors that show edition-level results (Goodreads, LibraryThing) force the user to do this merging themselves, which is exactly the failure mode Ayraç exists to prevent.
- **Fuzzy, not exact, title/author matching:** must tolerate partial titles, different capitalization, and common author-name variations (e.g., "Orwell" vs "George Orwell"), since a shopper typing on a phone under time pressure won't type a perfect query.
- **Unambiguous ownership signal:** the result should answer the question in the first glance — a clear "You own 2 copies" badge/count, not a list the user has to count themselves.
- **Handle the negative case gracefully:** "no matches — you don't own this yet" should be just as fast and clear as a positive match, since it's the answer that greenlights a purchase; ambiguous or slow negative results undermine trust in the whole tool.
- **Should surface wishlist status too (open question):** if the searched book is already on the wishlist (wanted but not owned), consider surfacing that as a distinct, lower-urgency signal ("on your wishlist" vs "already own"), so the tool also prevents "I already decided I want this and forgot."

### The import flow

- **Preview before commit:** show the user what will be created (grouped works with copy counts) before writing anything, following the "file → map → validate → preview → confirm" pattern that is the accepted standard for spreadsheet importers. This is especially important here because import is also where the work/copy grouping logic gets exercised for the first time (e.g., correctly grouping 3 Nutuk rows into 1 work + 3 copies) — the user should get to sanity-check that grouping before it's permanent.
- **Tolerate messy data without failing the whole import:** missing genre, missing series position, blank publisher — per PROJECT.md, the existing sheet has empty cells; a row-level partial success (import what's present, flag what's missing) beats an all-or-nothing failure.
- **Make column mapping forgiving:** auto-detect the sheet's existing columns (title, author, publisher, series position, genre) by header name where possible, but let the user confirm/remap rather than forcing an exact template match — matches the "provide a template, but don't require exact conformance" best practice from spreadsheet-import UX research.
- **No re-typing, ever, for the initial ~110 books:** this is the explicit motivating complaint in PROJECT.md's origin story; any import flow that still requires manual touch-up on more than a handful of rows has failed its purpose.
- **Import is a one-time-feeling but repeatable action:** users will likely want to re-run import later (e.g., digitizing more of an existing paper/spreadsheet backlog), so the flow shouldn't assume it only ever runs once — it should handle re-import against an already-populated library without creating unwanted duplicate copies.

## MVP Definition

### Launch With (v1)

This matches PROJECT.md's Active requirements — restated here with the delivery-order rationale from the dependency graph above.

- [ ] AUTH — accounts + private per-user libraries (foundational; nothing else can ship without it)
- [ ] LIB — work/copy data model (foundational; everything else depends on it)
- [ ] SRCH — work-level instant search ("already own it" check; this is the core value, must be excellent, not adequate)
- [ ] IMP — Excel/CSV import with preview, tolerant of missing fields (this is how the library gets populated on day one — without it there's nothing to search)
- [ ] ADD — search-and-pick add with manual-entry fallback (keeps the library growing after import)
- [ ] COVR — auto cover fetch + manual upload (visual completeness, supports ADD/LIB)
- [ ] READ — reading status (table stakes, low cost)
- [ ] WISH — wishlist separate from library, one-tap convert (table stakes, directly related to core value)
- [ ] SER — series grouping with gap visibility (differentiator, low-medium cost, built on already-scoped data)
- [ ] Rating + note (table stakes, low cost, part of LIB)
- [ ] STAT — basic counts/top authors/per-year (table stakes, low cost once READ+LIB exist)
- [ ] EXP — CSV/JSON export (data ownership, should be scheduled after data model settles)
- [ ] I18N — TR/EN from day one (cross-cutting convention, must start at first UI work, not bolted on later)

### Add After Validation (v1.x)

- [ ] Wishlist-aware search signal ("already on your wishlist") — add once the core ownership-check search is proven and stable, as a refinement rather than launch-blocking scope
- [ ] Barcode/ISBN scanning as an ADD convenience only (not for the ownership check) — add if users report the search-and-pick add flow is too slow for rapid-fire cataloging sessions
- [ ] Re-import / merge safeguards refinement — if usage shows people re-running import against a populated library, invest in smarter duplicate-avoidance during re-import

### Future Consideration (v2+)

- [ ] Purchase info (date/store/price) — defer until there's demand for spend-tracking stats
- [ ] Public shareable library link — defer until/unless a real request for sharing surfaces, and treat as its own privacy-scoped feature
- [ ] Native mobile app wrapper — defer indefinitely unless the responsive web app proves insufficient on real devices
- [ ] Mood/pace-style recommendation engine (StoryGraph-style) — a discovery feature, not an ownership feature; orthogonal to this product's mission

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| AUTH | HIGH | LOW | P1 |
| LIB (work/copy model) | HIGH | MEDIUM | P1 |
| SRCH (work-level search) | HIGH | MEDIUM–HIGH | P1 |
| IMP (Excel import) | HIGH | MEDIUM–HIGH | P1 |
| ADD (search-and-pick) | HIGH | MEDIUM | P1 |
| COVR (covers) | MEDIUM | LOW–MEDIUM | P1 |
| READ (status) | MEDIUM | LOW | P1 |
| WISH (wishlist) | MEDIUM–HIGH | LOW–MEDIUM | P1 |
| SER (series + gaps) | MEDIUM | MEDIUM | P1 |
| Rating + note | MEDIUM | LOW | P1 |
| STAT (basic stats) | LOW–MEDIUM | LOW–MEDIUM | P1 |
| EXP (export) | MEDIUM | LOW | P1 |
| I18N (TR/EN) | MEDIUM (HIGH for TR-first audience) | LOW–MEDIUM if started early, HIGH if retrofitted | P1 |
| Wishlist-aware search signal | LOW–MEDIUM | LOW | P2 |
| Barcode scanning (ADD-only) | LOW | MEDIUM | P3 |
| Purchase info fields | LOW | LOW | P3 |
| Public sharing | LOW (for this project's audience) | MEDIUM–HIGH | P3 |
| Recommendation engine | LOW (off-mission) | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Goodreads | LibraryThing | StoryGraph | Libib | BookBuddy | Ayraç's Approach |
|---------|-----------|--------------|------------|-------|-----------|-------------------|
| Cross-edition duplicate/ownership warning | No — groups editions into a "work" for browsing, but doesn't warn on add | No — confirmed on official forums that it does not warn about a different edition, only near-exact ISBN matches | Not designed for this use case (discovery-first) | Warns only on ISBN/scan match (same edition) | No dedicated warning; relies on manual "My Books" review | Explicit work-level match surfaced at search time and at add time, across all formats/editions — the core differentiator |
| Multiple copies of one work | Awkward — typically tracked as duplicate entries or ignored | Supported for serious collectors but manual/advanced | Not a focus | Supported via manual quantity/duplicate entries | Supported via manual duplicate entries | First-class: one work, many copies, each with its own format/publisher/cover |
| CSV import | Supported (legacy, clunky) | Supported | Imports directly from Goodreads export | Supported | Supported | Supported with preview + tolerant missing-field handling, tuned to the user's existing Excel column layout |
| Series with position | Yes | Yes, plus deep bibliographic linking | Yes | Basic | Basic | Yes, plus explicit gap visibility ("missing #3") |
| Stats/analytics | Yearly reading challenge, basic counts | Basic | Deep mood/pace graphs (headline feature) | Basic | "Reading insights" (books, pages, authors, genres) | Basic counts/top authors/per-year for v1; deliberately not chasing StoryGraph's analytics depth |
| Add methods | Search, ISBN | Search, ISBN, manual, many bibliographic sources | Search, ISBN, Goodreads import | Barcode scan, ISBN, search | Barcode scan (camera/Bluetooth), ISBN, search, manual, CSV | Search-and-pick + manual entry only — no scanning, by design |
| Social/sharing | Core feature (reviews, friends, feed) | Community/forums | Growing social features | Minimal | Minimal | None — private libraries only |
| Media scope | Books only | Books, movies, music | Books only | Books, movies, music, games, more | Books only | Books only |
| Self-hosted/open-source | No | No | No | No | No | Yes — open source, free-tier deployable |
| i18n | English-primary | English-primary | English-primary | English-primary | English-primary | TR/EN from v1 |

## Sources

- [LibraryThing forum: "Will LT warn you that you are adding a duplicate book?"](https://www.librarything.com/topic/338795) — MEDIUM confidence (community forum, but direct statements from LT context on current behavior)
- [LibraryThing forum: "Confirm duplicate library additions" feature request](https://www.librarything.com/topic/339640) — MEDIUM confidence
- [Libib Support Center: Add Items](https://support.libib.com/libib/website/add-items.html) — MEDIUM confidence (official product docs)
- [Under the Covers: The Book Inventory Software I Use to Track My Home Library](https://www.underthecoversbookblog.com/book-inventory-software/) — LOW–MEDIUM confidence (personal blog, useful for real-world usage patterns)
- [BookBuddy: Digital Library — App Store listing](https://apps.apple.com/us/app/bookbuddy-digital-library/id6479371172) — MEDIUM confidence (official app-store description)
- [BookBuddy: Book Tracker — App Store listing](https://apps.apple.com/us/app/bookbuddy-book-tracker/id395150347) — MEDIUM confidence
- [Bookwise: Goodreads vs LibraryThing comparison](https://bookwiseapp.com/blog/goodreads-vs-librarything) — LOW–MEDIUM confidence (third-party comparison blog)
- [Bookwise: Goodreads vs StoryGraph comparison](https://bookwiseapp.com/blog/goodreads-vs-storygraph) — LOW–MEDIUM confidence
- [Bookwise: LibraryThing Alternatives](https://bookwiseapp.com/blog/librarything-alternatives) — LOW–MEDIUM confidence
- [Book Tracker: Migrating from other apps via CSV Import](https://booktrack.app/migrating-from-other-apps-via-csv-import/) — MEDIUM confidence (official product docs, directly relevant to import UX)
- [Book Tracker: The Best App to Catalog Books in 2026 — Why Metadata Matters](https://booktrack.app/blog/the-best-app-to-catalog-books-in-2026-why-metadata-matters/) — LOW–MEDIUM confidence
- [CSVBox: Best UX flow for spreadsheet imports](https://blog.csvbox.io/spreadsheet-import-ux/) — MEDIUM confidence (specialized vendor content, cross-checked against multiple similar sources)
- [Dromo: 5 Best Practices to Streamline Your CSV Import Process](https://dromo.io/blog/5-best-practices-to-streamline-your-csv-import-process) — MEDIUM confidence
- [OneSchema: 5 Best Practices for Building a CSV Uploader](https://www.oneschema.co/blog/building-a-csv-uploader) — MEDIUM confidence
- [OwlCrate: 6 Of The Best Book Tracking Apps & How They Work](https://www.owlcrate.com/blogs/community/best-book-tracking-apps) — LOW–MEDIUM confidence
- [Plumerie: Best Free Book Catalog Apps in 2026](https://www.plumerielibrary.com/blog/best-book-catalog-apps-2026) — LOW–MEDIUM confidence
- Direct product knowledge of Goodreads' work/edition model (each ISBN is an "edition," editions with matching text roll up into a "work") — MEDIUM confidence, cross-referenced across multiple community sources

---
*Feature research for: personal book catalog / home library web app*
*Researched: 2026-09-25*
