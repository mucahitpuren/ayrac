# Sketch Manifest

## Design Direction
Calm frame, showcase covers. The interface itself should feel quiet and unhurried: generous whitespace, soft tones, no visual noise. The book covers do the talking, so the library reads like a curated shelf the user is proud of. Layout discipline comes from Apple Books (clean grid, covers resting like real books with subtle shadows). Accent colour comes from Spotify/Apple Music (big artwork, accents tinted by the cover, dark mode that makes artwork glow). The primary action, "do I already own this?", must be answerable on a phone in seconds, so search placement and the clarity of the answer come first.

**Viewport priority (user decision during sketch 001):** Sketches present the desktop layout first, and the phone layout is secondary. The app is still one responsive web app: desktop and phone must both be designed, not just scaled.

## Reference Points
- Apple Books: shelf grid, cover shadows, calm light/dark surfaces
- Spotify / Apple Music: large artwork, cover-derived accent colours, dark theme
- Target stack: React + Tailwind v4 + shadcn/ui (at least one variant per sketch follows shadcn defaults)

## Real-Data Notes (from data/kitaplar.xlsx)
- 91 rows. Several multi-copy works: 1984 (graphic novel + regular), Nutuk (caricature, hardcover, plus the photo edition "Gençler İçin Fotoğraflarla Nutuk"), Şeker Portakalı, Dönüşüm, Fahrenheit 451
- Display unit is the physical copy (own cover per copy). Matching and verdict stay work-level (decided in sketch 001, round 3)
- Author spelling varies between rows ("Dostoyevski" vs "Fyodor Dostoyevski", "Dr. Irvin Yalom" vs "Irvin Yalom"), so work matching must normalize authors too
- Long series: Darren Shan Saga #1–#12, all owned

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | home-search | Where does "do I own this?" search live on a phone, and how is the answer shown? | ★ Synthesis: A top-bar search + home shelves (recent 6 → series → genres) + full library page, one tile per copy, verdict card | layout, search, core-value |
| 002 | theme-library-grid | Which surface makes covers feel like a showcase: warm paper, deep dark, or neutral shelf? | — | theme, palette, grid |
| 003 | work-detail-copies | How does one work with several copies look, and does cover-tinted colour feel right? | — | detail, copies, color |
