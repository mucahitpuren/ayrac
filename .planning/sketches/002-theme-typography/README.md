---
sketch: 002
name: theme-typography
question: "Which surface + type pairing makes covers feel like a calm showcase?"
winner: "A2 (warm palette + Fraunces 600 display + DM Sans body, Phosphor regular icons)"
tags: [theme, palette, typography, dark-mode]
---

# Sketch 002: Theme + Typography

## Design Question
Which colour palette and Google Fonts pairing make the library feel calm and proud? The frame should be quiet so the covers become the showcase. This sketch combines theme and typography at the user's request.

## How to View
open .planning/sketches/002-theme-typography/index.html
(or the `sketches` preview server: http://localhost:5510/002-theme-typography/). Fonts load from Google Fonts, so an internet connection is needed.

## Variants
Each variant has light **and** dark modes (UI-02), toggled with the in-app ☾ button or the toolbar.
- **A: Sıcak kütüphane** (`themes/warm.css`): warm cream paper, terracotta accent. Fraunces for display, Source Sans 3 for body.
- **B: Gece vitrini** (`themes/night.css`): Spotify-style deep dark, where covers glow and there's a mint accent. Plus Jakarta Sans throughout, with 800-weight display.
- **C: Sakin galeri** (`themes/calm.css`): Apple Books-style neutral light, forest-green accent. Newsreader for display, Inter for body.

## What to Look For
- Do the covers pop, or does the frame compete with them?
- Heading personality: warm serif (A) vs bold geometric sans (B) vs editorial serif (C)
- The dark mode of each: which one would you actually open at night?
- The Turkish type test at the bottom: ş ğ ı İ glyphs, and `text-transform: uppercase` with `lang="tr"` must render "İSTANBUL · IŞIK · ÇİĞDEM"
- The verdict card in each theme (type "1984" or "sapiens" into search)

## Findings During Build
- The Turkish uppercase test passes in all three variants because the `lang="tr"` attribute drives CSS `text-transform`, so the app must set `<html lang>` from the active locale (TR/EN).
- All three font pairs ship the latin-ext subset on Google Fonts, so Turkish glyphs render natively.

## Round 2: refine A
The user picked **A: Sıcak kütüphane** (warm palette + Fraunces display), asked to replace the body sans, and chose **Phosphor Icons**.
- Tabs now compare only the body font; display stays Fraunces 600:
  - **A1**: Figtree (friendly, round, very legible)
  - **A2**: DM Sans (soft geometric)
  - **A3**: Instrument Sans (crisp, strong contrast with Fraunces)
  - **A (önceki)**: Source Sans 3, kept for reference
- Phosphor icons are now used across the nav, search, shelf kinds, "Tümünü gör", buttons, chip, verdict and the mode/language toggles. The toolbar switches weight (regular / light / thin / bold / fill / duotone). In the app, use `@phosphor-icons/react`.
