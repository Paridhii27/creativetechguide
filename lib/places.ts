import type { Entry } from "./types";

/** Other offices stored in data.locations, as "City, Country" strings. */
export function extraPlaceNames(e: Pick<Entry, "data">): string[] {
  const list = Array.isArray(e.data?.locations) ? (e.data.locations as { city?: string | null; country?: string | null }[]) : [];
  return list.map((l) => [l?.city, l?.country].filter(Boolean).join(", ")).filter(Boolean);
}

/** The main place, then other offices: all of them with `all`, otherwise "+N more". */
export function locationLabel(e: Pick<Entry, "city" | "country" | "is_remote"> & { data?: Entry["data"] }, opts: { all?: boolean } = {}): string {
  const main = [e.city, e.country].filter(Boolean).join(", ");
  const extra = e.data ? extraPlaceNames({ data: e.data }) : [];
  const place = opts.all ? [main, ...extra].filter(Boolean).join(" · ") : `${main}${main && extra.length ? ` +${extra.length} more` : ""}`;
  if (e.is_remote && place) return `${place} · Remote`;
  if (e.is_remote) return "Remote / Online";
  return place || "Location unknown";
}

/**
 * The country for a typed city, or null when the city isn't known or the name is shared by cities in
 * different countries (e.g. "Birmingham"): then the user picks.
 */
export function countryForCity(places: { city: string; country: string }[], city: string): string | null {
  const c = city.trim().toLowerCase();
  if (!c) return null;
  const countries = [...new Set(places.filter((p) => p.city.toLowerCase() === c).map((p) => p.country))];
  return countries.length === 1 ? countries[0] : null;
}
