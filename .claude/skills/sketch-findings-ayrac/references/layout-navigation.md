# Layout & Navigation

## Design Decisions

**Desktop-first presentation, one responsive app.** The user evaluates desktop first, but phone must be *designed*, not just scaled. The breakpoint in sketches is a container query at 600px (`@container app (max-width: 600px)`). In the app, use Tailwind responsive variants (`md:` ≈ 768px) or container queries.

**Top app bar (won over centred hero search and sidebar + command palette):**
- Sticky, translucent (`bg` at 88% + `backdrop-filter: blur(12px)`), 1px bottom border.
- Left to right: brand "Ayraç" (Fraunces display, ~26px), a **wide centred search** (flex:1, max-width ~560px, 44px tall, `/` shortcut hint as a `<kbd>`), nav links (Ana sayfa · Kütüphane · İstek listesi · İstatistik, each with a Phosphor icon), language and theme icon buttons, avatar.
- Content max-width 1240px, horizontal padding 32px (20px on phone).
- On phone: brand + avatar on row 1, and the search wraps to its own full-width row (`order: 3; flex-basis: 100%`). Nav links are hidden (they move to a menu/tab bar, decided in UI-SPEC).

**Home = shelves, not a flat grid:**
1. Greeting ("İyi akşamlar, {ad}", Fraunces ~34px) + a muted summary line ("Rafında 91 kitap var (86 farklı eser) · 4 seri · 8 tür").
2. **"Son aldığın kitaplar"**: a fixed count of **6** most recently added *copies*.
3. **One shelf per series**: books in position order, with a position badge (#1, #1–3 for omnibus). Missing volumes appear as striped ghost tiles "#N eksik". The header shows "12 cilt · tamam ✓" or "N eksik".
4. **One shelf per genre**: largest first, only genres with ≥2 books.
- Every shelf header = kind label (uppercase 11px + icon: clock-counter-clockwise / stack / tag) + title (Fraunces ~22px) + count + right-aligned "Tümünü gör →" (primary colour). For genres, "see all" opens the library filtered to that genre.
- Shelf style: a horizontal scroll row (Spotify-like, tile width 132px desktop / 104px phone, gap 20px). A single-row grid was offered as an alternative. Default to **scroll** unless UI-SPEC says otherwise.

**Header "Kütüphane" = full library page:**
- Title "Tüm kütüphanem" + count "52 kitap · 47 farklı eser" (or "6 / 47 kitap" when filtered).
- A toolbar card with: Sırala (Son eklenen / Başlık A→Z / Yazar A→Z, using `localeCompare(..., 'tr')` and surname for author), Tür / Format / Durum selects, "Filtreleri temizle" (only when filtered), and a grid ⇄ list toggle.
- Grid: `repeat(auto-fill, minmax(132px, 1fr))`, gap 28px/20px. Phone: 3 columns.
- List: a row with a small cover (46px), title, author (+ series #), then columns for genre · format · publisher · status pill. The columns are hidden on phone.

## CSS Patterns

```css
.top { position: sticky; top: 0; z-index: 5;
  background: color-mix(in srgb, var(--color-bg) 88%, transparent);
  backdrop-filter: blur(12px); border-bottom: 1px solid var(--color-border); }
.bar { max-width: 1240px; margin: 0 auto; display: flex; align-items: center; gap: 24px; padding: 14px 32px; }
.bar .search { flex: 1; min-width: 200px; max-width: 560px; margin: 0 auto; height: 44px; }
.nav button { white-space: nowrap; display: inline-flex; gap: 7px; }   /* never wrap "Ana sayfa" */

.shelf { margin-top: 34px; }
.shelf-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px; }
.shelf-head .more { margin-left: auto; }
.shelf-row { display: flex; gap: 20px; overflow-x: auto; padding: 4px 2px 14px; scroll-snap-type: x proximity; }
.shelf-row .tile { width: 132px; flex: none; scroll-snap-align: start; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 28px 20px; }
@container app (max-width: 600px) {
  .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px 14px; }  /* minmax(0,…) prevents long titles blowing up a column */
}

/* series gap placeholder */
.cover.ghost { background: repeating-linear-gradient(135deg, var(--color-surface-2) 0 8px, var(--color-bg) 8px 16px);
  box-shadow: inset 0 0 0 2px var(--color-border); color: var(--color-text-muted); }
```

## HTML Structures

```html
<header class="top"><div class="bar">
  <a class="brand display">Ayraç</a>
  <label class="search"><i class="ph ph-magnifying-glass"></i><input placeholder="Bende var mı? Başlık ya da yazar…"><kbd>/</kbd></label>
  <nav class="nav">…Ana sayfa · Kütüphane · İstek listesi · İstatistik…</nav>
  <button aria-label="Tema"><i class="ph ph-moon"></i></button><button aria-label="Dil"><i class="ph ph-translate"></i></button>
  <div class="avatar">M</div>
</div></header>

<section class="shelf">
  <div class="shelf-head"><span class="kind"><i class="ph ph-stack"></i>Seri</span><h3 class="display">Darren Shan Destanı</h3>
    <span class="count">12 cilt · tamam ✓</span><button class="more">Tümünü gör <i class="ph ph-arrow-right"></i></button></div>
  <div class="shelf-row">…tiles…</div>
</section>
```

## What to Avoid
- **Centred hero search as the home page (001-B).** It's question-first, but it hides the collection. The user wants the library visible on arrival.
- **Sidebar + Ctrl+K palette (001-C).** It's keyboard-first and feels like a tool, not a home library. A bottom-docked search made sense on phone only.
- **A flat full grid as the home page (001-A original).** It moved to the "Kütüphane" page. The home page is curated shelves.
- **A phone frame as the default.** The user asked "this is a web project, why do I see mobile?" Present desktop first.
- **Grid columns with bare `1fr`.** A long title ("Gençler İçin Fotoğraflarla Nutuk") stretches a column. Use `minmax(0, 1fr)` plus line-clamp on cover titles.

## Origin
Synthesized from sketches: 001 (rounds 1–3)
Source files available in: sources/001-home-search/ (tab "Sentez ★ Seçildi")
