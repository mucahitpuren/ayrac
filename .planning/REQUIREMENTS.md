# Requirements: Ayraç

**Defined:** 2026-09-25
**Core Value:** "Do I already own this book?" gets a fast, reliable answer from any device, at the work level, across editions and formats.

## v1 Requirements

Requirements for the initial release. Each one maps to a roadmap phase.

### Authentication

- [x] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User can log in and log out
- [ ] **AUTH-03**: User can reset a forgotten password via an email link
- [ ] **AUTH-04**: User can sign in with Google
- [x] **AUTH-05**: User session persists across browser restarts
- [ ] **AUTH-06**: User can delete their account and all of their data
- [ ] **AUTH-07**: User can only ever see and change their own data (verified with a two-account isolation test on every table and storage bucket)

### Library

- [ ] **LIB-01**: A work stores title, author(s), genre and an optional series name + position. A copy stores format (e.g. novel, graphic novel, hardcover), publisher, cover, optional volume coverage and an optional edition title that can differ from the work title (e.g. "Gençler İçin Fotoğraflarla Nutuk" under the work "Nutuk")
- [ ] **LIB-02**: User can own multiple copies of one work (e.g. 1984 novel + graphic novel; Nutuk ×3)
- [ ] **LIB-03**: User can browse the library as a cover grid or a list and switch between them
- [ ] **LIB-04**: User can sort the library by title, author or date added
- [ ] **LIB-05**: User can filter the library by format, genre and reading status
- [ ] **LIB-06**: User can open a work detail page showing every owned copy of that work
- [ ] **LIB-07**: User can open an author page listing every work by that author in their library
- [ ] **LIB-08**: User can edit work and copy details
- [ ] **LIB-09**: User can delete a copy or a work after confirming
- [ ] **LIB-10**: Every owned copy is shown as its own book with its own cover in the library, shelves and search results. Copies of the same work are never merged into one tile (e.g. no "1984 ×2")
- [ ] **LIB-11**: The home page shows shelves: the last 6 added copies, then one shelf per genre (largest first), each with "see all" opening the filtered library. The header "Library" link opens the full sortable/filterable library
- [ ] **LIB-12**: The home page also shows one shelf per series, with books in position order and missing volumes shown as placeholders

### Search

- [ ] **SRCH-01**: User can search by title or author with instant, as-you-type results from a search box that is prominent on the home screen
- [ ] **SRCH-02**: Search is Turkish-aware and case/diacritic-insensitive ("istanbul" matches "İstanbul", "seker portakali" matches "Şeker Portakalı", I/ı/İ/i handled correctly)
- [ ] **SRCH-03**: Search results are grouped per work and show the copy count and formats (e.g. "1984 — 2 copies: novel, graphic novel")
- [ ] **SRCH-04**: When there is no exact match, user sees near-match suggestions (typos, subtitle differences)
- [ ] **SRCH-05**: Search is comfortable one-handed on a phone and updates without noticeable delay

### Add Book

- [ ] **ADD-01**: User can search an external book API (Google Books / Open Library) by title, pick a result, and get title, author, publisher and cover prefilled
- [ ] **ADD-02**: User can add a book manually when the API has no match
- [ ] **ADD-03**: When adding a work that already exists in the library, user is warned and can choose "add as new copy" or cancel
- [ ] **ADD-04**: External API keys are never exposed to the browser (calls go through a server-side proxy)
- [ ] **ADD-05**: Genre is auto-filled from the book API (Google Books `categories` / Open Library `subjects`), mapped to the app's genre list and editable. This includes books imported from Excel, which are enriched in the same background pass as covers

### Covers

- [ ] **COVR-01**: Covers are fetched automatically from a free API when available. A placeholder is shown when no cover exists (API placeholder images are detected and treated as "no cover")
- [ ] **COVR-02**: User can upload their own cover image, including a phone camera photo, with enforced size limits and client-side resizing
- [ ] **COVR-03**: User can replace or remove a cover

### Import

- [ ] **IMP-01**: User can upload an .xlsx or .csv file to import their library
- [ ] **IMP-02**: Columns are auto-mapped, including Turkish headers ("Kitap Adı", "Yazar", "Yayınevi", "Seri Bilgisi", "Kitap Türü"), and user can edit the mapping
- [ ] **IMP-03**: "-" and empty cells are treated as missing values. Numeric-looking titles (e.g. 1984) are imported as text
- [ ] **IMP-04**: User sees a preview of how each row will be interpreted and can edit it before anything is saved
- [ ] **IMP-05**: Rows with the same normalized title+author are imported as one work with multiple copies
- [ ] **IMP-06**: User can assign a series name to selected rows in the preview. Series positions are parsed, including multi-volume values ("8. Kitap", "1. ve 2. Kitap", "1, 2 ve 3. Kitaplar")
- [ ] **IMP-07**: User can map values from a mixed "type" column to format, genre or note (e.g. "Grafik Roman" → format, "Şiir Kitabı" → genre, "Fotoğraflı Nutuk, Grafik Roman Değil" → note)
- [ ] **IMP-08**: Rows matching works already in the library are flagged, and user can choose to add them as a copy or skip them
- [ ] **IMP-09**: After import, covers are fetched in bulk in the background with visible progress

### Reading

- [ ] **READ-01**: User can set a reading status per copy: to-read / reading / read / abandoned
- [ ] **READ-02**: Marking a copy as read records a finish date, which user can edit
- [ ] **READ-03**: User can rate a book from 1 to 5
- [ ] **READ-04**: User can add a personal note to a book

### Wishlist

- [ ] **WISH-01**: User can add a book to the wishlist via API search or manual entry
- [ ] **WISH-02**: User can view the wishlist separately from the owned library
- [ ] **WISH-03**: User can move a wishlist book into the library as an owned copy with one tap
- [ ] **WISH-04**: User can remove a book from the wishlist

### Series

- [ ] **SER-01**: User can open a series view that groups works by series name, ordered by position
- [ ] **SER-02**: The series view shows which positions are owned, so gaps are visible (own #1, #2, #4 → #3 missing)
- [ ] **SER-03**: A single copy can cover multiple series volumes (omnibus editions)

### Statistics

- [ ] **STAT-01**: User can see the total number of works and copies
- [ ] **STAT-02**: User can see their top authors by number of books
- [ ] **STAT-03**: User can see the breakdown by format and by reading status
- [ ] **STAT-04**: User can see the number of books read per year

### Export

- [ ] **EXP-01**: User can export their library as CSV
- [ ] **EXP-02**: User can export their full library (works, copies, reading data, wishlist) as JSON

### UI & Language

- [ ] **UI-01**: The UI is available in Turkish and English. The language defaults to the browser language, can be switched, and the choice is remembered
- [ ] **UI-02**: User can switch between light and dark themes (defaulting to the system setting)
- [ ] **UI-03**: Layout is responsive and mobile-first, and works well on both phone and desktop

### Deployment & Open Source

- [ ] **OPS-01**: App is live on Netlify under a custom domain over HTTPS
- [ ] **OPS-02**: Backend stays reachable despite free-tier inactivity pausing (scheduled keep-alive)
- [ ] **OPS-03**: Repository is self-hostable, with a README, `.env.example` and no committed secrets

## v2 Requirements

Deferred to a future release. Tracked but not in the current roadmap.

### Search

- **SRCH-V2-01**: Search results also indicate when a book is on the user's wishlist

### Import

- **IMP-V2-01**: Re-importing a spreadsheet merges with the existing library without creating duplicate copies

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Barcode / ISBN camera scanning | User prefers search-and-pick. The existing library arrives via Excel import. It also can't help at purchase time, because you only scan books you already hold |
| Paste store link to check ownership | Needs scraping per store. Quick search covers the need |
| PWA / offline mode | Not requested for v1 |
| Shelf location | Not requested |
| Public shareable library/wishlist links | Libraries stay private |
| Free-form tags | Genre field is enough for now |
| Purchase info (date, store, price) | Not requested |
| Lending tracking | Not selected |
| Native mobile apps | Responsive web app covers phone usage |
| Shared global book catalog across users | Per-user data keeps privacy and RLS simple |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 7 | Pending |
| AUTH-04 | Phase 7 | Pending |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 7 | Pending |
| AUTH-07 | Phase 1 | Pending |
| LIB-01 | Phase 1 | Pending |
| LIB-02 | Phase 1 | Pending |
| LIB-03 | Phase 5 | Pending |
| LIB-04 | Phase 5 | Pending |
| LIB-05 | Phase 5 | Pending |
| LIB-06 | Phase 1 | Pending |
| LIB-07 | Phase 5 | Pending |
| LIB-08 | Phase 1 | Pending |
| LIB-09 | Phase 1 | Pending |
| LIB-10 | Phase 1 | Pending |
| LIB-11 | Phase 5 | Pending |
| LIB-12 | Phase 6 | Pending |
| SRCH-01 | Phase 2 | Pending |
| SRCH-02 | Phase 2 | Pending |
| SRCH-03 | Phase 2 | Pending |
| SRCH-04 | Phase 2 | Pending |
| SRCH-05 | Phase 2 | Pending |
| ADD-01 | Phase 4 | Pending |
| ADD-02 | Phase 1 | Pending |
| ADD-03 | Phase 2 | Pending |
| ADD-04 | Phase 4 | Pending |
| ADD-05 | Phase 4 | Pending |
| COVR-01 | Phase 4 | Pending |
| COVR-02 | Phase 4 | Pending |
| COVR-03 | Phase 4 | Pending |
| IMP-01 | Phase 3 | Pending |
| IMP-02 | Phase 3 | Pending |
| IMP-03 | Phase 3 | Pending |
| IMP-04 | Phase 3 | Pending |
| IMP-05 | Phase 3 | Pending |
| IMP-06 | Phase 3 | Pending |
| IMP-07 | Phase 3 | Pending |
| IMP-08 | Phase 3 | Pending |
| IMP-09 | Phase 4 | Pending |
| READ-01 | Phase 5 | Pending |
| READ-02 | Phase 5 | Pending |
| READ-03 | Phase 5 | Pending |
| READ-04 | Phase 1 | Pending |
| WISH-01 | Phase 6 | Pending |
| WISH-02 | Phase 6 | Pending |
| WISH-03 | Phase 6 | Pending |
| WISH-04 | Phase 6 | Pending |
| SER-01 | Phase 6 | Pending |
| SER-02 | Phase 6 | Pending |
| SER-03 | Phase 6 | Pending |
| STAT-01 | Phase 5 | Pending |
| STAT-02 | Phase 5 | Pending |
| STAT-03 | Phase 5 | Pending |
| STAT-04 | Phase 5 | Pending |
| EXP-01 | Phase 7 | Pending |
| EXP-02 | Phase 7 | Pending |
| UI-01 | Phase 1 | Pending |
| UI-02 | Phase 1 | Pending |
| UI-03 | Phase 1 | Pending |
| OPS-01 | Phase 7 | Pending |
| OPS-02 | Phase 7 | Pending |
| OPS-03 | Phase 7 | Pending |

**Coverage:**

- v1 requirements: 64 total
- Mapped to phases: 64
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-25*
*Last updated: 2026-09-25 after sketches 001–003 (added LIB-10, LIB-11, LIB-12, ADD-05; LIB-01 gains edition title)*
