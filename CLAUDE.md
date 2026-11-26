# Field Guide: Creative Technology

A directory and research tool for creative technology, experience design and design-technology work worldwide, seen through a **geographic lens** that each user chooses:

- **Global lens:** the field as a whole: studios, programmes, jobs, calls, publications and events anywhere.
- **Place lens (any country or region):** the same catalogue filtered and annotated for that place: things based there, *and* things elsewhere that are open and practical for someone there (eligibility, remote options, visa sponsorship, scholarships for applicants from there). India was the original lens and remains a first-class one.

The lens is a top-level switch in the UI (**Global**, or a country/region picker) that changes the default filters, sorting and visible fields. It is a filter over one catalogue, not separate databases.

The tool has two layers:

1. **The Map (public, shared):** a curated, structured catalogue of organisations, education programmes, jobs, opportunities (open calls), resources/publications and events. Anyone can browse it. Entries are reviewed before going public.
2. **My Layer (private, per user):** the user's own saves, notes, tags, collections and application tracking, sitting on top of the Map. Users can also save private entries that aren't on the Map, and suggest any private entry to the Map.

The core interaction is **drop a URL anywhere → the app fetches metadata → Claude suggests the entry type and tags → the user confirms → it's saved to My Layer** (with an optional "suggest to the Map" toggle).

## Stack

- **Next.js (App Router, TypeScript)**, deployed on Vercel
- **Supabase**: Postgres, Auth (email magic link), Storage (screenshots), Row Level Security
- **Tailwind CSS** for styling, kept minimal and editorial
- **Anthropic API** (Claude) for classification and open-call extraction, always with structured JSON output
- **GitHub Actions** cron jobs for ingestion and link checks
- **MapLibre GL** for the map view (no paid map keys)

Keep dependencies few. Ask before adding a new major library.

## Data model

All tables use `uuid` primary keys and `created_at` / `updated_at` timestamps.

### `entries`: one table for every kind of item

| column | notes |
|---|---|
| `type` | enum: `organisation`, `program`, `job`, `opportunity`, `resource`, `event` |
| `title`, `summary`, `url` | `url` is unique among public entries |
| `favicon_url`, `image_url` | from OG tags; screenshot fallback |
| `visibility` | enum: `public`, `private` |
| `status` | enum: `draft`, `pending_review`, `approved`, `rejected`, `archived` |
| `owner_id` | the user who created it (null for system-ingested entries) |
| `city`, `state`, `country`, `region` | geography; `region` is a continent-level grouping (South Asia, Europe, North America, East Asia, etc.); null `city` with `is_remote` for online/remote items |
| `is_remote` | bool: online programme, remote job, virtual event |
| `lat`, `lng` | for the map view (geocode the city) |
| `disciplines` | `text[]` from the taxonomy below |
| `source` | enum: `manual`, `drop`, `ingest`, `import_arena`, `import_awesome_list` |
| `last_verified_at` | updated by the link checker |
| `data` | `jsonb` holding the type-specific fields below |

Type-specific fields in `data`:
- **organisation:** `org_kind` (studio, company, collective, lab, institution, funder, community_organiser), `size`, `hires_design_technologists` (bool), `careers_url`, `instagram`, `notable_projects[]`
- **program** (education): `program_kind` (Masters, PhD, postgrad_diploma, Bachelors, short_course, summer_school, online_course), `institution_id` (an organisation), `degree_name`, `duration_months`, `mode` (in_person/online/hybrid), `language`, `application_deadlines[]` (each `{round, date, source_text}`), `intake_month`, `scholarships[]` (`{name, url, open_worldwide, eligible_countries[]}`), `portfolio_required`, `admission_requirements` (short text), `notable_alumni_or_faculty[]`, `curriculum_tags[]`
- **job:** `role_title`, `organisation_id`, `seniority` (intern, junior, mid, senior, lead), `employment` (full_time, part_time, contract, freelance), `work_mode` (onsite, hybrid, remote), `remote_regions[]` (where remote applicants may live), `visa_sponsorship` (yes/no/unknown), `posted_at`, `closes_at`, `apply_url`, `skills[]` (e.g. TouchDesigner, Unity, Unreal, p5.js, three.js, Arduino, ML)
- **opportunity** (open calls for work/art, not jobs): `opp_kind` (open_call, commission, residency, grant, fellowship, competition, call_for_papers, festival_submission), `deadline` (date), `deadline_source_text` (the exact sentence the deadline came from), `eligibility_countries[]` (countries, regions or groups such as EU; only when restricted) or `open_worldwide` (bool), `ineligible_countries[]` (explicit exclusions), `fee` (none/amount/unknown), `stipend_or_budget`, `travel_covered` (bool/unknown), `apply_url`, `organisation_id`
- **resource:** `resource_kind` (magazine, journal, book, article, newsletter, podcast, talk, tool, library, archive, community, directory), `author`, `publisher`, `frequency`, `is_free`
- **event:** `event_kind` (festival, conference, exhibition, meetup, workshop, hackathon, degree_show), `start_date`, `end_date`, `recurring` (bool), `venue`, `submission_opportunity_id` (link to its open call, if any)

### Geographic lens rules
Countries and regions are data (`countries`: code, name, region, groups such as EU/Commonwealth; `regions`: name and wider names that include it, such as Asia, APAC, EMEA). A lens is `global` or the slug of a country or region. Relevance is computed at query time for the chosen place (SQL `place_relevance()` for filtering/sorting, `lib/relevance.ts` for badges; keep them in step, `tests/relevance-cases.ts` covers both):
- `based_in`: the entry's country is the lens country (or, for a region lens, is in that region).
- `not_open`: the lens place is in `ineligible_countries` (an explicit exclusion beats everything below).
- `open_to`: at least one holds: `is_remote` and `remote_regions` names the place, its region, a group it belongs to or Worldwide; `open_worldwide = true`; `visa_sponsorship = yes`; `eligibility_countries` names the place/region/group; a scholarship is open worldwide or lists the place.
- `not_open`: otherwise, if `eligibility_countries` is non-empty, or the entry is remote for listed regions only.
- `unknown`: otherwise. Show it with an "eligibility unclear" label rather than hiding it.

In a place lens: hide `not_open` by default (the relevance filter can show them), sort based-in first then open-to and show eligibility badges prominently. In the Global lens, show everything with no place-specific sorting.

**No costs:** do not collect, display, filter on or convert tuition, salaries or other prices in a currency; this information is too hard to source reliably. Free-text open-call `fee` and `stipend_or_budget` stay. The `fx_rates` table and `countries.currency` column are unused leftovers in the database.

### `user_entry_state`: My Layer on top of any entry
`user_id`, `entry_id`, `saved` (bool), `note` (text), `personal_tags` (`text[]`), `application_status` (enum: `none`, `interested`, `applying`, `applied`, `interviewing`, `rejected`, `accepted`), `reminder_at`. This one tracker covers open calls, jobs and programme applications. Unique on (`user_id`, `entry_id`).

### `collections` and `collection_items`
User-owned named lists (like Are.na channels, with no limit). `collections.visibility` is `private` or `shared_link`.

### `ingest_sources`
A watchlist of pages to check: `url`, `kind` (page/rss/search_query), `expected_type` (opportunity/job/program/event), `lens_hint` (a lens slug, e.g. global or india), `last_hash`, `last_checked_at`, `active`.

### `profiles`
`id` (= auth user id), `display_name`, `role` (`user` or `admin`).

### Row Level Security (must be enforced; write tests for it)
- Anyone, logged out included, can read entries with `visibility = 'public' AND status = 'approved'`.
- Users can read and write their own private entries and their own `user_entry_state`, `collections` and `collection_items`.
- Only admins can change an entry's `status` to `approved`, `rejected` or `archived`, and only admins can edit public entries.
- A user "suggesting to the Map" sets their entry to `status = 'pending_review'`; it stays private until an admin approves it, at which point `visibility` becomes `public`.

## Taxonomy (seed values, editable)

**Disciplines:** experience-design, creative-coding, interaction-design, spatial-xr, installation, projection-mapping, ai, sound-music-tech, generative-art, physical-computing, game-design, data-visualisation, service-design, research

**Indian cities to start with:** Bengaluru, Mumbai, New Delhi, Gurugram, Pune, Hyderabad, Chennai, Ahmedabad, Kolkata, Goa, Kochi, Indore, Jaipur

**Global hubs to start with:** London, Berlin, Amsterdam, Rotterdam, Paris, Linz, Barcelona, Copenhagen, Helsinki, New York, Los Angeles, San Francisco, Montreal, Toronto, Tokyo, Seoul, Singapore, Shanghai, Melbourne, Mexico City, São Paulo

Store geography as data, not hardcoded lists: these are just the seed values for filters.

## Features by milestone

Build in this order. Finish and test each milestone before starting the next.

### M1: Foundation
- Supabase schema, migrations, RLS policies, and seed script (reads `seed/*.csv`)
- Auth (magic link) and a profile row on first login
- Lens switch (Global, or any country or region), remembered per user and in the URL
- Browse pages, one per type (Studios & Companies, Programmes, Jobs, Open Calls, Publications & Resources, Events), each with type-specific filters: region/country/city, discipline, remote, `india_relevance`, deadline or date window, and for programmes, `program_kind`; for jobs, seniority, work mode and visa sponsorship
- Full-text search across all types
- Entry detail page

### M2: My Layer and URL drop
- A global drop zone: drag a URL, paste one, or press a keyboard shortcut to open an "add URL" box
- `/api/unfurl`: fetch the page server-side and extract title, description, OG image, favicon and visible text (cap at about 20k characters)
- `/api/classify`: send the unfurled data to Claude and return `{type, title, summary, city, country, is_remote, disciplines[], data{...}, confidence}` as JSON validated with zod, choosing among all six types (a university course page → `program`, a careers listing → `job`). Never invent deadlines, fees or eligibility: use `unknown` when unsure, and always fill the matching `*_source_text` when a deadline is given. If the page lists several items (e.g. a careers page with five roles, or a university page with two programmes), return an array and let the user pick which to save.
- Confirmation sheet: the user edits the suggested fields, then saves to My Layer, with a toggle to "suggest to the Map"
- Duplicate check: if the URL is already on the Map, open that entry instead and save it to My Layer
- Save, note, personal tags, collections, and application status on any entry
- Bookmarklet that opens `/add?url=...`

### M3: Views for understanding the industry
- World map view (MapLibre) of organisations, programmes and events, zooming to the lens place when one is chosen
- One deadline calendar across open calls, programme application rounds and job closing dates, plus subscribable `.ics` feeds (public per type and lens, and personal for saved items)
- Programme comparison: pick 2–4 programmes and compare duration, deadlines, portfolio requirement and scholarships side by side
- Insights page: counts by region/city × discipline, open calls per month, jobs by skill, which organisations hire design technologists, and lens place vs. global comparisons
- Admin review queue: approve, edit or reject pending entries one at a time, with keyboard shortcuts

### M4: Automatic ingestion
- `scripts/ingest.ts`, run weekly by GitHub Actions:
  1. For each active `ingest_source`, fetch politely (respect robots.txt, identify the user agent, at most 1 request a second per domain).
  2. Hash the main text and skip the page if unchanged.
  3. For changed pages, use Claude to extract zero or more items with the schema for that source's expected type (`ingest_sources.expected_type`: opportunity, job, program or event).
  4. Dedupe on `apply_url`, or on organisation + title + deadline.
  - Sources span all lenses: global open-call boards and festival pages, studio careers pages, university admissions pages (deadlines change every cycle), and sources for specific countries and regions (e.g. India).
  5. Insert new items with `status = 'pending_review'`, `source = 'ingest'`.
- `scripts/archive-expired.ts`, run daily: archive open calls and jobs past their deadline; for programmes, mark the passed round and flag the entry for the next cycle's dates instead of archiving
- `scripts/check-links.ts`, run monthly: flag dead URLs and update `last_verified_at`
- Store a short summary and a link to the source. Never copy whole pages.

### M5: Imports and open data
- Import from Are.na via its API (channel slug → entries, source `import_arena`)
- Import the `awesome-creative-technology` list from GitHub
- Nightly export of all approved public entries to `/public/data/entries.json` and `.csv` under CC BY 4.0, plus a public submission form

## Conventions

- Prefer server components; use client components only for interactive parts.
- All Claude API calls live in `lib/ai/`, with prompts in separate files and zod schemas for every response.
- Database access goes through `lib/db/`; never call Supabase directly from UI components.
- Put secrets in `.env.local` and never commit them. Keep `.env.example` up to date.
- Write tests for RLS policies, the classifier's schema validation, and the ingestion dedupe logic.
- Make small commits with clear messages, one feature per branch.
- Ask me before: changing the schema after M1, adding paid services, or deleting data.
