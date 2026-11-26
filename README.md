# Field Guide: Creative Technology

A directory and research tool for creative technology, experience design and design-technology work, seen through a **geographic lens**: Global, or any country or region. See `CLAUDE.md` for the full brief and milestones.

**Status:** M1 done. M2 partly done: add entries from a URL (`/add`, drop/paste a link anywhere, press **N**, or the bookmarklet on `/me`), My Layer (`/me`), save, suggest to the Map, duplicate check, and an admin review queue (`/admin/review`).
Not yet: Claude classification (`/api/classify`, needs `ANTHROPIC_API_KEY`), multi-item pages, notes, personal tags, collections and application tracking.

## Adding entries

1. Sign in, then click **+ Add** (or paste a link anywhere on the site).
2. Fetch details pre-fills the title, summary and image from the page. Pick the type and fill in what you know; leave the rest Unknown.
3. Save. It's private to you. Tick **Suggest to the Map** to send it to the review queue; admins can approve it from the queue or the entry page, which makes it public.
   Admins can also tick **Publish to the Map now** to skip review.
4. If the link is already on the Map, you're offered the existing entry instead.

Some sites block automated fetches (HTTP 403); the form then lets you fill it in by hand.

## Setup

Requires Node 20+ (this machine has Node 22 at `~/.local/node/bin`; run `export PATH=$HOME/.local/node/bin:$PATH` first).

1. `npm install`
2. Create a free project at [supabase.com](https://supabase.com). Copy `.env.example` to `.env.local` and fill in the URL, publishable key and secret key (Project Settings → API).
3. Apply the schema, either:
   - paste `supabase/migrations/20261122000001_init.sql` into the Supabase SQL editor and run it, **or**
   - `npx supabase login && npx supabase link --project-ref <ref> && npm run db:push`
4. In Supabase → Authentication → URL Configuration, add `http://localhost:3000/**` to the redirect URLs (see *Deploying to Vercel* for production).
5. Seed: `npm run seed` (real entries only) or `npm run seed -- --demo` (adds fake, clearly labelled `[Demo]` jobs, calls and programmes with deadlines relative to today, to exercise urgency colours and INR conversion).
6. `npm run dev` and open http://localhost:3000
7. Sign in once with a magic link, then `npm run make-admin -- you@example.com`.

## Deploying to Vercel

1. Import the GitHub repo in Vercel (framework: Next.js, no build settings to change).
2. **Environment variables** (Settings → Environment Variables, for Production and Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `ANTHROPIC_API_KEY` once classification ships
   - Do **not** add `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_DB_URL` (local scripts only), and don't set `NEXT_PUBLIC_SITE_URL` to localhost. Sign-in links use the domain the request came in on.
   - `NEXT_PUBLIC_*` values are baked in at build time: **redeploy** after changing them.
3. **Supabase → Authentication → URL Configuration:**
   - *Site URL*: your production URL, e.g. `https://<app>.vercel.app` (Supabase falls back to this when a redirect isn't allowed, which is how localhost links end up in emails).
   - *Redirect URLs*: `https://<app>.vercel.app/**`, `http://localhost:3000/**`, and for preview deployments `https://*-<vercel-team-slug>.vercel.app/**`.
4. **Supabase → Authentication → Emails:** the built-in mailer only delivers to members of your Supabase organisation and only a few emails an hour. Before inviting other people, add custom SMTP (e.g. Resend or Postmark, both have free tiers).
5. Recommended: in *Authentication → Emails → Magic Link*, change the link to
   `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink">Sign in</a>`.
   `.RedirectTo` is already `https://<the domain you signed in from>/auth/callback?next=…`, and `/auth/callback` accepts `token_hash`. With the default template, a link only works in the same browser that asked for it (PKCE), so opening it in a phone's mail app fails.

## Scripts

| | |
|---|---|
| `npm run dev` / `build` | Next.js |
| `npm test` | unit tests + RLS tests (RLS suite is skipped unless `.env.local` has Supabase keys) |
| `npm run test:rls` | RLS tests only; creates and deletes throwaway users on your project |
| `npm run seed` | load `seed/*.csv` (idempotent, matches on URL) |
| `npm run make-admin -- <email>` | promote a user |
| `npm run typecheck` / `lint` | |

## Layout

- `supabase/migrations/`: schema, RLS policies, triggers (`india_relevance`, `key_date`, approval publishes) and the `browse_entries` search/filter function
- `lib/db/`: all database access; UI never calls Supabase directly
- `lib/`: types, lens rules, filter parsing, dates/urgency, relevance rules
- `app/[section]`: browse pages (`/studios`, `/programmes`, `/jobs`, `/open-calls`, `/resources`, `/events`)
- `app/entry/[id]`, `app/search`, `app/login`, `app/auth/*`
- `seed/`: taxonomy (disciplines, places with coordinates, FX rates) and starter entries; `seed/demo/` is fake data

## Notes

- **Lens** is a slug (`global`, a country such as `india` or `brazil`, or a region such as `europe`) resolved from `?lens=` → cookie → `global`. Switching saves the cookie and `profiles.preferred_lens`, which is restored on sign-in. Countries and regions live in the `countries` / `regions` tables (seeded from `seed/countries.csv` and `seed/regions.csv`).
- **A place lens** hides entries not open to that place (the relevance filter can show them), sorts Based in → Open to → unclear, shows eligibility badges. **Global** shows everything with no badges.
- Relevance is computed at query time by `place_relevance()` in SQL (for filtering and sorting) and `lib/relevance.ts` (for badges). `tests/relevance-cases.ts` holds one set of cases that both are tested against.
- **No costs:** tuition, salary and currency conversion are not collected or shown (hard to source reliably). The `fx_rates` table and `countries.currency` column remain in the database, unused.
- `seed/jobs.csv` holds real listings checked on employers' own job boards (Nov 2026). Jobs go stale fast: re-check or remove them, or wait for the M4 ingestion and archive jobs.
- Seed entries have no invented fees or deadlines: those are "unknown" until verified or ingested.
- Public entry URLs must be unique. Where a programme, event or call only has its organisation's homepage, the seed adds a `#fragment` (e.g. `https://www.nid.edu/#mdes-interaction-design`). Replace these with real deep links when you have them.
- **Applying migrations:** this machine can't reach the direct database host (`db.<ref>.supabase.co:5432`), so use the **Session pooler** connection string (`postgres.<ref>@aws-0-ap-southeast-2.pooler.supabase.com:5432`) for `SUPABASE_DB_URL` and the CLI (`npx supabase db push --db-url "$SUPABASE_DB_URL" --yes`). The initial migration is already applied and recorded in `supabase_migrations.schema_migrations`.
