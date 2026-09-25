---
name: sketch-findings-ayrac
description: Validated design decisions, CSS patterns, and visual direction from sketch experiments. Auto-loaded during UI implementation on ayrac.
---

<context>
## Project: ayrac

Ayraç is an open-source, multi-user web app for cataloguing the books you own. Its core question is "do I already own this book?".

The frame is calm and the covers are the showcase. The interface should feel quiet and unhurried, with generous whitespace and soft warm tones, so the library reads like a curated shelf the user is proud of. Layout discipline comes from Apple Books (clean grid, covers resting like real books with subtle shadows), and the accent approach from Spotify/Apple Music (big artwork, cover-derived colour). The primary action must be answerable in seconds.

Reference points: Apple Books, Spotify / Apple Music. Target stack: React + Tailwind v4 + shadcn/ui, Phosphor icons.

Sketch sessions wrapped: 2026-09-25
</context>

<design_direction>
## Overall Direction

- **Viewport:** Desktop-first presentation, one responsive web app. The phone layout is designed deliberately, not just scaled down.
- **Palette:** "Sıcak kütüphane": warm paper (`#f4efe6` bg), terracotta primary (`#8a4b2a`), brass accent. Dark mode is warm brown-black (`#1d1914`), never neutral grey.
- **Typography:** Fraunces 600 for display (brand, titles, shelf and cover titles) + DM Sans for UI/body, both from Google Fonts with latin-ext. Set `<html lang>` from the active locale, or Turkish uppercase breaks.
- **Icons:** Phosphor, regular weight (`@phosphor-icons/react`).
- **Layout:**
  - Sticky translucent top bar with a wide centred search (`/`).
  - Home is shelves: last 6 added → one per series (ordered, with gaps shown) → one per genre.
  - The header "Kütüphane" opens the full sortable/filterable grid ⇄ list.
- **Units:** Every physical copy is its own tile with its own cover, never "×2". Matching and the "Bende var mı?" verdict are work-level.
- **Search:** Always leads with a verdict card: Evet / Emin değilim / Hayır. A near-match never says "Hayır".
- **Copy page:**
  - Cover-tinted hero with a gradient that darkens toward the bottom so white text keeps contrast.
  - Okuma and Not cards (4-state status, 1–5 stars, finish date, note save state).
  - Sibling copy cards plus a dashed "Yeni nüsha ekle".
  - Delete has a confirmation modal.
- **Shapes:** Covers have a 2px radius (book-like), cards 14px and controls 8px. Interactions have a 0.15s ease, and cover tiles lift 4px on hover.
</design_direction>

<findings_index>
## Design Areas

| Area | Reference | Key Decision |
|------|-----------|--------------|
| Layout & Navigation | references/layout-navigation.md | Top-bar search; home = shelves (recent 6 → series → genres); "Kütüphane" = full sortable/filterable library |
| Search & Verdict | references/search-verdict.md | Verdict card Evet / Emin değilim / Hayır; Turkish `fold()`; near-match never "Hayır" |
| Color, Typography & Icons | references/color-typography-icons.md | Warm paper palette (light + dark), Fraunces + DM Sans, Phosphor regular, `lang`-aware uppercase |
| Copies & Copy Detail | references/copies-detail.md | One tile per copy; cover-tinted copy page with reading/note cards and sibling copies |

## Theme

The winning theme file is at `sources/themes/default.css` (identical to `sources/themes/warm.css`). Light tokens are on `:root`, dark on `:root[data-mode="dark"]`.

## Source Files

Original sketch HTML files are preserved in `sources/` for complete reference. Open them via a static server so `../themes/*.css` resolves. Winning tabs are marked "★ Seçildi".
</findings_index>

<metadata>
## Processed Sketches

- 001-home-search
- 002-theme-typography
- 003-copy-detail
</metadata>
