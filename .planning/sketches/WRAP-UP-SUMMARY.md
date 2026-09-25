# Sketch Wrap-Up Summary

**Date:** 2026-09-25
**Sketches processed:** 3
**Design areas:** Layout & Navigation, Search & Verdict, Color/Typography/Icons, Copies & Copy Detail
**Skill output:** `./.claude/skills/sketch-findings-ayrac/`

## Included Sketches
| # | Name | Winner | Design Area |
|---|------|--------|-------------|
| 001 | home-search | Synthesis: A top-bar search + home shelves + full library, one tile per copy, verdict card | Layout & Navigation; Search & Verdict; Copies |
| 002 | theme-typography | A2: warm paper (light + dark) + Fraunces / DM Sans + Phosphor regular | Color, Typography & Icons |
| 003 | copy-detail | A: cover-tinted hero, reading + note cards, sibling copy cards | Copies & Copy Detail |

## Excluded Sketches
| # | Name | Reason |
|---|------|--------|
| — | — | None excluded |

## Design Direction
A calm, warm home-library frame that lets covers be the showcase, presented desktop-first as one responsive web app. The "do I already own this?" question is answered by an explicit verdict card on top of search results.

## Key Decisions
- **Layout:**
  - Sticky top bar with centred search (`/`).
  - Home = shelves: last 6 added → series (ordered, gaps as ghosts) → genres.
  - "Kütüphane" = full library with sort (added/title/author), filters (genre/format/status) and a grid/list toggle.
- **Display unit:** The physical copy, with its own cover and "format · publisher". Never merged into "×2". Matching and the verdict stay work-level.
- **Search:** Evet / Emin değilim / Hayır. A near-match never shows "Hayır". Turkish-aware `fold()` is shared across search, import and duplicate warnings.
- **Palette:** Warm paper `#f4efe6`, terracotta `#8a4b2a`, brass `#b08a3e`. Warm dark mode `#1d1914`.
- **Typography:** Fraunces 600 display + DM Sans body (Google Fonts, latin-ext). `<html lang>` follows the locale.
- **Icons:** Phosphor regular.
- **Copy page:**
  - Hero tinted by the cover colour, with a darkening gradient for contrast.
  - Okuma card (4 states, stars, finish date) and Not card.
  - Sibling copies plus "Yeni nüsha ekle".
  - Delete confirmation warns when it's the last copy.

## Requirements Surfaced
LIB-01 gained an edition title, and the sketches added LIB-10 (one tile per copy), LIB-11 (home shelves), LIB-12 (series shelves) and ADD-05 (genre from the API). See REQUIREMENTS.md, now 64/64 mapped.

## Open Items
- The user mentioned "small bugs" in sketch 001 that weren't itemised. Capture them in UI-SPEC review.
- How book-API categories map to the Turkish genre list is decided in Phase 4.
- Icon weight defaulted to regular (user didn't choose). Revisit in UI-SPEC if desired.
