-- Field Guide: Creative Technology — initial schema (M1)
-- Run with `npx supabase db push` (after `npx supabase link`) or paste into the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ───────────────────────── Enums ─────────────────────────
create type entry_type as enum ('organisation', 'program', 'job', 'opportunity', 'resource', 'event');
create type entry_visibility as enum ('public', 'private');
create type entry_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'archived');
create type entry_source as enum ('manual', 'drop', 'ingest', 'import_arena', 'import_awesome_list');
create type india_relevance as enum ('based_in_india', 'open_to_india', 'not_open_to_india', 'unknown');
create type application_status as enum ('none', 'interested', 'applying', 'applied', 'interviewing', 'rejected', 'accepted');
create type collection_visibility as enum ('private', 'shared_link');
create type user_role as enum ('user', 'admin');
create type lens as enum ('india', 'global', 'all');

-- ───────────────────────── Helpers ─────────────────────────
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ───────────────────────── Profiles ─────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role user_role not null default 'user',
  preferred_lens lens not null default 'all',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- Create a profile row the first time a user signs in (magic link creates the auth user).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Users may not promote themselves.
create or replace function guard_profile_role() returns trigger
language plpgsql as $$
begin
  if new.role is distinct from old.role and not is_admin() and current_user = 'authenticated' then
    raise exception 'only admins can change roles';
  end if;
  return new;
end $$;
create trigger profiles_guard_role before update on profiles
  for each row execute function guard_profile_role();

-- ───────────────────────── Taxonomy (data, not hardcoded) ─────────────────────────
create table disciplines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger disciplines_updated_at before update on disciplines
  for each row execute function set_updated_at();

create table places (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  state text,
  country text not null,
  region text not null,
  lat double precision,
  lng double precision,
  is_seed_filter boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city, country)
);
create trigger places_updated_at before update on places
  for each row execute function set_updated_at();

-- Daily FX rates for INR display in the India lens.
create table fx_rates (
  id uuid primary key default gen_random_uuid(),
  currency text not null,          -- ISO 4217, e.g. 'EUR'
  inr_per_unit numeric not null,   -- 1 unit of currency = x INR
  as_of date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (currency, as_of)
);
create trigger fx_rates_updated_at before update on fx_rates
  for each row execute function set_updated_at();

-- ───────────────────────── Entries ─────────────────────────
create table entries (
  id uuid primary key default gen_random_uuid(),
  type entry_type not null,
  title text not null,
  summary text,
  url text,
  favicon_url text,
  image_url text,
  visibility entry_visibility not null default 'private',
  status entry_status not null default 'draft',
  owner_id uuid references auth.users (id) on delete set null,
  city text,
  state text,
  country text,
  region text,
  is_remote boolean not null default false,
  lat double precision,
  lng double precision,
  india_relevance india_relevance not null default 'unknown',
  disciplines text[] not null default '{}',
  source entry_source not null default 'manual',
  last_verified_at timestamptz,
  link_ok boolean,                              -- set by check-links (M4); null = never checked
  needs_next_cycle boolean not null default false, -- set by archive-expired for programmes (M4)
  key_date date,                                -- next deadline (opportunity/job/program) or start date (event); computed
  data jsonb not null default '{}'::jsonb,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english',
      coalesce(city, '') || ' ' || coalesce(country, '') || ' ' || coalesce(region, '') || ' ' ||
      coalesce(data ->> 'role_title', '') || ' ' || coalesce(data ->> 'degree_name', '') || ' ' ||
      coalesce(data ->> 'author', '') || ' ' || coalesce(data ->> 'publisher', '') || ' ' ||
      coalesce(data ->> 'venue', '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index entries_public_url_unique on entries (url) where visibility = 'public' and url is not null;
create index entries_type_idx on entries (type);
create index entries_visibility_status_idx on entries (visibility, status);
create index entries_owner_idx on entries (owner_id);
create index entries_country_idx on entries (country);
create index entries_india_relevance_idx on entries (india_relevance);
create index entries_disciplines_idx on entries using gin (disciplines);
create index entries_data_idx on entries using gin (data jsonb_path_ops);
create index entries_search_idx on entries using gin (search);
create index entries_key_date_idx on entries (key_date);

create trigger entries_updated_at before update on entries
  for each row execute function set_updated_at();

-- India relevance rules (see CLAUDE.md "India lens rules").
create or replace function compute_india_relevance(
  p_country text, p_is_remote boolean, p_data jsonb
) returns india_relevance
language plpgsql immutable as $$
declare
  remote_regions text[];
  elig text[];
  open_to boolean := false;
begin
  if lower(coalesce(p_country, '')) = 'india' then
    return 'based_in_india';
  end if;

  select coalesce(array_agg(lower(x)), '{}') into remote_regions
    from jsonb_array_elements_text(coalesce(p_data -> 'remote_regions', '[]'::jsonb)) x;
  select coalesce(array_agg(lower(x)), '{}') into elig
    from jsonb_array_elements_text(coalesce(p_data -> 'eligibility_countries', '[]'::jsonb)) x;

  if coalesce(p_is_remote, false) and (
       'india' = any(remote_regions) or 'worldwide' = any(remote_regions)
       or 'south asia' = any(remote_regions) or 'asia' = any(remote_regions)
     ) then open_to := true; end if;
  if p_data ->> 'india_eligible' = 'yes' then open_to := true; end if;
  if (p_data ->> 'open_worldwide')::boolean is true then open_to := true; end if;
  if p_data ->> 'visa_sponsorship' = 'yes' then open_to := true; end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_data -> 'scholarships', '[]'::jsonb)) s
    where (s ->> 'open_to_indians')::boolean is true
  ) then open_to := true; end if;
  if 'india' = any(elig) then open_to := true; end if;

  if open_to then return 'open_to_india'; end if;

  -- Explicit restriction that excludes India.
  if p_data ->> 'india_eligible' = 'no' then return 'not_open_to_india'; end if;
  if cardinality(elig) > 0 and not ('india' = any(elig))
     and (p_data ->> 'open_worldwide')::boolean is not true then
    return 'not_open_to_india';
  end if;
  if coalesce(p_is_remote, false) and cardinality(remote_regions) > 0 then
    return 'not_open_to_india';  -- remote, but only for listed regions that exclude India
  end if;

  return 'unknown';
end $$;

-- The date that matters most for a card: next upcoming deadline, else the latest past one; event start date.
create or replace function compute_key_date(p_type entry_type, p_data jsonb) returns date
language plpgsql stable as $$
declare d date;
begin
  if p_type = 'opportunity' then
    return nullif(p_data ->> 'deadline', '')::date;
  elsif p_type = 'job' then
    return nullif(p_data ->> 'closes_at', '')::date;
  elsif p_type = 'event' then
    return nullif(p_data ->> 'start_date', '')::date;
  elsif p_type = 'program' then
    select min((x ->> 'date')::date) into d
      from jsonb_array_elements(coalesce(p_data -> 'application_deadlines', '[]'::jsonb)) x
     where nullif(x ->> 'date', '') is not null and (x ->> 'date')::date >= current_date;
    if d is null then
      select max((x ->> 'date')::date) into d
        from jsonb_array_elements(coalesce(p_data -> 'application_deadlines', '[]'::jsonb)) x
       where nullif(x ->> 'date', '') is not null;
    end if;
    return d;
  end if;
  return null;
end $$;

create or replace function entries_before_write() returns trigger
language plpgsql as $$
begin
  new.india_relevance := compute_india_relevance(new.country, new.is_remote, new.data);
  new.key_date := compute_key_date(new.type, new.data);
  -- Approval publishes the entry.
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.visibility := 'public';
  end if;
  return new;
end $$;
create trigger entries_compute before insert or update on entries
  for each row execute function entries_before_write();

-- Only admins may approve/reject/archive or touch public entries.
-- (RLS also enforces this; the trigger gives a clear error and covers column-level changes.)
create or replace function entries_guard() returns trigger
language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') or is_admin() then
    return new;  -- service role / migrations / admins
  end if;
  if new.status in ('approved', 'rejected', 'archived')
     and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    raise exception 'only admins can set status to %', new.status;
  end if;
  if new.visibility = 'public' then
    raise exception 'only admins can publish or edit public entries';
  end if;
  if tg_op = 'UPDATE' and new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id cannot be changed';
  end if;
  return new;
end $$;
create trigger entries_guard before insert or update on entries
  for each row execute function entries_guard();

-- Nightly recompute (call from a cron job): select recompute_india_relevance();
create or replace function recompute_india_relevance() returns int
language sql security definer set search_path = public as $$
  with u as (
    update entries
       set india_relevance = compute_india_relevance(country, is_remote, data),
           key_date = compute_key_date(type, data)
     where india_relevance is distinct from compute_india_relevance(country, is_remote, data)
        or key_date is distinct from compute_key_date(type, data)
    returning 1
  ) select count(*)::int from u;
$$;

-- ───────────────────────── Browse / search ─────────────────────────
-- Runs with the caller's rights, so RLS decides what is visible.
create or replace function browse_entries(
  p_type entry_type default null,
  p_lens lens default 'all',
  p_q text default null,
  p_region text default null,
  p_country text default null,
  p_city text default null,
  p_discipline text default null,
  p_remote boolean default null,
  p_relevance india_relevance default null,
  p_date_from date default null,
  p_date_to date default null,
  p_program_kind text default null,
  p_tuition_inr_min numeric default null,
  p_tuition_inr_max numeric default null,
  p_seniority text default null,
  p_work_mode text default null,
  p_visa text default null,
  p_kind text default null,          -- org_kind / opp_kind / resource_kind / event_kind
  p_only_public boolean default true,
  p_limit int default 50,
  p_offset int default 0
) returns setof entries
language sql stable security invoker set search_path = public as $$
  select e.*
    from entries e
   where (p_type is null or e.type = p_type)
     and (not p_only_public or (e.visibility = 'public' and e.status = 'approved'))
     and e.status <> 'archived'
     and (p_lens <> 'india' or e.india_relevance <> 'not_open_to_india')
     and (p_q is null or p_q = '' or e.search @@ websearch_to_tsquery('english', p_q)
          or e.title ilike '%' || p_q || '%')
     and (p_region is null or e.region = p_region)
     and (p_country is null or e.country = p_country)
     and (p_city is null or e.city = p_city)
     and (p_discipline is null or p_discipline = any (e.disciplines))
     and (p_remote is null or e.is_remote = p_remote)
     and (p_relevance is null or e.india_relevance = p_relevance)
     and (p_date_from is null or e.key_date >= p_date_from)
     and (p_date_to is null or e.key_date <= p_date_to)
     and (p_program_kind is null or e.data ->> 'program_kind' = p_program_kind)
     and (p_tuition_inr_min is null or (e.data ->> 'tuition_inr_estimate')::numeric >= p_tuition_inr_min)
     and (p_tuition_inr_max is null or (e.data ->> 'tuition_inr_estimate')::numeric <= p_tuition_inr_max)
     and (p_seniority is null or e.data ->> 'seniority' = p_seniority)
     and (p_work_mode is null or e.data ->> 'work_mode' = p_work_mode)
     and (p_visa is null or e.data ->> 'visa_sponsorship' = p_visa)
     and (p_kind is null or coalesce(e.data ->> 'org_kind', e.data ->> 'opp_kind',
                                     e.data ->> 'resource_kind', e.data ->> 'event_kind') = p_kind)
   order by
     case when p_lens = 'india' then
       case e.india_relevance when 'based_in_india' then 0 when 'open_to_india' then 1 else 2 end
     else 0 end,
     case when p_q is not null and p_q <> '' then ts_rank(e.search, websearch_to_tsquery('english', p_q)) else 0 end desc,
     case when e.key_date >= current_date then 0 when e.key_date is null then 1 else 2 end,
     e.key_date asc nulls last,
     e.title asc
   limit p_limit offset p_offset;
$$;
grant execute on function browse_entries to anon, authenticated;

-- ───────────────────────── My Layer ─────────────────────────
create table user_entry_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_id uuid not null references entries (id) on delete cascade,
  saved boolean not null default false,
  note text,
  personal_tags text[] not null default '{}',
  application_status application_status not null default 'none',
  reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_id)
);
create trigger user_entry_state_updated_at before update on user_entry_state
  for each row execute function set_updated_at();

create table collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  visibility collection_visibility not null default 'private',
  share_token text not null default encode(gen_random_bytes(12), 'hex') unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger collections_updated_at before update on collections
  for each row execute function set_updated_at();

create table collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections (id) on delete cascade,
  entry_id uuid not null references entries (id) on delete cascade,
  position int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, entry_id)
);
create trigger collection_items_updated_at before update on collection_items
  for each row execute function set_updated_at();

-- ───────────────────────── Ingestion ─────────────────────────
create table ingest_sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  kind text not null check (kind in ('page', 'rss', 'search_query')),
  expected_type entry_type not null check (expected_type in ('opportunity', 'job', 'program', 'event')),
  lens_hint text check (lens_hint in ('india', 'global')),
  last_hash text,
  last_checked_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger ingest_sources_updated_at before update on ingest_sources
  for each row execute function set_updated_at();

-- ───────────────────────── Row Level Security ─────────────────────────
alter table profiles enable row level security;
alter table disciplines enable row level security;
alter table places enable row level security;
alter table fx_rates enable row level security;
alter table entries enable row level security;
alter table user_entry_state enable row level security;
alter table collections enable row level security;
alter table collection_items enable row level security;
alter table ingest_sources enable row level security;

-- profiles
create policy "profiles: read own or admin" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles: update own" on profiles for update
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());
create policy "profiles: insert own" on profiles for insert
  with check (id = auth.uid());

-- taxonomy + fx: public read, admin write
create policy "disciplines: read" on disciplines for select using (true);
create policy "disciplines: admin write" on disciplines for all using (is_admin()) with check (is_admin());
create policy "places: read" on places for select using (true);
create policy "places: admin write" on places for all using (is_admin()) with check (is_admin());
create policy "fx: read" on fx_rates for select using (true);
create policy "fx: admin write" on fx_rates for all using (is_admin()) with check (is_admin());

-- entries
create policy "entries: public approved readable by anyone" on entries for select
  using (visibility = 'public' and status = 'approved');
create policy "entries: owner reads own" on entries for select
  using (owner_id = auth.uid());
create policy "entries: admin reads all" on entries for select
  using (is_admin());

create policy "entries: owner inserts private" on entries for insert
  with check (owner_id = auth.uid() and visibility = 'private' and status in ('draft', 'pending_review'));
create policy "entries: owner updates own private" on entries for update
  using (owner_id = auth.uid() and visibility = 'private')
  with check (owner_id = auth.uid() and visibility = 'private' and status in ('draft', 'pending_review'));
create policy "entries: owner deletes own private" on entries for delete
  using (owner_id = auth.uid() and visibility = 'private');

create policy "entries: admin insert" on entries for insert with check (is_admin());
create policy "entries: admin update" on entries for update using (is_admin()) with check (is_admin());
create policy "entries: admin delete" on entries for delete using (is_admin());

-- user_entry_state
create policy "ues: own" on user_entry_state for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- collections
create policy "collections: own" on collections for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "collection_items: own" on collection_items for all
  using (exists (select 1 from collections c where c.id = collection_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from collections c where c.id = collection_id and c.owner_id = auth.uid()));

-- shared-link collections are read through this function (token required), not via open RLS
create or replace function get_shared_collection(p_token text)
returns table (collection_id uuid, name text, description text, entry_id uuid)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.description, ci.entry_id
    from collections c
    left join collection_items ci on ci.collection_id = c.id
    left join entries e on e.id = ci.entry_id
   where c.share_token = p_token and c.visibility = 'shared_link'
     and (e.id is null or (e.visibility = 'public' and e.status = 'approved'));
$$;

-- ingest_sources: admin only
create policy "ingest_sources: admin" on ingest_sources for all using (is_admin()) with check (is_admin());

-- ───────────────────────── Grants ─────────────────────────
grant usage on schema public to anon, authenticated;
grant select on entries, disciplines, places, fx_rates to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- Functions are executable by PUBLIC by default; lock down the privileged ones.
revoke execute on function recompute_india_relevance() from public, anon, authenticated;
revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function get_shared_collection(text) from public;
grant execute on function get_shared_collection(text) to anon, authenticated;
grant execute on function is_admin() to anon, authenticated;
