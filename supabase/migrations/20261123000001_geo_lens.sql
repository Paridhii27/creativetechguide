-- Geographic lens: the lens is any country or region (or Global), not just India.
--
-- • New `regions` and `countries` tables (data, not hardcoded lists). A country can belong to groups
--   such as EU/EEA/Commonwealth, and a region can be covered by wider names (Asia, APAC, EMEA, Americas).
-- • The stored `india_relevance` column is replaced by a query-time check, `place_relevance()`, against
--   whichever place the viewer picks. The same rules are mirrored in lib/relevance.ts for display.
-- • India-only data fields become general ones:
--     opportunity.india_eligible  → eligibility_countries[] / ineligible_countries[]
--     scholarship.open_to_indians → scholarship.eligible_countries[]
-- • profiles.preferred_lens becomes a text slug ('global', 'india', 'europe', …).

-- ───────────────────────── Geography ─────────────────────────
create table regions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  also_matches text[] not null default '{}',  -- wider names that include this region, e.g. Asia, APAC, EMEA
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger regions_updated_at before update on regions
  for each row execute function set_updated_at();

create table countries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2}$'),  -- ISO 3166-1 alpha-2
  slug text not null unique,
  name text not null unique,
  region text not null references regions (name) on update cascade,
  currency text check (currency ~ '^[A-Z]{3}$'),           -- ISO 4217, used to convert costs in this lens
  groups text[] not null default '{}',                      -- e.g. EU, EEA, Schengen, Commonwealth
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index countries_region_idx on countries (region);
create trigger countries_updated_at before update on countries
  for each row execute function set_updated_at();

alter table regions enable row level security;
alter table countries enable row level security;
create policy "regions: read" on regions for select using (true);
create policy "regions: admin write" on regions for all using (is_admin()) with check (is_admin());
create policy "countries: read" on countries for select using (true);
create policy "countries: admin write" on countries for all using (is_admin()) with check (is_admin());
grant select on regions, countries to anon;
grant select, insert, update, delete on regions, countries to authenticated;

-- ───────────────────────── Data fields: India-only → general ─────────────────────────
-- Existing 'yes' answers were India-specific calls (e.g. grants only for Indian applicants).
update entries
   set data = jsonb_set(data - 'india_eligible', '{eligibility_countries}',
                        coalesce(data -> 'eligibility_countries', '[]'::jsonb) || '["India"]'::jsonb)
 where data ->> 'india_eligible' = 'yes'
   and not coalesce(data -> 'eligibility_countries', '[]'::jsonb) ? 'India'
   and (data ->> 'open_worldwide')::boolean is not true;
update entries
   set data = jsonb_set(data - 'india_eligible', '{ineligible_countries}',
                        coalesce(data -> 'ineligible_countries', '[]'::jsonb) || '["India"]'::jsonb)
 where data ->> 'india_eligible' = 'no';
update entries set data = data - 'india_eligible' where data ? 'india_eligible';

update entries
   set data = jsonb_set(data, '{scholarships}', (
     select coalesce(jsonb_agg(
              case when (s ->> 'open_to_indians')::boolean is true
                   then (s - 'open_to_indians') || jsonb_build_object('eligible_countries', jsonb_build_array('India'))
                   else s - 'open_to_indians' end), '[]'::jsonb)
       from jsonb_array_elements(data -> 'scholarships') s))
 where jsonb_typeof(data -> 'scholarships') = 'array'
   and exists (select 1 from jsonb_array_elements(data -> 'scholarships') s where s ? 'open_to_indians');

-- ───────────────────────── Drop the India-only machinery ─────────────────────────
drop function browse_entries(entry_type, lens, text, text, text, text, text, boolean, india_relevance,
  date, date, text, numeric, numeric, text, text, text, text, boolean, int, int);
drop function recompute_india_relevance();
drop index if exists entries_india_relevance_idx;
alter table entries drop column india_relevance;
drop function compute_india_relevance(text, boolean, jsonb);
drop type india_relevance;

alter table profiles alter column preferred_lens drop default;
alter table profiles alter column preferred_lens type text
  using (case preferred_lens::text when 'all' then 'global' else preferred_lens::text end);
alter table profiles alter column preferred_lens set default 'global';
alter table profiles add constraint profiles_preferred_lens_slug check (preferred_lens ~ '^[a-z0-9-]{1,60}$');
drop type lens;

alter table ingest_sources drop constraint if exists ingest_sources_lens_hint_check;
comment on column ingest_sources.lens_hint is 'Optional lens slug (global, a country or region slug) the source is mainly useful for.';

create or replace function entries_before_write() returns trigger
language plpgsql set search_path = public as $$
begin
  new.key_date := compute_key_date(new.type, new.data);
  -- Approval publishes the entry.
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.visibility := 'public';
  end if;
  return new;
end $$;

-- Nightly: programme deadlines roll forward, so key_date needs recomputing.
create or replace function recompute_key_dates() returns int
language sql security definer set search_path = public as $$
  with u as (
    update entries set key_date = compute_key_date(type, data)
     where key_date is distinct from compute_key_date(type, data)
    returning 1
  ) select count(*)::int from u;
$$;
revoke execute on function recompute_key_dates() from public, anon, authenticated;

-- ───────────────────────── Lens relevance ─────────────────────────
create type lens_relevance as enum ('based_in', 'open_to', 'not_open', 'unknown');

-- Resolve a lens slug. No row for 'global' or an unknown slug.
--   home_countries: lowercased country names that count as "based in" the lens
--   terms: lowercased names that, in an eligibility or remote list, include the lens
create or replace function lens_place(p_slug text)
returns table (kind text, label text, home_countries text[], home_region text, terms text[])
language sql stable set search_path = public as $$
  select 'country', c.name, array[lower(c.name)], null::text,
         array[lower(c.name), lower(c.code), lower(c.region)]
           || array(select lower(x) from unnest(c.groups || r.also_matches) x)
           || array['worldwide', 'anywhere', 'global', 'international']
    from countries c join regions r on r.name = c.region
   where c.slug = p_slug
  union all
  select 'region', r.name,
         coalesce(array(select lower(c.name) from countries c where c.region = r.name), '{}'),
         lower(r.name),
         array[lower(r.name)]
           || array(select lower(x) from unnest(r.also_matches) x)
           || coalesce(array(select lower(c.name) from countries c where c.region = r.name), '{}')
           || array['worldwide', 'anywhere', 'global', 'international']
    from regions r
   where r.slug = p_slug
   limit 1;
$$;

create or replace function jsonb_lower_texts(p jsonb) returns text[]
language sql immutable set search_path = public as $$
  select coalesce(array_agg(lower(trim(x))), '{}')
    from jsonb_array_elements_text(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) x;
$$;

-- The rules (CLAUDE.md "Geographic lens rules"); keep in step with lib/relevance.ts.
create or replace function place_relevance(
  p_country text, p_region text, p_is_remote boolean, p_data jsonb,
  l_kind text, l_label text, l_home_countries text[], l_home_region text, l_terms text[]
) returns lens_relevance
language plpgsql immutable set search_path = public as $$
declare
  remote_regions text[] := jsonb_lower_texts(p_data -> 'remote_regions');
  elig text[] := jsonb_lower_texts(p_data -> 'eligibility_countries');
  inelig text[] := jsonb_lower_texts(p_data -> 'ineligible_countries');
begin
  if lower(coalesce(p_country, '')) = any (l_home_countries)
     or (l_kind = 'region' and lower(coalesce(p_region, '')) = l_home_region) then
    return 'based_in';
  end if;

  -- An explicit exclusion beats general openness.
  if lower(l_label) = any (inelig) then return 'not_open'; end if;

  if (coalesce(p_is_remote, false) and remote_regions && l_terms)
     or (p_data ->> 'open_worldwide')::boolean is true
     or p_data ->> 'visa_sponsorship' = 'yes'
     or elig && l_terms
     or exists (
       select 1 from jsonb_array_elements(case when jsonb_typeof(p_data -> 'scholarships') = 'array' then p_data -> 'scholarships' else '[]'::jsonb end) s
        where (s ->> 'open_worldwide')::boolean is true or jsonb_lower_texts(s -> 'eligible_countries') && l_terms
     ) then
    return 'open_to';
  end if;

  if cardinality(elig) > 0 then return 'not_open'; end if;                       -- restricted list without the lens
  if coalesce(p_is_remote, false) and cardinality(remote_regions) > 0 then
    return 'not_open';                                                           -- remote, but only for other regions
  end if;
  return 'unknown';
end $$;

-- For tests and tools: relevance of an arbitrary row under a lens slug.
create or replace function relevance_for(p_lens text, p_country text, p_region text, p_is_remote boolean, p_data jsonb)
returns lens_relevance
language sql stable set search_path = public as $$
  select place_relevance(p_country, p_region, p_is_remote, p_data, l.kind, l.label, l.home_countries, l.home_region, l.terms)
    from lens_place(p_lens) l;
$$;

-- ───────────────────────── Browse / search ─────────────────────────
-- Runs with the caller's rights, so RLS decides what is visible.
-- A place lens hides entries that are not open to it (unless p_relevance = 'not_open') and sorts
-- based-in first, then open-to. 'global' (or any unknown slug) applies no geographic rules.
create or replace function browse_entries(
  p_type entry_type default null,
  p_lens text default 'global',
  p_q text default null,
  p_region text default null,
  p_country text default null,
  p_city text default null,
  p_discipline text default null,
  p_remote boolean default null,
  p_relevance lens_relevance default null,
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
    left join lens_place(p_lens) l on true
    cross join lateral (
      select case when l.kind is null then null::lens_relevance
             else place_relevance(e.country, e.region, e.is_remote, e.data, l.kind, l.label, l.home_countries, l.home_region, l.terms) end as rel
    ) r
   where (p_type is null or e.type = p_type)
     and (not p_only_public or (e.visibility = 'public' and e.status = 'approved'))
     and e.status <> 'archived'
     and (l.kind is null or p_relevance = 'not_open' or r.rel <> 'not_open')
     and (p_relevance is null or l.kind is null or r.rel = p_relevance)
     and (p_q is null or p_q = '' or e.search @@ websearch_to_tsquery('english', p_q)
          or e.title ilike '%' || p_q || '%')
     and (p_region is null or e.region = p_region)
     and (p_country is null or e.country = p_country)
     and (p_city is null or e.city = p_city)
     and (p_discipline is null or p_discipline = any (e.disciplines))
     and (p_remote is null or e.is_remote = p_remote)
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
     case r.rel when 'based_in' then 0 when 'open_to' then 1 else 2 end,
     case when p_q is not null and p_q <> '' then ts_rank(e.search, websearch_to_tsquery('english', p_q)) else 0 end desc,
     case when e.key_date >= current_date then 0 when e.key_date is null then 1 else 2 end,
     e.key_date asc nulls last,
     e.title asc
   limit p_limit offset p_offset;
$$;
grant execute on function browse_entries(entry_type, text, text, text, text, text, text, boolean, lens_relevance,
  date, date, text, numeric, numeric, text, text, text, text, boolean, int, int) to anon, authenticated;
grant execute on function lens_place(text), relevance_for(text, text, text, boolean, jsonb) to anon, authenticated;
