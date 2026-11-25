-- Tools get their own section. They stay `resource` entries with data.resource_kind = 'tool';
-- other resources (libraries, tutorials, communities…) can point at one with data.tool_id.
-- No table or enum changes: browse_entries just gains p_exclude_kind so Publications can leave tools out.

drop function if exists browse_entries(entry_type, text, text, text, text, text, text, boolean, lens_relevance,
  date, date, text, numeric, numeric, text, text, text, text, boolean, int, int);

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
  p_offset int default 0,
  p_exclude_kind text default null   -- e.g. 'tool' for Publications
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
     and (p_exclude_kind is null or coalesce(e.data ->> 'org_kind', e.data ->> 'opp_kind',
                                     e.data ->> 'resource_kind', e.data ->> 'event_kind', '') <> p_exclude_kind)
   order by
     case r.rel when 'based_in' then 0 when 'open_to' then 1 else 2 end,
     case when p_q is not null and p_q <> '' then ts_rank(e.search, websearch_to_tsquery('english', p_q)) else 0 end desc,
     case when e.key_date >= current_date then 0 when e.key_date is null then 1 else 2 end,
     e.key_date asc nulls last,
     e.title asc
   limit p_limit offset p_offset;
$$;
grant execute on function browse_entries(entry_type, text, text, text, text, text, text, boolean, lens_relevance,
  date, date, text, numeric, numeric, text, text, text, text, boolean, int, int, text) to anon, authenticated;

-- Resources linked to a tool are looked up by data->>'tool_id' on the tool's page.
create index if not exists entries_tool_id_idx on entries ((data ->> 'tool_id')) where data ? 'tool_id';
