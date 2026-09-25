# Color, Typography & Icons

## Design Decisions

**Theme: "Sıcak kütüphane" (warm paper).** It won over "Gece vitrini" (Spotify-dark, Plus Jakarta Sans) and "Sakin galeri" (neutral light, Newsreader + Inter). The feel is calm and unhurried, like a reading nook, and the frame stays quiet so covers are the showcase. Light and dark modes are both required (UI-02), and dark is a warm brown-black, not neutral grey.

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | `#f4efe6` | `#1d1914` |
| `--color-surface` | `#fbf8f2` | `#26211b` |
| `--color-surface-2` | `#ece5d8` | `#312a22` |
| `--color-border` | `#e0d7c6` | `#3b3329` |
| `--color-text` | `#2b2620` | `#f1e9dc` |
| `--color-text-muted` | `#7a7064` | `#a89c8b` |
| `--color-primary` (terracotta) | `#8a4b2a` | `#e0a57f` |
| `--color-primary-hover` | `#723d21` | `#ebb896` |
| `--color-primary-soft` | `#f0e2d6` | `#3a2a20` |
| `--color-accent` (brass) | `#b08a3e` | `#d6b36a` |
| `--color-success` | `#4d7c4a` | `#9cc58f` |
| `--color-success-soft` | `#e4ecd9` | `#26331f` |
| `--shadow-cover` | `0 1px 1px rgba(60,40,20,.10), 0 6px 14px rgba(60,40,20,.18)` | `0 1px 1px rgba(0,0,0,.4), 0 8px 18px rgba(0,0,0,.5)` |

Shapes: `--radius-md: 8px`, `--radius-lg: 14px`, `--radius-cover: 2px` (covers are almost square-cornered, like real books). Primary buttons use `color: var(--color-bg)` on `--color-primary`, which works in both modes.

**Typography (Google Fonts, latin-ext for Turkish):**
- Display: **Fraunces** 600, letter-spacing −0.01em. Used for brand, page titles, shelf titles, cover titles and verdict titles.
- Body/UI: **DM Sans** 400/500/600/700 (opsz 9..40). Chosen over Figtree, Instrument Sans and Source Sans 3 (the original).
- Scale used: greeting 34px · page/detail title 44px · shelf title 22px · body 15–16px · meta 12–13px · kind labels 11px uppercase +0.08em.
- Load: `family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap`. In the app, consider `@fontsource-variable/fraunces` + `@fontsource-variable/dm-sans` to self-host, or keep Google Fonts.

**Turkish rule:** CSS `text-transform: uppercase` is only correct with `lang="tr"` ("kitaplık" → "KİTAPLIK", not "KITAPLIK"). The app must set `<html lang>` from the active i18n locale (TR/EN), and update it whenever the language switches.

**Icons: Phosphor, regular weight** (user preference). In the app, use `@phosphor-icons/react`. Mapping used in the sketches:
| Use | Icon |
|---|---|
| search | `MagnifyingGlass` |
| nav: home / library / wishlist / stats | `House` / `Books` / `Heart` / `ChartPieSlice` |
| theme toggle | `Moon` ↔ `Sun` |
| language | `Translate` |
| shelf kinds: recent / series / genre | `ClockCounterClockwise` / `Stack` / `Tag` |
| see all | `ArrowRight` |
| verdict yes / no | `Check` / `X` |
| add / wishlist | `Plus` / `Heart` |
| reading status: to-read / reading / read / abandoned | `BookmarkSimple` / `BookOpen` / `CheckCircle` / `PauseCircle` |
| rating | `Star` (fill weight when active) |
| note / edit / cover / delete | `NotePencil` / `PencilSimple` / `Image` / `Trash` |
| facts: format / publisher / year | `Book` / `Buildings` / `CalendarBlank` |

## CSS Patterns

```css
:root { --font-display: 'Fraunces', Georgia, serif; --font-sans: 'DM Sans', system-ui, sans-serif;
        --display-weight: 600; --display-tracking: -0.01em; }
.display { font-family: var(--font-display); font-weight: var(--display-weight); letter-spacing: var(--display-tracking); }
:root[data-mode="dark"] { /* dark tokens from the table */ }
```
In Tailwind v4, map these to `@theme` tokens and use `.dark` / `data-mode` for the dark variant with shadcn's CSS variables.

## What to Avoid
- **Neutral grey dark mode.** It fights the warm palette. Keep dark warm (brown-black).
- **Source Sans 3 as body.** It felt too plain beside Fraunces, and was replaced by DM Sans.
- **Emoji or unicode glyphs as icons** (☾ ♡ ＋ ✓ in early sketches). Use Phosphor everywhere.
- **Fonts without latin-ext.** Every font must render ş ğ ı İ natively. Test with "Gölgelerin Hükümdarı", "Şafak Katilleri", "İrmina", "Pijamalı hasta yağız şoföre çabucak güvendi".
- **System font stacks for display.** Iowan/Palatino/Georgia looked different on each OS.

## Origin
Synthesized from sketches: 002 (rounds 1–2)
Source files available in: sources/002-theme-typography/, sources/themes/warm.css (= default.css)
