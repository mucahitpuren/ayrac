---
sketch: 003
name: copy-detail
question: "How does a single copy's page look, and how are the other copies of the same work shown there?"
winner: "A (cover-tinted hero + reading & note cards + sibling copy cards)"
tags: [detail, copies, color, reading]
---

# Sketch 003: Copy Detail

## Design Question
The display unit is the physical copy (decided in sketch 001). What does one copy's detail page look like, and how does it show the other copies of the same work? Does a cover-tinted colour feel right in the warm theme?

## How to View
open .planning/sketches/003-copy-detail/index.html
(or http://localhost:5510/003-copy-detail/). The toolbar switches the sample work (1984 ×2, Nutuk ×3, Şeker Portakalı ×2), light/dark mode and desktop/phone.

## Variants
- **A: Cover-tinted hero + copy cards**: Spotify/Apple Music style. The hero takes the cover's colour, with a big cover, white title and pills. Below it are the Okuma and Not cards side by side, then "Bu eserin nüshaların" cards, with the current copy highlighted and an "add copy" card.
- **B: Sticky cover + copy switcher + tabs**: a product-page pattern. The large cover on the left has small thumbnails of the other copies under it, like a colour/variant picker. On the right: title, actions, then Okuma / Not / Bilgiler tabs. Closest to shadcn (Tabs + Card).
- **C: Editorial colophon**: centred cover, title and pills, with no tint. A "Künye" definition list sits beside the reading card, followed by the note, then the other copies.

All variants: reading status (4 states), a 1–5 star rating (click again to clear), a finish date when status is "Okudum", an editable note with a save state, edit / change cover, delete with a confirmation modal (it warns when it's the last copy of the work), and navigation between copies.

## What to Look For
- Is it obvious that this page is **one copy**, and that other copies exist? (kicker "Bu eserden N nüshan var" + the siblings list)
- Switching between copies: cards (A/C) vs thumbnail switcher (B)
- Cover tint (A) in the warm theme, light and dark: does it enrich the page or fight the palette?
- Nutuk's third copy has its own edition title ("Gençler İçin Fotoğraflarla Nutuk") under the work "Nutuk". Does the byline make that clear?

## Findings During Build
- A copy can carry its own edition title that differs from the work title (the Nutuk photo edition). The copy data model needs an optional `edition_title`.
- White text over the cover tint needs a darkening gradient toward the bottom, otherwise contrast fails when it fades into the cream background.
