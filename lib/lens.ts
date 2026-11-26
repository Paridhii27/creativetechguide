import aliases from "./place-aliases.json";
import type { Geo, Lens, PlaceLens, Relevance } from "./types";

export const LENS_COOKIE = "fg_lens";

export const GLOBAL_LENS: Lens = { kind: "global", slug: "global", label: "Global", currency: null };

const WORLDWIDE = ["worldwide", "anywhere", "global", "international"];

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Shape check only; whether the slug names a real place is decided by buildLens. Old 'all' maps to global. */
export function parseLensSlug(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  if (v === "all") return "global";
  return /^[a-z0-9-]{1,60}$/.test(v) ? v : undefined;
}

/** Resolve a slug against the geography tables. Mirrors lens_place() in SQL. Unknown → undefined. */
export function buildLens(slug: string | undefined, geo: Geo): Lens | undefined {
  if (!slug) return undefined;
  if (slug === "global") return GLOBAL_LENS;
  const lower = (xs: string[]) => xs.map((x) => x.toLowerCase());
  const country = geo.countries.find((c) => c.slug === slug);
  if (country) {
    const region = geo.regions.find((r) => r.name === country.region);
    return {
      kind: "country",
      slug,
      label: country.name,
      currency: country.currency,
      homeCountries: [country.name.toLowerCase()],
      homeRegion: null,
      terms: [country.name, country.code, country.region, ...country.groups, ...(region?.also_matches ?? [])].map((x) => x.toLowerCase()).concat(WORLDWIDE),
    } satisfies PlaceLens;
  }
  const region = geo.regions.find((r) => r.slug === slug);
  if (region) {
    const members = lower(geo.countries.filter((c) => c.region === region.name).map((c) => c.name));
    return {
      kind: "region",
      slug,
      label: region.name,
      currency: null,
      homeCountries: members,
      homeRegion: region.name.toLowerCase(),
      terms: [region.name.toLowerCase(), ...lower(region.also_matches), ...members, ...WORLDWIDE],
    } satisfies PlaceLens;
  }
  return undefined;
}

/** Other names people type, keyed by the name in the countries table. */
const ALIASES: Record<string, string[]> = aliases;

/** The lens slug for a typed country or region name or common alternative (case and accents ignored), or undefined. */
export function findPlaceSlug(typed: string, geo: Geo): string | undefined {
  const wanted = slugify(typed);
  if (!wanted) return undefined;
  const named = [...geo.countries, ...geo.regions].find((p) => p.slug === wanted || slugify(p.name) === wanted);
  return named?.slug ?? geo.countries.find((c) => ALIASES[c.name]?.some((a) => slugify(a) === wanted))?.slug;
}

export const isPlaceLens = (l: Lens): l is PlaceLens => l.kind !== "global";

export type BadgeTone = "home" | "open" | "unclear" | "closed";

export function relevanceBadge(r: Relevance, place: string): { label: string; tone: BadgeTone } {
  switch (r) {
    case "based_in":
      return { label: `Based in ${place}`, tone: "home" };
    case "open_to":
      return { label: `Open to ${place}`, tone: "open" };
    case "not_open":
      return { label: `Not open to ${place}`, tone: "closed" };
    default:
      return { label: "Eligibility unclear", tone: "unclear" };
  }
}
