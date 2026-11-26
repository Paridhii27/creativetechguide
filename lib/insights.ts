import { daysUntil } from "./dates";
import { placeRelevance, placesOf } from "./relevance";
import { SECTIONS, sectionForEntry, type Entry, type Lens, type Relevance, type Section } from "./types";

/** Counts over one user's layer (their saves plus their own entries). Computed at request time; nothing is stored. */
export interface LayerInsights {
  total: number;
  /** Dated entries still ahead (deadlines and event starts), soonest first. */
  upcoming: Entry[];
  /** How many of those deadlines (not events) fall within 30 days. */
  deadlinesIn30: number;
  /** How many events start within 30 days. */
  eventsIn30: number;
  bySection: { section: Section; count: number }[];
  disciplines: Count[];
  countries: Count[];
  remote: number;
  /** Skills asked for by the jobs in the layer. */
  skills: Count[];
  /** Eligibility for the lens place; null in the Global lens. */
  relevance: Record<Relevance, number> | null;
}
export interface Count {
  key: string;
  count: number;
}

/** Count each key once per entry, most common first (ties alphabetical). Case-insensitive, keeping the first spelling. */
function tally(perEntry: string[][]): Count[] {
  const counts = new Map<string, Count>();
  for (const keys of perEntry) {
    const unique = new Map(keys.map((k) => [k.trim().toLowerCase(), k.trim()]));
    for (const [id, key] of unique) {
      if (!id) continue;
      const c = counts.get(id) ?? { key, count: 0 };
      c.count++;
      counts.set(id, c);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function layerInsights(entries: Entry[], lens: Lens, now = new Date()): LayerInsights {
  const upcoming = entries
    .filter((e) => e.key_date && daysUntil(e.key_date, now) >= 0)
    .sort((a, b) => a.key_date!.localeCompare(b.key_date!) || a.title.localeCompare(b.title));
  const soon = upcoming.filter((e) => daysUntil(e.key_date!, now) <= 30);

  let relevance: LayerInsights["relevance"] = null;
  if (lens.kind !== "global") {
    relevance = { based_in: 0, open_to: 0, not_open: 0, unknown: 0 };
    for (const e of entries) relevance[placeRelevance(e, lens)]++;
  }

  return {
    total: entries.length,
    upcoming,
    deadlinesIn30: soon.filter((e) => e.type !== "event").length,
    eventsIn30: soon.filter((e) => e.type === "event").length,
    bySection: SECTIONS.map((section) => ({ section, count: entries.filter((e) => sectionForEntry(e).slug === section.slug).length })).filter((x) => x.count > 0),
    disciplines: tally(entries.map((e) => e.disciplines)),
    countries: tally(entries.map((e) => placesOf(e).map((p) => p.country ?? ""))),
    remote: entries.filter((e) => e.is_remote).length,
    skills: tally(entries.filter((e) => e.type === "job").map((e) => strings(e.data.skills))),
    relevance,
  };
}
