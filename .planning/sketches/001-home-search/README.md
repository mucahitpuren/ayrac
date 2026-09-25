---
sketch: 001
name: home-search
question: "Where does 'do I own this?' search live on a phone, and how is the answer shown?"
winner: "Synthesis (A + shelves + full library, copy-level display)"
tags: [layout, search, core-value]
---

# Sketch 001: Home Search

## Design Question
Where should the "do I already own this?" search live on the phone home screen, and how clearly should the answer be shown?

## How to View
open .planning/sketches/001-home-search/index.html
(or run the `sketches` preview server: http://localhost:5510/001-home-search/)

## Variants
Desktop is the default view (user preference). Each variant also has a designed phone layout via container queries; use the 🖥 / 📱 toolbar buttons to switch.

- **A: Top-bar search + cover grid**
  - Desktop: a classic web app bar with the brand, a wide centred search (`/` focuses it), nav links and an avatar, over an auto-fill cover grid.
  - Phone: the search wraps to its own row.
  - Results: two-column rows with an "✓ own N copies" badge. Closest to shadcn defaults.
- **B: Centred "Bende var mı?" hero + explicit verdict**
  - Desktop: question-first, Google/Spotify-search style, with a big pill search centred on the page. When idle it shows carousels of recent additions and a series.
  - Typing collapses the hero and shows a verdict card (Yes / Maybe / No) above the results.
- **C: Sidebar + command palette (Ctrl+K)**
  - Desktop: a Spotify-desktop-style left sidebar (library, wishlist, series, stats, import). Search is a keyboard-first command palette with the verdict card (Ctrl+K or `/`, Esc closes).
  - Phone: the sidebar disappears, a bottom-docked search and tab bar appear, and the palette becomes a bottom sheet.

## What to Look For
- One-handed reach on a phone: top (A/B) vs bottom (C)
- Is the answer unmistakable? Badge only (A) vs explicit verdict (B/C)
- The three answer states: **Yes** (e.g. "1984"), **Maybe** (typo, e.g. "fahrenhayt"), **No** (e.g. "sapiens", with a wishlist CTA)
- Turkish folding: "seker portakali", "irmina" and "kulta" should all match

## Findings During Build
- A near-match must never produce "No, you don't own it". The "Maybe" verdict exists so a typo can't lead to a duplicate purchase.

## Synthesis (round 2)
The user picked **A** as the base and asked for:
- **Synthesis: A + shelves + full library** (new tab)
  - **Home = shelves.** First a fixed-size (6) "Son aldığın kitaplar" shelf. Then one shelf per series (in position order, with missing volumes shown as striped "#N eksik" ghosts). Then one shelf per genre (largest first), each with "Tümünü gör →".
  - **Header "Kütüphane" = the full library.** Every book, sortable (last added / title / author) and filterable (genre / format / reading status), in a grid or list view.
  - **Search keeps A's placement** (top-bar, `/`), and results use B's verdict card (Yes / Maybe / No).
  - **Shelf style toggle**: horizontal scroll (Spotify) vs single-row grid (Apple Books).

### New requirement surfaced
Genre must be fetched automatically from the book API (Google Books `categories`, Open Library `subjects`). The user's Excel mostly lacks genre, and the genre shelves depend on it.

## Round 3: display unit = copy
User decision: when several copies of a work are owned (1984 novel + graphic novel), each copy is shown as a **separate book with its own cover**, never merged into one tile with "×2".
- Shelves and the library grid/list are built from copies ("52 kitap · 47 farklı eser"). Each tile shows format · publisher, and a format tag appears when the work has several copies.
- Search: the verdict stays **work-level** ("Evet, sende var: 1 eser, 2 nüsha"). Below it there's a small "bu eserden 2 nüshan var" group header, then one row per copy, each with its own cover.
- Filters (format, reading status) apply per copy.
