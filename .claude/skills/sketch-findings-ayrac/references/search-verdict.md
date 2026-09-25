# Search & Verdict ("Bende var mı?")

## Design Decisions

**The search answers a question, not just a filter.** Results always start with a **verdict card** (taken from 001-B and kept in the synthesis), followed by result rows.

Three verdict states, all work-level:
| State | When | Look | Copy |
|---|---|---|---|
| **Evet** | ≥1 work matches (title or author) | `--color-success-soft` bg, success text, filled check circle | "Evet, sende var" · "1 eser, toplam 2 nüsha eşleşti" |
| **Emin değilim** | no match, but near-matches exist (typo, subtitle) | accent at 16% mixed into surface, accent "?" circle | "Emin değilim, bunlardan biri mi?" · "'fahrenhayt' birebir eşleşmedi ama çok benzeyen 1 kitabın var. Almadan önce kontrol et." |
| **Hayır** | no match, no near-match | `--color-surface-2` bg, muted ✕ circle | "Hayır, kütüphanende yok" + CTAs **♡ İstek listesine ekle** (primary) and **＋ Kitap ekle** (ghost) |

**Hard rule:** a near-match must **never** show "Hayır". The "Maybe" state exists so a typo can't cause a duplicate purchase. In Maybe, show the near-match books as full result rows (with covers and "✓ Sende var" badges), not just suggestion chips.

**Results are per copy, grouped by work.** Under the verdict, a work with several copies gets a small label "1984 · George Orwell · bu eserden 2 nüshan var", followed by one row per copy, each with its own cover and a badge "✓ Grafik roman · Domingo". Rows use a 2-column results grid on desktop and 1 column on phone.

**Turkish-aware folding** (validated in the sketches; must be the single shared `normalize` used by search, import dedupe and the add-duplicate warning):
```js
function fold(s) {
  return String(s)
    .replace(/İ/g, 'i').replace(/I/g, 'ı')      // before lowercasing!
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
    .replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/[âà]/g, 'a').replace(/[îì]/g, 'i').replace(/[ûù]/g, 'u').replace(/é/g, 'e')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
```
Test words: "seker portakali" → Şeker Portakalı, "irmina" → İrmina, "kulta" → Kültâ, "donusum" → Dönüşüm.

The near-match used in the sketches was Levenshtein ≤ max(2, ⌊len/3⌋) over title/author words, only for queries of 3+ characters, top 3. The real threshold gets tuned in Phase 2 against the real library.

**Author normalization is also needed.** Real data has "Dostoyevski" vs "Fyodor Dostoyevski" and "Dr. Irvin Yalom" vs "Irvin Yalom".

**Highlighting:** matched substrings get `<mark>` styled as primary colour, bold, no background.

## CSS Patterns

```css
.verdict { border-radius: var(--radius-lg); padding: 18px 20px 16px; margin-bottom: 14px; }
.verdict.yes   { background: var(--color-success-soft); color: var(--color-success); }
.verdict.maybe { background: color-mix(in srgb, var(--color-accent) 16%, var(--color-surface)); color: var(--color-text); }
.verdict.no    { background: var(--color-surface-2); color: var(--color-text); }
.verdict .v-head { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; }
.icon-circle { width: 30px; height: 30px; border-radius: 99px; display: grid; place-items: center; }
.results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 4px 16px; }
.badge { font-size: 12px; font-weight: 600; color: var(--color-success); background: var(--color-success-soft); padding: 3px 9px; border-radius: 99px; }
mark { background: none; color: var(--color-primary); font-weight: 700; }
```

## What to Avoid
- **A badge-only answer (001-A original).** It's too subtle for the core value. Always show the verdict card.
- **"Hayır" + "Did you mean…?" together.** This was an actual bug found during the build: the page said "you don't own it" while suggesting a book the user owns.
- **Naive `.toLowerCase()` / `ILIKE`.** "İ" becomes "i̇" (combining dot) and silently breaks matching.
- **Searching only exact ISBN/edition.** Matching is work-level on purpose: a different edition or format must still say "Evet".

## Origin
Synthesized from sketches: 001 (variants B/C verdict, synthesis, round-3 copy rows)
Source files available in: sources/001-home-search/
