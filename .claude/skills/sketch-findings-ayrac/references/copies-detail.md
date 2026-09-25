# Copies & Copy Detail Page

## Design Decisions

**The display unit is the physical copy.** This is a firm user decision. When the user owns several copies of a work (1984 graphic novel + 1984 novel; Nutuk ×3), **each copy is its own book with its own cover** in shelves, the library grid/list and search rows. Never merge them into one tile with "×2", because each copy has its own cover and identity. The data model stays work/copy, and ownership matching plus the search verdict stay **work-level**.
- Tile meta line: `{format} · {publisher}` (e.g. "Grafik roman · Domingo").
- When the work has more than one copy, a small format tag sits on the cover (bottom-right, white pill) so the copies can be told apart at a glance.
- Library counts show both numbers: "52 kitap · 47 farklı eser".
- Format and reading-status filters apply per copy.

**A copy may have its own edition title.** "Gençler İçin Fotoğraflarla Nutuk" is a copy of the work "Nutuk". The detail page shows the edition title as H1, with a muted "Nutuk ·" before the author in the byline.

**Copy detail page (won over sticky cover + thumbnail switcher, and editorial colophon): cover-tinted hero.**
- Breadcrumbs: Kütüphane › {genre} › {work}.
- The hero background takes the **cover's colour**, as a gradient from `tint+12% white` → `tint` → `tint+30% black`. The darkening toward the bottom is required so white text keeps contrast, and the hero ends there rather than fading into cream.
- Hero content: a large cover (260px; 170px on phone), then kicker "Bu eserden N nüshan var" (or "Tek nüsha"), H1 title (Fraunces 44px, white), byline with the author as a link (→ author page), and pills (format · publisher · year · genre) as translucent white chips.
- Below the hero: an action row (Düzenle · Kapağı değiştir · Sil in danger text), then **two cards side by side** (stacked on phone):
  - **Okuma**: a 4-state segmented control (Okuyacağım / Okuyorum / Okudum / Yarım bıraktım, with icons; the active one is filled primary). Then 1–5 stars (clicking the same star again clears it; label "4 / 5" or "Henüz puan yok"). When the status is Okudum, a "Bitirdiğin tarih" date input appears and is auto-filled with today.
  - **Notun**: a textarea with a save state ("Kaydedilmedi…" → "Kaydediliyor…" → "Kaydedildi ✓").
- **"Bu eserin nüshaların"**: a row of cards (small cover + format + publisher · year + status · stars). The current copy gets a primary border + soft ring and a "Şu an bakıyorsun" label. Other cards navigate to that copy. The last card is a dashed **"Yeni nüsha ekle"**, which pre-fills the add-copy flow for this work.
- **Delete** opens a confirmation modal: "Bu nüshayı sil?" with the copy's title, format and publisher. It says how many other copies remain, or warns "Bu, eserin son nüshası; eser de silinir." It also notes that deletion can't be undone. Buttons: Vazgeç / Evet, sil (solid danger).

## CSS Patterns

```css
.hero { position: relative; padding: 34px 0 30px; margin-bottom: 26px; }
.hero::before { content: ''; position: absolute; inset: 0; z-index: 0;
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--tint) 88%, white) 0%,
    var(--tint) 45%,
    color-mix(in srgb, var(--tint) 70%, black) 100%); }
.hero .inner { position: relative; z-index: 1; display: flex; gap: 40px; align-items: flex-end; }
.hero .txt { color: #fff; text-shadow: 0 1px 12px rgba(0,0,0,.25); }
.hero .pill { background: rgba(255,255,255,.18); color: #fff; backdrop-filter: blur(6px); }

.status-seg button.on { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-bg); }
.sib.current { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-soft); }
.sib.add { border-style: dashed; }
```
`--tint` comes from the cover image. In the app, extract the dominant colour (e.g. `fast-average-color` or a canvas sample) when the cover is saved, store it on the copy, and fall back to `--color-primary` when there's no cover.

## HTML Structures

```html
<div class="hero" style="--tint: hsl(8 48% 38%)">
  <nav class="crumbs">Kütüphane › Distopya › 1984</nav>
  <div class="inner">
    <img class="cover xl" …>
    <div class="txt">
      <div class="kicker"><i class="ph ph-books"></i>Bu eserden 2 nüshan var</div>
      <h1 class="title display">1984</h1>
      <div class="byline"><a>George Orwell</a></div>
      <div class="pills">Grafik roman · Domingo · 2021 · Distopya</div>
    </div>
  </div>
</div>
<div class="actions">Düzenle · Kapağı değiştir · Sil</div>
<div class="grid-2"><section class="card">Okuma…</section><section class="card">Notun…</section></div>
<section class="siblings"><h2>Bu eserin nüshaların</h2>…cards… <div class="sib add">Yeni nüsha ekle</div></section>
```

## What to Avoid
- **"×2" copy-count badges on one shared cover.** The user rejected this explicitly.
- **Tint gradients that fade to the cream background behind white text.** They fail contrast (found during the build).
- **Thumbnail-only copy switching (003-B).** It's compact, but hides each copy's status and publisher.
- **No-colour editorial layout (003-C).** It's calm but too plain. The cover tint gives each book its own identity.

## Origin
Synthesized from sketches: 001 (round 3: copy-level display), 003
Source files available in: sources/001-home-search/, sources/003-copy-detail/
