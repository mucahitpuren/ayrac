# Ayraç

## What This Is

Ayraç ("bookmark" in Turkish) is an open-source, multi-user web app for cataloguing the physical books you own. Its reason to exist: when you're about to buy a book online, you can pull it up on your phone and know in seconds whether that book is already on your shelf. It's built for book buyers with growing home libraries, starting with the author's own collection of about 110 books. It will be deployed on Netlify under a custom domain and published on GitHub as a portfolio project.

## Core Value

**"Do I already own this book?" gets a fast, reliable answer from any device.** A quick search by title or author must surface every copy of that work you own, even when it's a different edition, translation or format, so you never buy a duplicate by accident. If everything else fails, this must work.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Users can sign up and log in; each user's library is private and separate (multi-user)
- [ ] Instant search by title or author across the whole library, prominent on the home screen, usable one-handed on a phone
- [ ] Search matches at the **work** level: a hit shows every owned copy of that work (e.g. "1984 — you own 2 copies: novel, graphic novel"), so a different edition still triggers the "you already own this" signal
- [ ] Work / copy data model: one work (title, author, series, genre) can have many owned copies, each with its own format (novel, graphic novel, special edition…), publisher and cover (e.g. 3 copies of Nutuk)
- [ ] Import the existing library from Excel/CSV (columns: title, author, publisher, series position, genre), tolerating missing fields
- [ ] Add a new book by searching an external book API by title, picking the right result, and having title/author/cover prefilled. Manual entry as a fallback, since Turkish editions are often missing from APIs
- [ ] Book covers fetched automatically from a free book API. User can upload their own cover image instead
- [ ] Reading status per book: read / reading / abandoned / to-read
- [ ] Wishlist: books you want to buy, kept separate from the owned library. Moving a book to the library once bought takes one tap
- [ ] Series view: books grouped and ordered by series and position, so gaps (you own #1, #2, #4) are visible
- [ ] Rating (1–5) and personal note per book
- [ ] Statistics: total books, top authors, books read per year, and similar summaries
- [ ] Export the entire library as CSV/JSON (data ownership)
- [ ] Bilingual UI: Turkish + English (i18n)
- [ ] Responsive, mobile-first UI that works equally well on phone and desktop

### Out of Scope

- Barcode / ISBN camera scanning — user prefers search-and-pick. Existing library comes via Excel import
- Pasting a store link (Amazon, Kitapyurdu…) to check ownership — complex scraping. Quick search covers the need
- PWA / offline mode — not requested for v1
- Shelf location tracking — not requested
- Public shareable library/wishlist links — not requested. Libraries stay private
- Free-form tags — genre field is enough for now
- Purchase info (date, store, price) — not requested
- Lending tracking — not selected
- Native mobile apps — the responsive web app covers phone usage

## Context

- **Origin:** The author buys books more often than they read them, dreams of owning a large library, and has already bought a book they forgot they owned. The first goal is simply "see every book I own in one place"; the other features grew out of that.
- **Existing data:** About 100–110 physical books. All but the latest 2–3 are already in an Excel sheet with columns: book title, author, publisher, series position (if part of a series), genre. Some cells are empty.
- **Multiple versions are real:** e.g. two copies of *1984* (regular novel and graphic novel) and three copies of *Nutuk*. The data model must treat these as one work with several copies, not as duplicates to reject.
- **Turkish-language books** make up a large share of the library. Coverage of Turkish editions in Open Library and Google Books is uneven, so manual entry and user-uploaded covers matter.
- **Audience:** The author first, but it's open source so anyone can self-host or use the deployed instance. It also serves as a portfolio piece, so code quality, README and UX polish count.

## Constraints

- **Hosting:** Netlify with a custom domain — the frontend must deploy there. Backend/database/auth must be a service that pairs with Netlify (e.g. a BaaS or Netlify Functions + hosted DB), since Netlify has no built-in database
- **Cost:** Free tiers only (hosting, database, auth, book-cover API) — personal/open-source project
- **Cover source:** Must be a free API (e.g. Open Library Covers, Google Books)
- **Open source:** Public GitHub repo. No secrets in the codebase. Should be self-hostable with documented env configuration
- **Languages:** UI must support Turkish and English from the start

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Work / copy data model | Real library has multiple versions of the same work (1984 novel + graphic novel, 3× Nutuk). Ownership check must fire across editions | — Pending |
| Duplicate warning at work level (title+author), not ISBN | User wants to be warned even when a different edition or translation is owned | — Pending |
| Excel/CSV import as the primary onboarding path | ~110 books already catalogued in Excel. Retyping is unacceptable | — Pending |
| Search-and-pick for new books, no barcode scanning | User preference. Keeps v1 simpler | — Pending |
| Auth: email+password plus Google sign-in (final choice after research) | User delegated the decision. Google login is the most convenient on phones | — Pending |
| Bilingual TR/EN from v1 | Open-source and portfolio audience plus the author's own Turkish use | — Pending |
| Display unit is the physical **copy**, not the work: each copy is its own tile with its own cover (1984 graphic novel and 1984 novel appear as two separate books, never one tile marked "×2"). Ownership matching and the search verdict stay work-level | User: every copy has its own cover and identity, and merging them visually is wrong. The work/copy model is unchanged | — Pending |
| Genre auto-filled from the book API (Google Books `categories` / Open Library `subjects`), editable | The home page has genre shelves, and the user's Excel mostly lacks genre | — Pending |
| Home = shelves (last 6 added → series shelves in order with gaps → genre shelves). Header "Kütüphane" = full library with sort/filter/grid-list | Chosen in sketch 001 (A + shelves synthesis) | — Pending |
| Visual direction chosen via `/gsd-sketch` before the first UI-heavy phase | User hasn't picked a style yet and wants to compare mockups before coding | — Pending |
| Excel "Kitap Türü" column is mostly format, not genre | Real data shows values like Grafik Roman, Ciltli Baskı and Normal Kitap mixed with genre and notes, so import must let the user map each value | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-25 after initialization*
