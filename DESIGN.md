# DESIGN.md: Creative Technology, A Field Guide

The visual design system for the site. `CLAUDE.md` covers what the product does; this file covers how it looks and feels. When they seem to conflict, ask.

## Design direction

**Concept: "a field guide as a technical specimen sheet."** It should read like an annotated research document about the field: part editorial index, part lab instrument. It should not look like a SaaS dashboard. Visual references are in Figma (file "Creative Tech — resource by region", frame "Visual References"), in three groups. Use them for mood and principles only. Do not copy any specific site, logo or layout.

### Figma links (open with the Figma MCP server when connected)
- All visual references: https://www.figma.com/design/hAdTIdpD27KgvAZiq6CQpz/Creative-Tech--resource-by-region?node-id=15-121
  - "visual direction" group (specimen/HUD, and the source of the three view modes): node `15:119`
  - "knowledge publication" group: node `15:120`
  - "bento box" group: node `15:118`
- Type examples: wordmark node `12:26`, tagline node `11:6`, navigation node `15:76`

## The three reference groups, and where each one is used
1. **Knowledge publication (the base, about 70% of the UI).** Every list and browse page.
   - **Index tables** for time-based items (open calls, events, jobs, programme deadlines): the thumbnail (or palette letter block) first, then the title with small tag chips, a one-line description and meta, and the date column at the end (`DD.MM` in `numeral` with the year in `micro` beneath it, right-aligned). Undated rows, which are common, get no numeral: just a quiet `micro` "No date yet" in that column, so the missing date never becomes the focal point. Rows are separated by hairline rules. Group rows under large section headings ("Closing this month", "Upcoming", "Past · 2025") with a big year or period label set right-aligned.
   - **Browse page layout:** filters in a narrow sticky column on the left (a "Filters" toggle on phones), the list beside it capped at about 46rem, and the remaining width left as whitespace. Entries never stretch the full page width.
   - **Catalogue grids** on the Studios, Publications & Resources and Tools pages: cards (picture on its type's ground, location, kind, summary, disciplines, eligibility in a place lens) under A–Z headings with the big letter set right-aligned. Headings follow the existing alphabetical sort and never reorder it; sparse neighbouring letters merge into ranges ("A–C") so short lists don't get a heading per card. The list column is wider here (about 64rem) than for index tables.
   - **Which pages use what:** index tables for Open Calls, Jobs, Programmes, Events and the home page's "Closing soon"; catalogue grids for Studios, Publications & Resources and Tools; mixed lists (search, My Layer, review queue, related entries) use the same row as index tables without date grouping. Heading words follow the type: jobs "close" ("No closing date", "Closed"), events "start" ("This week", "On now", "Dates to be announced").
   - **Catalogue rows** for organisations and resources: a category or region label with a short description on the left, then a row of 3–4 cards with an image on a light grey ground, a caption in `micro`, and a small "View" link in `label`. Use this for "Studios in Bengaluru", "Studios in Berlin", "Master's programmes in Europe" and so on.
   - Occasional **large statement typography** on landing and section intros, with small inline icons or pictograms between words.
2. **Visual direction: specimen and HUD (accent, about 20%).** For the home hero, entry detail pages and the map.
   - **Entry detail pages:** the title block, summary, actions and facts table on the left (about 46rem); a sticky specimen panel on the right with the entry's picture and annotation boxes for its date, location, lens eligibility and core disciplines.
   - One central "specimen" (the world map, or a region of it, in the hero; the entry's image on detail pages) with **thin leader lines connecting to small annotation boxes** that hold metadata: location, discipline, deadline, eligibility.
   - Small bracketed labels such as `[ CORE DISCIPLINES ]` in the `micro` text style, local time and coordinates in the corners, tiny barcodes and grid marks, and fine corner ticks on panels.
   - An **exploded or layered diagram** idea for explaining the lenses and layers (the Map at the bottom, My Layer above it) on the homepage.
   - This specimen look is what the three view modes (Document, Monitor, Blueprint) are built from: see Colour below.
3. **Bento box (used sparingly, about 10%).** Only on the **Insights** page and the **My Layer home**: rounded cards in an uneven grid, pill-shaped buttons and toggles, one or two soft gradient or glass image tiles, and big numbers (counts, deadlines this week).

## Typography

Three families, all on Google Fonts. Load them with `next/font/google` (self-hosted, `display: swap`). These are the only fonts on the site: no monospace and no other fallbacks beyond system ones.

| Role | Family | What it's for |
|---|---|---|
| **Display** | **Black Han Sans** (one weight, Regular) | Wordmark, page titles, section headings, big numbers and dates. Always UPPERCASE. |
| **Accent** | **Instrument Serif, Italic only** | A few words of voice: the "A Field Guide" tagline, one phrase inside a headline, pull quotes. Used sparingly. |
| **Text and UI** | **Instrument Sans** (variable: weight 400–700, width 75–100) | Everything else: body, descriptions, navigation, buttons, tags, metadata, annotations. |

Reference usage in Figma: the wordmark "CREATIVE TECHNOLOGY" in Black Han Sans 24px; "A Field Guide" in Instrument Serif Italic 20px; the main nav in bold uppercase 16px with 36px gaps. Ink colour `#1E1E1E`. (The nav in Figma is set in DM Sans Bold. Build it in Instrument Sans 700 instead, to keep to three families.)

### Type scale (desktop → mobile; use `clamp()` between them)

**Display: Black Han Sans, uppercase**

| Token | Size | Line height | Tracking | Use |
|---|---|---|---|---|
| `display-xl` | 160 → 64px | 0.88 | -0.01em | Home hero statement only |
| `display-l` | 96 → 48px | 0.9 | -0.005em | Landing and section intros |
| `display-m` | 56 → 36px | 0.95 | 0 | Page titles ("OPEN CALLS") |
| `heading` | 32 → 26px | 1.0 | 0 | Section headings, catalogue row labels ("STUDIOS IN BERLIN") |
| `wordmark` | 24 → 20px | 1.1 | 0.01em | Logo, card group titles, entry titles in compact cards |
| `numeral` | 40 → 28px | 1.0 | 0 | Index date column (`28.06`), big counts on Insights |

**Accent: Instrument Serif Italic, sentence case**

| Token | Size | Line height | Use |
|---|---|---|---|
| `accent-display` | same token as the headline it sits in, ×1.08 | match | One phrase inside a display headline, e.g. "THE FIELD, *as it stands*" |
| `accent-l` | 36 → 28px | 1.1 | Pull quotes, section intro lines |
| `accent-m` | 20px | 1.2 | Tagline ("A Field Guide"), kickers above titles |

**Text and UI: Instrument Sans**

| Token | Size | Line height | Weight | Case and tracking | Use |
|---|---|---|---|---|---|
| `body-l` | 18px | 1.5 | 400 | sentence | Intros, entry summaries on detail pages |
| `body` | 16px | 1.5 | 400 | sentence | Descriptions, paragraphs |
| `body-s` | 14px | 1.45 | 400 | sentence | Card descriptions, index-row descriptions |
| `nav` | 16px | 1.2 | 700 | UPPERCASE, 0.01em | Main navigation, primary buttons |
| `label` | 13px | 1.2 | 600 | UPPERCASE, 0.04em | Section switcher, filters, column headers, "View" links |
| `tag` | 11px | 1.2 | 600 | UPPERCASE, 0.06em | Tag chips, eligibility badges, location labels |
| `micro` | 10px | 1.3 | 500, width 85 | UPPERCASE, 0.08em | HUD annotations, coordinates, local time, image captions, bracketed labels like `[ CORE DISCIPLINES ]` |

Use tabular numerals (`font-variant-numeric: tabular-nums`) in `micro`, `tag`, and anywhere numbers line up. If Instrument Sans doesn't have tabular figures, fix the width of number boxes instead.

### Rules
- **Black Han Sans has one weight and no italic.** Set `font-synthesis: none` so the browser never fakes bold or italic. Never use it below 20px or for running text. Always uppercase.
- **Instrument Serif appears only in italic, and at most once per screen section:** one phrase of up to about six words. Never in buttons, nav, tags, form fields or data (dates, prices, deadlines). It is the "voice", not decoration.
- **Mixing in one line:** when an italic serif phrase sits inside a Black Han Sans headline, size it about 8% larger (serif italics look smaller) and align baselines. Keep the serif in sentence case even when the headline is uppercase.
- **Instrument Sans carries all information.** Hierarchy within it comes from size, weight, case and tracking, not from colour.
- **The signature contrast** is huge Black Han Sans next to tiny uppercase `micro` labels, with an occasional italic serif phrase as the human note.
- All type uses `--ink`, and secondary text `--ink-muted`, so it follows the active view mode (see Colour). Never hard-code type colours.

### Implementation
- Define the families as CSS variables (`--font-display`, `--font-accent`, `--font-text`) and each token as a utility class or Tailwind preset (`text-display-xl`, `text-accent-m`, `text-micro`, and so on). Components use tokens only, never raw sizes.
- Show every token, the mixing rules and a sample index row, catalogue row and nav bar on `/styleguide` before building pages, with a switch to view the whole page in each of the three view modes.

## Colour: three view modes

The site has **three view modes**, taken from the three versions of the specimen reference in Figma ("Visual References" → "visual direction"). They share the same layout, type and components; only the colour tokens change. All colour in components comes from semantic CSS variables, never hard-coded hex values.

| Token | **Document** (white + black, signal-red accent) | **Monitor** (black + white, chartreuse accent) | **Blueprint** (white + blue, monochrome) |
|---|---|---|---|
| `--bg` | `#FCFCFC` | `#050505` | `#FCFCFC` |
| `--surface` (cards, image grounds) | `#F2F2F0` | `#0F0F0F` | `#EEF3FC` |
| `--ink` (all type) | `#1E1E1E` | `#F2F2F2` | `#3449B2` |
| `--ink-muted` | `#1E1E1E` at 60% | `#F2F2F2` at 60% | `#3449B2` at 65% |
| `--line` (hairlines, rules, grid) | `#DADAD6` | `#262626` | `#D4DCF0` |
| `--accent` (shapes, lines, large type) | `#C8321A` signal red | `#EAFD57` chartreuse | `#3449B2` (same as ink) |
| `--accent-text` (accent used for small text) | `#C8321A` | `#EAFD57` | `#3449B2` |
| `--accent-soft` (secondary HUD lines, inactive states) | `#C8321A` at 15% | `#7A8530` | `#E6EEFB` |
| `--on-accent` (text on solid accent fills) | `#FFFFFF` | `#050505` | `#FCFCFC` |
| `--grid` (faint background grid in specimen areas) | `#1E1E1E` at 4% | `#EAFD57` at 5% | `#3449B2` at 8% |
| `--swatch-1…5` (secondary palette: fills, tiles, map dots, category marks; never small text) | red `#F04A30`, blue `#387EB2`, green `#7FB17E`, mustard `#DCB572`, pink `#DBAAAE` | coral `#D9777C`, sage `#7C9A8F`, pink `#D365A4`, cobalt `#5A78E6`, orange `#D86A48` | all `#3449B2` |
| `--swatch-6`, `--swatch-7` (type colours for Publications & Resources and for Tools only) | violet `#8F6FCF`, teal `#2F9E9A` | sand `#CDB57E`, lavender `#A48FE0` | all `#3449B2` |
| `--on-swatch` (text on palette fills) | `#1E1E1E` | `#050505` | `#FCFCFC` |

All pairs above pass WCAG AA: ink on background is at least 7:1 in every mode, and `--accent-text` on background is at least 4.5:1. In Document mode, solid accent fills are the deeper `#C8321A` with white text; the brighter `#F04A30` is only a swatch (`--swatch-1`), never a ground for small text. The Document palette comes from the "paper squares" reference (Figma node `19:132`), the Monitor palette from the soft gradient-tile reference (node `19:128`).

### How each mode should feel
- **Document** (default): mostly black on white, like a printed field guide. The red accent is rare: active states, urgent deadlines, specimen leader-line dots, the active lens. The paper-square colours (red, blue, green, mustard, pink) appear only as small fills and tiles.
- **Monitor:** a black instrument panel. White type with chartreuse for HUD details: annotation boxes, leader lines, bracketed `micro` labels, focus states. Soft coral, sage, pink, cobalt and orange for bento tiles and category fills. A faint chartreuse grid behind specimen areas. Slightly more glow and line work than the other modes, but no neon blur effects.
- **Blueprint:** monochrome blue on white, like a technical drawing. *Everything*, type included, is the one blue. "Accents" become solid blue fills with white type (active pills, urgent deadlines, badges), as in the reference's inverted labels. A visible blue grid in specimen areas.

### Where the palette is used
The five swatches (`--swatch-1…5`) appear throughout the system, always as fills, washes and marks, never as small text. They live in `lib/swatch.ts`.
- **Type colours:** every entry type keeps one swatch site-wide (`TYPE_SWATCH`): open call 1, programme 2, job 3, event 4, organisation 5, publications & resources 6, tools 7 (`entrySwatch` / `sectionSwatch`). Swatches 6 and 7 are only for those two types; disciplines and fallback blocks stay on 1–5. Shown as a small square mark in index rows (under the year), card kickers and catalogue headings, as the image ground, and as map dots.
- **Disciplines and skills:** each gets a stable swatch from its name (`swatchFor`), shown as a small square inside its tag chip.
- **Image grounds and fallbacks:** cut-out images sit on a soft wash of their swatch. Items with no image show a solid swatch block (colour chosen from the title, so lists stay varied) with the first letter, never a grey box.
- **Kind chips:** `tint` tags (residency, masters, full time…) take a soft wash of their type's swatch.
- **HUD:** specimen anchor dots and their annotation boxes share a swatch mark; layers in the exploded diagram are tinted.
- **Hover:** index rows take a faint wash of their type colour; cards draw a 3px rule of it along the top.
- **Bento:** tiles filled with swatch gradients.
- The main `--accent` keeps its jobs: active states, urgency, the lens toggle, focus and the nav underline.

### Images per mode
- Document: images as they are, on `--surface`.
- Monitor: images as they are, at 90% brightness so they don't glare.
- Blueprint: images get a blue duotone (CSS `filter` or an SVG duotone filter mapping shadows to `--ink` and highlights to `--bg`) so the page stays monochrome. Show the original on hover or on the detail page.

### Switching modes
- A **view switch** at the right of the top strip, just before the account links (kept off the left so it never sits above the wordmark): a `micro` "VIEW" label, then a pill-shaped segmented control showing all three modes (Document · Monitor · Blueprint) in `tag` style. Each option has a tiny preview of that mode (its paper, ink and accent), and the current one is filled with ink. Clicking one switches straight to it; arrow keys move between them. (This replaced an earlier "CHANGE VIEW" button that cycled modes, which hid what each mode was.)
- Set `data-theme="paper|night|blueprint"` on `<html>` (internal ids: `paper` = Document, `night` = Monitor; the visible names live in `VIEW_MODE_LABELS` in `lib/theme.ts`). Save the choice in `localStorage` (wrapped in try/catch) and per user once logged in. On a first visit, use Monitor if the system prefers dark, otherwise Document.
- Apply the saved mode with a tiny inline script before first paint, so there is no flash of the wrong mode.
- Transition `background-color` and `color` over 300ms when switching. Respect `prefers-reduced-motion`.
- The map tiles (MapLibre) need a style per mode: a light grey basemap for Document, a dark basemap with chartreuse labels for Monitor, and a white basemap with blue lines for Blueprint.

### The lens and the modes
The lens no longer changes colour (modes now own colour). Show the active lens through the toggle itself (solid `--accent` fill on the active option) and a `micro` label in the top bar, e.g. `LENS — INDIA`.

### Deadline urgency (all modes)
More than 30 days: `--ink`. Under 30 days: `--accent` outline. Under 7 days: solid `--accent` fill with `--on-accent` text.

## Layout and components
- 12-column grid, wide outer margins, generous whitespace between sections but dense rows inside lists.
- Page margins come from `--page-gutter` via the `page-width` utility: 16px on phones, 32px from `sm`, and 6.5% of the window (up to 96px) from `lg`, so smaller laptops keep proportionate margins. Content is capped at 1216px; the section row and search tighten below 1400px so they stay on one line.
- Hairline borders (1px) instead of shadows. Square corners everywhere except bento cards and pills.
- Buttons are pill-shaped (outlined, or solid ink for primary).
- Navigation (as in Figma, with two changes: section links are set at 14px (`nav-s`) so all seven fit on one row beside search from `lg`; search is a fixed field at the end of the row from `xl`, and an icon that opens it in a panel below the row from `lg` to `xl`. Below `lg` (phones and tablets) the header is one row of wordmark, search icon and menu button, with the lens toggle beneath on phones and in that row from `sm`; search and the menu (section links, My Layer, the add button, view switch, account link) slide open under that row, one at a time, and the menu icon turns into a cross. The menu lists sections in two columns from `sm` and three from `md`): the wordmark "CREATIVE TECHNOLOGY" (`wordmark`) with "A Field Guide" (`accent-m`) beside or beneath it; then a nav row in `nav` style with 36px gaps: STUDIOS & COMPANIES · PROGRAMMES · JOBS · OPEN CALLS · PUBLICATIONS & RESOURCES · TOOLS · EVENTS · SEARCH THE WEBSITE. TOOLS is a browse page for resources where `resource_kind = 'tool'`. The **India / Global** lens toggle and the URL drop button sit at the right.
- Tags in `tag` style as small outlined chips. Pill-shaped buttons in `nav` or `label` style.
- Images are cut-out objects or tightly cropped work stills on light grey grounds. Use the entry's OG image or a screenshot, with a caption in `micro`.
- Each card shows a small location label and, in the India lens, an eligibility badge (Based in India / Open to India / Eligibility unclear).

## Motion
- Subtle and precise: leader lines draw in, annotation boxes fade up, and the list rows reveal with a slight stagger. Nothing bouncy. Respect `prefers-reduced-motion`.

## Process
- Build the design tokens (colours, type scale, spacing, borders) and core components (index row, catalogue row, card, tag, pill button, annotation box, lens toggle) first, and show them on a `/styleguide` page before building pages.
- Before styling a page, look at the Figma references (via the Figma MCP server if it's connected) and say which reference group you're applying.
