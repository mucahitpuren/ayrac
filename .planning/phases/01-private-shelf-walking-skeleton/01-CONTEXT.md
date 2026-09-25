# Phase 1: Private Shelf (Walking Skeleton) - Context

**Gathered:** 2026-09-25
**Status:** Ready for planning

<domain>
## Phase Boundary

A user can sign up with email + password, stay signed in across browser restarts, and keep a
private shelf of hand-added books using the work → copies model: add a work with its first copy,
attach further copies to an existing work, edit both, and delete a copy or a whole work after
confirming. Everything runs on a live `*.netlify.app` URL, in Turkish or English, light or dark,
comfortable on a phone and usable on desktop. RLS isolation between accounts is proven by an
automated two-account test.

Not in this phase: search (Phase 2), duplicate warning (Phase 2), import (Phase 3), book API /
covers / genre auto-fill (Phase 4), reading status, shelves, sort/filter (Phase 5), wishlist and
series views (Phase 6), password reset, Google sign-in, custom domain (Phase 7).

</domain>

<decisions>
## Implementation Decisions

> **Precedence note:** `01-UI-SPEC.md` was written before this discussion. Where a decision below
> contradicts it (D-02 format list, D-08/D-09 work picker on the add form), **this file wins**;
> the planner must carry the delta into the affected screens and i18n catalogs.

### Format and genre (controlled vocabularies)
- **D-01:** Copy `format` is a **fixed list**, single choice, not user-extensible. Stored as a stable
  English slug; labels live only in the TR/EN i18n catalogs. — **Reversibility:** one-way — changing
  or removing a slug later needs a data migration of existing copies and of the Phase 3 import mapping.
- **D-02:** One format field (content type and binding are **not** split into two fields). The list
  replaces the one in `01-UI-SPEC.md`:

  | slug | TR | EN |
  |---|---|---|
  | `standard` | Normal Baskı | Standard edition |
  | `graphic_novel` | Grafik Roman | Graphic novel |
  | `hardcover` | Ciltli | Hardcover |
  | `pocket` | Cep Boy | Pocket size |
  | `special_edition` | Özel Baskı | Special edition |
  | `other` | Diğer | Other |

  Rationale: maps 1:1 onto the Excel "Kitap Türü" values the author actually uses (Normal Kitap,
  Grafik Roman, Ciltli Baskı…), which Phase 3 import will map into this list.
- **D-03:** Work `genre` is a **fixed list from day one** (not free text), stored as a slug with TR/EN
  labels in the i18n catalogs. Phase 4's API genre mapping (ADD-05) and Phase 5 genre shelves build
  on this list, so no free-text → list migration is ever needed. — **Reversibility:** one-way — same
  migration cost as D-01. Proposed list (user delegated the contents, may edit later):

  | slug | TR | EN |
  |---|---|---|
  | `novel` | Roman | Novel |
  | `short_stories` | Öykü | Short stories |
  | `poetry` | Şiir | Poetry |
  | `drama` | Tiyatro | Drama |
  | `essay` | Deneme | Essay |
  | `classics` | Klasik | Classics |
  | `science_fiction` | Bilim Kurgu | Science fiction |
  | `fantasy` | Fantastik | Fantasy |
  | `crime` | Polisiye | Crime & mystery |
  | `humor` | Mizah | Humour |
  | `children` | Çocuk & Gençlik | Children & young adult |
  | `biography` | Biyografi & Anı | Biography & memoir |
  | `history` | Tarih | History |
  | `philosophy` | Felsefe | Philosophy |
  | `psychology` | Psikoloji | Psychology |
  | `politics_society` | Siyaset & Toplum | Politics & society |
  | `religion_mythology` | Din & Mitoloji | Religion & mythology |
  | `science` | Bilim | Science |
  | `art` | Sanat | Art |
  | `self_help` | Kişisel Gelişim | Self-help |
  | `travel` | Gezi | Travel |
  | `other` | Diğer | Other |

- **D-04:** `genre` is **nullable in the database** (Phase 3 import rows mostly lack genre and Phase 4
  fills it later), but the manual add/edit form keeps it required as `01-UI-SPEC.md` says, with
  "Diğer / Other" as the escape hatch.

### Authentication
- **D-05:** **Email confirmation is OFF** in Phase 1 on both Supabase projects: sign-up logs the user
  straight in. Turned on in Phase 7 together with custom SMTP (Supabase free-tier email is rate-limited
  to a few messages per hour). No "check your inbox" screen in Phase 1.

### Authors and work identity
- **D-06:** A work's authors are stored as a **list of names** (e.g. `authors text[]`, or a child table
  if the planner prefers — see Claude's Discretion), entered in the form as one comma-separated field
  (as in `01-UI-SPEC.md`), trimmed and de-duplicated on save. Needed so Phase 5's author page and
  top-authors stats count each author separately. — **Reversibility:** costly — switching to a single
  string later loses structure; switching array ↔ join table touches every query.
- **D-07:** A new copy can be attached to an existing work from **two** entry points: the "Yeni nüsha
  ekle" card on the copy/work detail page (as in `01-UI-SPEC.md`) **and** the "Kitap ekle" form (D-08).
- **D-08:** Work picker on the add form = **suggestions under the Title field**. As the user types,
  matching works from their own library appear (e.g. "1984 — George Orwell · 1 nüsha"). Picking one
  locks the work fields (shown read-only with a way to clear the choice) and the form reduces to copy
  fields; submitting then creates only a copy under that work. Not picking anything creates a new work,
  exactly as before. This is the manual precursor of Phase 2's duplicate warning (ADD-03), which should
  later hook into the same spot.
- **D-09:** Picker matching in Phase 1 is **simple**: case-insensitive substring on title (and author)
  using Turkish-locale lowercasing (`toLocaleLowerCase('tr')`), over the already-loaded works list. Full
  Turkish folding (ş→s, ı→i, diacritic-insensitive) is Phase 2's shared normalize module; the picker
  switches to it then.

### Environments and deployment
- **D-10:** **Two hosted Supabase projects**: `dev` (development, test accounts, the two-account isolation
  test) and `prod` (the author's real library). No Docker / local Supabase (Docker is not installed on
  the dev machine). This uses both free-tier project slots. — **Reversibility:** reversible.
- **D-11:** Schema changes live as SQL migration files in the repo (Supabase CLI via `npx supabase`,
  hand-written migrations, `db push` to each project). Nothing is created by clicking in the dashboard
  without a matching migration.
- **D-12:** The two-account RLS isolation test runs against the **dev** project only, never prod.
- **D-13:** Phase 1 ships to a **`*.netlify.app` URL** (e.g. `ayrac.netlify.app`), wired to the prod
  Supabase project. The custom domain comes in Phase 7 (OPS-01).

### Claude's Discretion
- How slugs are enforced in Postgres (CHECK constraint vs enum type vs lookup table), as long as D-01/D-03 hold.
- `authors text[]` vs a `work_authors` child table (both satisfy D-06; child table must carry `user_id` + RLS).
- Password minimum length / rules (Supabase default or stricter, e.g. 8 chars) and their TR/EN error copy.
- Whether Netlify deploy previews point at the dev project; env var naming (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- How the isolation test creates and cleans up its throwaway users on dev (service-role key only in local `.env` / CI secret, never in the client bundle).
- Exact picker UX details (debounce, max suggestions, keyboard navigation), within the sketch/UI-SPEC visual language.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §Phase 1 — goal, success criteria, notes (secrets hygiene gate, complete schema from the start, RLS on every table at creation, denormalized `user_id`, i18n key convention)
- `.planning/REQUIREMENTS.md` — AUTH-01, AUTH-02, AUTH-05, AUTH-07, LIB-01, LIB-02, LIB-06, LIB-08, LIB-09, LIB-10, ADD-02, READ-04, UI-01, UI-02, UI-03
- `.planning/PROJECT.md` — Key Decisions table (work/copy model, copy as display unit, bilingual from v1)

### UI contract and visual direction
- `.planning/phases/01-private-shelf-walking-skeleton/01-UI-SPEC.md` — approved screen, copy, spacing, color, typography and state contract (superseded only where this file says so)
- `.claude/skills/sketch-findings-ayrac/SKILL.md` and its `references/` — locked visual decisions and CSS patterns (load before any UI work)

### Architecture and stack research
- `.planning/research/ARCHITECTURE.md` — work/copy schema sketch, denormalized `user_id` for join-free RLS, anti-patterns (status/note on copies, not works; RLS join pitfalls)
- `.planning/research/STACK.md` and `.claude/CLAUDE.md` — pinned stack versions (Vite 8, React 19, TS 6.0.3, Tailwind v4, shadcn/ui, react-i18next, TanStack Query, react-hook-form + zod, Supabase)
- `.planning/research/PITFALLS.md` — Supabase/RLS/Netlify pitfalls to guard against
- `.planning/research/SUMMARY.md` — research synthesis

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — the repo has no application code yet (no `package.json`). Phase 1 scaffolds the Vite + React + TS app, Tailwind v4, shadcn/ui and Supabase from scratch.
- Sketch HTML/CSS under `.claude/skills/sketch-findings-ayrac/sources/` is throwaway reference for tokens and layout, not code to import.

### Established Patterns
- `.gitignore` already excludes `data/` (holds the author's real `kitaplar.xlsx` — never commit it).
- `.claude/launch.json` only has a static server for sketches; a Vite dev-server entry will be needed.

### Integration Points
- Supabase (dev + prod projects, D-10) via `@supabase/supabase-js` with the anon key only in the client.
- Netlify site build → `*.netlify.app` (D-13); SPA fallback redirect for client-side routes.

</code_context>

<specifics>
## Specific Ideas

- Real test cases for the work/copy model: *1984* (novel + graphic novel) and *Nutuk* ×3, including an
  edition title differing from the work title ("Gençler İçin Fotoğraflarla Nutuk" under "Nutuk").
- Picker suggestion row format: "{title} — {authors} · {n} nüsha" / "{title} — {authors} · {n} cop{y|ies}".

</specifics>

<deferred>
## Deferred Ideas

- Full Turkish-folding match for the add-form work picker — arrives with Phase 2's normalize module (D-09).
- Email confirmation on sign-up — Phase 7 with custom SMTP (D-05).
- User-editable genre list — not planned; revisit only if the fixed list proves too narrow.

</deferred>

---

*Phase: 01-private-shelf-walking-skeleton*
*Context gathered: 2026-09-25*
