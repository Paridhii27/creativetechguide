-- Entries can be based in several places. The first stays in city/country/region; any others live in
-- data.locations as [{city, state, country, region, lat, lng}]. This only teaches the lens rules about them
-- (function body; no table change). Keep in step with placeRelevance() in lib/relevance.ts.
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
  -- Based in the lens place if the main location or any other office (data.locations) is.
  if lower(coalesce(p_country, '')) = any (l_home_countries)
     or (l_kind = 'region' and lower(coalesce(p_region, '')) = l_home_region)
     or exists (
       select 1
         from jsonb_array_elements(case when jsonb_typeof(p_data -> 'locations') = 'array' then p_data -> 'locations' else '[]'::jsonb end) loc
        where lower(coalesce(loc ->> 'country', '')) = any (l_home_countries)
           or (l_kind = 'region' and lower(coalesce(loc ->> 'region', '')) = l_home_region)
     ) then
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
