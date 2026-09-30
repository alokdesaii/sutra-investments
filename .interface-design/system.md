# Sutra — Interface System

**Brand:** Sutra ("thread"): markets, threaded to your money. Mark = one thread rising in an S through three beads
(headline → theme → your holding), `--on-accent` on the `--accent` tile (`app/logo.tsx`, favicon `app/icon.svg`). Wordmark: Geist 600, -0.03em.

Personal market overview for Indian investors: benchmarks, a ranked watchlist, and news impact.
Tokens live in `app/globals.css`; this file records the decisions behind them.

## Direction

**Private research terminal.** Calm, precise, quietly alive. The user checks it with coffee or between
meetings: story in ten seconds, detail on demand. Classy, not playful.

- Explain everything in plain language (every section has a title + one-line purpose; every metric has a one-line meaning).
- Colour carries meaning, never decoration.
- Life comes from things that inform (ticker, market status, interactive chart), not ornament.

Rejected along the way (don't reintroduce): pastel-filled cards, rounded "bubbly" corners, sidebar nav for 2 pages,
decorative donut/bar charts that don't answer a question, lime/neon accents.

## Colour

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f4f5f9` | `#08090d` | Canvas (with faint radial `--glow` at top) |
| `--surface` / `--surface-2` | `#fff` / `#f0f2f7` | `#0f1118` / `#161924` | Panels / insets, hover, controls |
| `--line` / `--line-2` | 8% / 15% ink | 7% / 13% white | Hairlines / emphasis borders |
| `--text` / `-2` / `-3` | `#0b0d14` / `#4a5068` / `#7c8198` | `#eceef5` / `#a3a8ba` / `#6b7086` | Primary / supporting / meta |
| `--accent` | `#4b55d8` | `#8e96ff` | Indigo: active tab, focus, selection, score bars. The only brand colour |
| `--up` / `--down` | `#0c8a58` / `#d23a4b` | `#3ddc97` / `#ff6b7a` | Gains and losses **only** |
| `--amber` | `#b86f12` | `#f5b454` | Callouts only (e.g. "today" point on a chart) |

Theme is `html[data-theme]`, set before paint by an inline script in `layout.tsx`, persisted in localStorage.

## Typography

- **Geist** (`--f-sans`) for UI and numbers; tabular numerals on `body`.
- **Instrument Serif italic** (`--f-serif`) only inside page headlines via `<em>` ("Markets, *at a glance*").
- Scale: 11 eyebrow (uppercase, +0.08em) · 12 meta · 14 body · 16 section (`.h2`) · 17 lede · 30 figure · 30–40 hero.
- Hierarchy through weight + colour first: figures 600/`--text`, labels 400/`--text-3`. Negative tracking on large type.

## Depth, shape, spacing

- **Borders only**: 1px `--line` hairlines. No drop shadows (dark panels get a 3% inset top highlight).
- Radius: 4px panels/controls, 3px inner items. Never larger.
- 4px base unit. Page gutter 16px / 32px (lg). Max width 1400px. Sections separated by 48px (`space-y-12`).
- Panel padding 20px; table cells 12px vertical.

## Layout

- Sticky top bar (56px, blurred `--bg`): logo · tabs (underline in `--accent`) · NSE status · theme toggle.
- Page = hero (eyebrow date/count → headline with serif accent → one-sentence summary) → sections.
- Section = `Section` component (`app/section.tsx`): title, one-line purpose, optional action on the right.
- Pages: Overview (`/`), Instruments (`/instruments` hub → `/instruments/[type]` guide → `/instruments/[type]/[slug]` detail; guides in `app/types.ts`, maths in `app/analytics.ts`; whole-market search at `/instruments/all`, any instrument at `/market/[mf|nse]/[code]`, lists in `app/universe.ts`), Investment Recommendations (`/ideas`, rules in `app/horizons.ts`), IPOs (`/ipo`, data + signal rules in `app/ipo.ts`), News impact (`/news`).
- Rule-based screens state their rules up front (goal + numbered principles), show ✓ strengths / ! cautions per item,
  and list excluded items with the reason. Never phrase as personal advice.
- Master–detail: table `xl:col-span-8` + sticky detail `xl:col-span-4`; below xl the detail stacks and row-select scrolls to it.

## Components

- `.panel` / `.panel-head` — surface + hairline; head 14px 20px with bottom rule.
- `.seg` — segmented control, 28px buttons, pressed = surface + `--line-2` ring. Used for filters.
- `.field` — 34px input, `--surface-2` fill, accent border on focus, leading search icon.
- `.btn-ghost` — 32px bordered button for secondary actions/links.
- `.chip` — 22px neutral tag (sectors).
- `.row` — table row: hover `--surface-2`; selected `--accent-soft` + 2px inset accent bar.
- `.link-row` — whole-block link with hover fill (headlines).
- `Spark` — 1.5px trend line, colour by trend (`--up`/`--down`), optional gradient area. Needs a unique `id`.
- `PriceChart` — interactive 52-week chart: crosshair + readout (date, price, change since start); amber dot marks "today".
- Risk meter — three ascending bars in `--text-2`, label beside; tooltip explains the level.
- Sortable headers — `aria-sort`, arrow only on the active column.

## Motion

- `.rise` — 520ms fade-up, `cubic-bezier(0.23,1,0.32,1)`, staggered 45ms via `--i`.
- `.bar-grow` — scaleX from left, 700ms, staggered 40ms.
- `.live-dot` — ping pulse, only when NSE is open. Ticker marquee 60s, pauses on hover.
- Only transform/opacity animate. Everything disabled under `prefers-reduced-motion`.

## Content rules

- Plain labels: "1-year return", "3-year, per year", "Volatility — how much the price typically swings in a year".
- Always show how the score is built (weights from `WEIGHTS` in `data.ts`).
- Every page ends with sources + "For information only, not investment advice."
- Empty/error states say what happened and what to do ("Try clearing the search…", "They'll retry on the next refresh").
