import type { Entry, PlaceLens, Relevance } from "./types";

/**
 * Geographic lens rules (CLAUDE.md "Geographic lens rules").
 * Mirrors place_relevance() in supabase/migrations/20261123000001_geo_lens.sql; the live test suite
 * checks both against the same cases in tests/relevance-cases.ts.
 */
const lowerList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().toLowerCase()) : [];
const overlaps = (a: string[], b: string[]) => a.some((x) => b.includes(x));

/** Every place an entry is based: its main one, then data.locations (other offices). */
export function placesOf(e: Pick<Entry, "country" | "region" | "data">): { country: string | null; region: string | null }[] {
  const extra = Array.isArray(e.data?.locations) ? (e.data.locations as { country?: unknown; region?: unknown }[]) : [];
  return [
    { country: e.country, region: e.region },
    ...extra.map((l) => ({ country: typeof l?.country === "string" ? l.country : null, region: typeof l?.region === "string" ? l.region : null })),
  ];
}

export function placeRelevance(e: Pick<Entry, "country" | "region" | "is_remote" | "data">, lens: PlaceLens): Relevance {
  const d = e.data ?? {};
  for (const p of placesOf(e)) {
    if (lens.homeCountries.includes((p.country ?? "").toLowerCase())) return "based_in";
    if (lens.kind === "region" && (p.region ?? "").toLowerCase() === lens.homeRegion) return "based_in";
  }

  if (lowerList(d.ineligible_countries).includes(lens.label.toLowerCase())) return "not_open";

  const remote = lowerList(d.remote_regions);
  const elig = lowerList(d.eligibility_countries);
  const scholarships = Array.isArray(d.scholarships) ? (d.scholarships as Record<string, unknown>[]) : [];
  if (
    (e.is_remote && overlaps(remote, lens.terms)) ||
    d.open_worldwide === true ||
    d.visa_sponsorship === "yes" ||
    overlaps(elig, lens.terms) ||
    scholarships.some((s) => s && (s.open_worldwide === true || overlaps(lowerList(s.eligible_countries), lens.terms)))
  )
    return "open_to";

  if (elig.length > 0) return "not_open";
  if (e.is_remote && remote.length > 0) return "not_open";
  return "unknown";
}
