# Roadmap: Ayraç

## Overview

Ayraç grows as a series of vertical slices. Each phase ends with something the author can actually use on their phone, starting from a deployed walking skeleton.

1. **Phase 1:** A private, bilingual, deployed shelf with manual entry. i18n, theming and secrets hygiene are wired from the first commit.
2. **Phase 2:** The core value ("do I already own this?"), with Turkish-aware, work-level instant search and a duplicate warning.
3. **Phase 3:** Import of the real 91-row Excel sheet, reviewed in a preview.
4. **Phase 4:** Faster adding through a book-API search-and-pick flow, plus covers.
5. **Phase 5:** Browsing, reading tracking and statistics.
6. **Phase 6:** Purchase planning, through the wishlist and series gaps.
7. **Phase 7:** Public launch. Custom domain, Google sign-in, data export and account deletion, keep-alive, and a self-hostable README.

Two hard gates run through every phase, and phases that touch them add a third:

- **Two-account RLS isolation test:** extended whenever a new table or storage bucket appears.
- **No secrets in the repo.**
- **Turkish folding tests:** added in Phase 2 and kept green afterwards.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Private Shelf (Walking Skeleton)** - Sign up, add books by hand as works with copies, edit/delete, bilingual + themed + mobile-first, live on Netlify
- [ ] **Phase 2: "Do I Already Own This?" Search** - Turkish-aware, work-level instant search on the home screen, near-match suggestions and a duplicate warning on add
- [ ] **Phase 3: Excel/CSV Import with Preview** - Bring the existing spreadsheet in with auto-mapped Turkish headers, editable preview, series/type mapping and dedup into works + copies
- [ ] **Phase 4: Search-and-Pick Add & Covers** - Add books via Google Books / Open Library through a key-hiding proxy, auto covers, camera uploads, bulk cover fetch after import
- [ ] **Phase 5: Browse, Reading & Stats** - Grid/list, sort, filter, author pages, reading status with finish dates, ratings, and a statistics page
- [ ] **Phase 6: Wishlist & Series** - A separate wishlist with one-tap "I bought it", and a series view that shows missing volumes, including omnibus copies
- [ ] **Phase 7: Public Launch** - Custom domain, Google sign-in, password reset, export CSV/JSON, account deletion, keep-alive, self-host README

## Phase Details

### Phase 1: Private Shelf (Walking Skeleton)

**Goal**: A user can create an account and keep a private shelf of hand-added books (one work, many copies) on a live Netlify URL, in Turkish or English, on phone or desktop.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-05, AUTH-07, LIB-01, LIB-02, LIB-06, LIB-08, LIB-09, LIB-10, ADD-02, READ-04, UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):

  1. User can sign up with email and password, log in and log out, and is still signed in after closing and reopening the browser.
  2. User can add a book by hand (title, author(s), genre and optional series name + position for the work; format, publisher and a personal note for the copy), then see it in the library list and on its work detail page.
  3. Adding a second copy of the same work (e.g. *1984* novel + graphic novel) lists it under that work on the detail page, not as a separate book. User can edit work and copy details, and can delete a copy or a whole work only after confirming.
  4. A second test account sees none of the first account's works or copies and cannot read or change them through the Supabase API. The automated two-account isolation test passes for every table.
  5. The deployed Netlify app switches between Turkish and English (browser language by default, choice remembered) and light/dark theme (system setting by default), and every screen is comfortable one-handed on a phone and also works on desktop.

**Plans:** 4/11 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Scaffold (pinned deps + legitimacy gate), bilingual i18n, pre-paint theme/lang, secrets hygiene

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Supabase dev + prod projects, CLI link, app client with secret-key guard, prod-guarded test harness, D-05 proven
- [x] 01-03-PLAN.md — Design system: warm-paper tokens light/dark, self-hosted fonts, theme store, base shadcn components, cover placeholder

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — Tracer: slug decision, full schema + RLS migration on dev, sign up / log in → own library

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 01-05-PLAN.md — App shell: language + theme menus, top bar, avatar menu, logout, session expiry
- [ ] 01-06-PLAN.md — Two-account RLS isolation matrix, static hardening gate, schema + RPC round-trip tests
- [ ] 01-07-PLAN.md — Deploy: secrets scanner, netlify.toml, GitHub + Netlify (per-context env), prod schema, live URL

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 01-08-PLAN.md — Add a book by hand (work + first copy, D-02/D-03 vocabularies, atomic save)

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 01-09-PLAN.md — Copy detail page: tinted hero, siblings, note autosave

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 01-10-PLAN.md — Second copy of a work: add-copy page + title-field work picker (D-07..D-09)

**Wave 8** *(blocked on Wave 7 completion)*

- [ ] 01-11-PLAN.md — Edit and confirmed delete of copies/works + release (schema push to dev/prod, live verify)

**UI hint**: yes
**Notes**:

- Run `/gsd-sketch` to choose the visual direction before planning this phase, since it's the first UI-heavy phase. Then run `/gsd-ui-phase 1`.
- **Secrets hygiene gate** (supports OPS-03, which is completed in Phase 7). `.gitignore` and `.env.example` exist from the first commit, `data/` (the author's real spreadsheet) is never committed, secret scanning is on, and only the Supabase anon key reaches the client.
- **Schema must be complete from the start.** It covers every LIB-01 field, including series name/position and copy-level volume coverage, so that Phase 3 import and Phase 6 series need no disruptive migration. RLS is enabled on each table when it's created, and child tables carry a denormalized `user_id`.
- **i18n rules.** Pick the key naming convention here. From this phase on, every new string ships in both the TR and EN catalogs, and all new layouts stay mobile-first.

### Phase 2: "Do I Already Own This?" Search

**Goal**: A user can type part of a title or author on the home screen and instantly see every copy they own of matching works (Turkish characters, typos and edition differences handled), and is warned before adding a work they already own.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, ADD-03
**Success Criteria** (what must be TRUE):

  1. The home screen opens with a prominent search box. Typing a fragment of a title or author updates the results as you type, with no noticeable delay, and it's usable one-handed on a phone.
  2. Typing "istanbul", "isik", "kirik" or "seker portakali" (in any case) finds "İstanbul", "Işık", "Kırık" and "Şeker Portakalı". The automated Turkish folding test suite covering these words passes.
  3. Each hit is one row per work, showing the copy count and formats (e.g. "1984 — 2 copies: novel, graphic novel").
  4. A query with a typo or a missing or extra subtitle shows near-match suggestions rather than an empty result.
  5. Adding a book whose normalized title+author already exists shows a warning with "add as new copy" or "cancel". Choosing "add as new copy" attaches the copy to the existing work.

**Plans**: TBD
**UI hint**: yes
**Notes**:

- **Research flag:** tune the fuzzy-match threshold against the real library (`data/kitaplar.xlsx`, used locally only). Committed tests use a synthetic fixture instead.
- **Single normalization rule.** One shared normalization module (Turkish İ/I/ı/i folding, then diacritics) feeds a stored normalized column. It's the only comparison rule, reused later by import dedup (Phase 3) and API add (Phase 4).

### Phase 3: Excel/CSV Import with Preview

**Goal**: A user can bring their existing spreadsheet (e.g. the author's 91-row Excel file) into Ayraç in one sitting, reviewing and fixing how every row is interpreted before anything is saved.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07, IMP-08
**Success Criteria** (what must be TRUE):

  1. User can upload an .xlsx or .csv file. Turkish headers ("Kitap Adı", "Yazar", "Yayınevi", "Seri Bilgisi", "Kitap Türü") are auto-mapped, and the user can change any column mapping.
  2. A per-row preview shows how each row will be read: "-" and blank cells appear as empty, titles like "1984" stay text, and any row can be edited. Nothing is saved until the user confirms.
  3. In the preview, the user can select rows and assign a series name. Positions like "8. Kitap", "1. ve 2. Kitap" and "1, 2 ve 3. Kitaplar" are parsed into the correct volume numbers.
  4. User can map each distinct "Kitap Türü" value to format, genre or note ("Grafik Roman" → format, "Şiir Kitabı" → genre, "Fotoğraflı Nutuk, Grafik Roman Değil" → note), and the imported copies reflect that mapping.
  5. Rows with the same normalized title+author become one work with several copies (the Nutuk rows become one work with 3 copies). Rows matching works already in the library are flagged with an "add as copy" or "skip" choice, and after confirming, the imported books appear in the library and in search.

**Plans**: TBD
**UI hint**: yes
**Notes**:

- **Research flag:** validate header detection, "-" handling, multi-volume position parsing and within-file dedup against the real `data/kitaplar.xlsx` locally. Commit only an anonymized fixture.
- **Security gate:** the `xlsx` npm package has an unfixed CVE (CVE-2023-30533). Use the patched SheetJS build or a safe alternative parser. Parsing happens in the browser.

### Phase 4: Search-and-Pick Add & Covers

**Goal**: A user can add a new book by searching an external catalog and picking the right result, and every book shows a real cover (fetched automatically or uploaded from the phone camera), with API keys never reaching the browser.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: ADD-01, ADD-04, ADD-05, COVR-01, COVR-02, COVR-03, IMP-09
**Success Criteria** (what must be TRUE):

  1. User can type a title, see results from Google Books / Open Library, pick one, and confirm a form prefilled with title, author, publisher and cover. The duplicate warning still fires if the work is already owned.
  2. The shipped bundle and the browser's network traffic contain no Google Books key. Every external book search goes through the Netlify Function proxy.
  3. Books without a real cover show the app's own placeholder, never a broken image or an API "image not available" tile. API placeholder images are detected and treated as missing.
  4. User can upload a cover image, including a phone camera photo. It's resized in the browser, files over the size limit are rejected with a clear message, and any cover can be replaced or removed. The two-account isolation test passes for the cover storage bucket.
  5. After an import, covers for the imported books are fetched in the background with visible progress, and the user can keep using the app meanwhile.

**Plans**: TBD
**UI hint**: yes
**Notes**:

- **Research flag:** confirm how placeholders are detected (Open Library `?default=false` returns 404; Google Books serves its own placeholder image). Also decide the upload size limit and resize target, keeping the 1 GB Supabase Storage quota in mind.

### Phase 5: Browse, Reading & Stats

**Goal**: A user can browse the whole library the way they prefer, track what they've read, and see summaries of their collection.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: LIB-03, LIB-04, LIB-05, LIB-07, LIB-11, READ-01, READ-02, READ-03, STAT-01, STAT-02, STAT-03, STAT-04
**Success Criteria** (what must be TRUE):

  1. User can switch the library between a cover grid and a list, sort it by title, author or date added, and filter it by format, genre and reading status.
  2. Tapping an author's name opens an author page listing every work by that author in the library.
  3. User can set a copy's reading status to to-read, reading, read or abandoned. Marking a copy as read records an editable finish date, and the user can rate the book from 1 to 5.
  4. A statistics page shows total works and copies, top authors by number of books, the breakdown by format and by reading status, and books read per year. The numbers reflect the current library after any change.

**Plans**: TBD
**UI hint**: yes

### Phase 6: Wishlist & Series

**Goal**: A user can keep a wishlist of books to buy, separate from what they own, and see each series in order with missing volumes clearly visible.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: WISH-01, WISH-02, WISH-03, WISH-04, SER-01, SER-02, SER-03, LIB-12
**Success Criteria** (what must be TRUE):

  1. User can add a book to the wishlist via API search or manual entry, and view the wishlist on its own screen. Wishlist books never show up as owned in the library, search results or statistics.
  2. One tap on a wishlist book ("I bought it") moves it into the library as an owned copy. User can also remove a book from the wishlist.
  3. A series view groups works by series name in position order and marks missing positions (e.g. owning #1, #2 and #4 shows #3 as missing).
  4. A single omnibus copy (e.g. "1, 2 ve 3. Kitaplar") counts as owning every volume it covers in the series view. User can set which volumes a copy covers when adding or editing it.

**Plans**: TBD
**UI hint**: yes

### Phase 7: Public Launch

**Goal**: Ayraç is live on its custom domain and always reachable. Google sign-in and password reset work in production, users can export or delete their data, and anyone can self-host it by following the README.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: AUTH-03, AUTH-04, AUTH-06, EXP-01, EXP-02, OPS-01, OPS-02, OPS-03
**Success Criteria** (what must be TRUE):

  1. The app is served over HTTPS on the custom domain. Signing in with Google and following a password-reset email link both finish back on the custom domain, with no blank page, error page or localhost redirect.
  2. User can export the library as CSV and the full data (works, copies, reading data, wishlist) as JSON. The CSV opens in Excel with Turkish characters intact.
  3. User can delete their account after confirming. Afterwards, no rows and no cover files belonging to that user remain.
  4. A scheduled keep-alive job keeps the free-tier Supabase project from pausing. If the backend is slow to respond, the user sees a friendly "waking up" state instead of an error.
  5. Someone else can clone the public repo and run their own instance using only the README and `.env.example`. The git history contains no secrets, and the two-account isolation test passes against the production deployment.

**Plans**: TBD
**UI hint**: yes
**Notes**:

- **Redirect allow-list:** register the custom domain, the default Netlify subdomain and a wildcard for preview URLs in the Supabase Auth redirect list, covering OAuth and password-reset emails.
- **Email limits:** the built-in email sender on Supabase's free tier is heavily rate-limited. Decide whether a custom SMTP provider is needed for sign-up and password-reset emails.
- **Export format:** the export schema mirrors the final data model, which is why export ships last.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Private Shelf (Walking Skeleton) | 4/11 | In Progress|  |
| 2. "Do I Already Own This?" Search | 0/TBD | Not started | - |
| 3. Excel/CSV Import with Preview | 0/TBD | Not started | - |
| 4. Search-and-Pick Add & Covers | 0/TBD | Not started | - |
| 5. Browse, Reading & Stats | 0/TBD | Not started | - |
| 6. Wishlist & Series | 0/TBD | Not started | - |
| 7. Public Launch | 0/TBD | Not started | - |
