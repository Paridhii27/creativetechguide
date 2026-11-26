import { RELEVANCE, KINDS, type EntryType, type Lens, type Relevance } from "./types";
import type { BrowseFilters } from "./db/entries";
import { addDays } from "./dates";

export type Params = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 40;

export const WINDOWS = [
  { value: "7", label: "Next 7 days" },
  { value: "30", label: "Next 30 days" },
  { value: "90", label: "Next 3 months" },
  { value: "365", label: "Next 12 months" },
] as const;

/** Sections that filter by remote/online or in person. Jobs use work mode instead. */
export const REMOTE_TYPES: EntryType[] = ["program", "opportunity", "event"];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

/** Turn URL search params into validated browse filters. Unknown values are dropped. */
export function parseFilters(p: Params, type: EntryType | undefined, lens: Lens, now = new Date()): BrowseFilters {
  const f: BrowseFilters = { type, lens: lens.slug, limit: PAGE_SIZE };
  f.q = one(p.q)?.slice(0, 200);
  f.discipline = one(p.discipline);
  // Set by the globe's city links; the filter column shows it so it can be cleared.
  if (type) f.city = one(p.city)?.slice(0, 100);
  // Only where the filter is shown (or across all types in search), so an old link can't apply one invisibly.
  const remote = !type || REMOTE_TYPES.includes(type) ? one(p.remote) : undefined;
  if (remote === "yes") f.remote = true;
  if (remote === "no") f.remote = false;
  const rel = one(p.relevance);
  if (lens.kind !== "global" && rel && (RELEVANCE as readonly string[]).includes(rel)) f.relevance = rel as Relevance;

  const within = Number(one(p.within));
  if (Number.isFinite(within) && within > 0) {
    f.dateFrom = addDays(0, now);
    f.dateTo = addDays(Math.min(within, 3650), now);
  } else if (one(p.upcoming) === "1") {
    f.dateFrom = addDays(0, now);
  }

  const kind = one(p.kind);
  if (type && kind && KINDS[type].values.includes(kind)) {
    if (type === "program") f.programKind = kind;
    else if (type === "job") f.seniority = kind;
    else f.kind = kind;
  }

  if (type === "job") {
    const wm = one(p.work_mode);
    if (wm && ["onsite", "hybrid", "remote"].includes(wm)) f.workMode = wm;
    const visa = one(p.visa);
    if (visa && ["yes", "no", "unknown"].includes(visa)) f.visa = visa;
  }

  const page = Math.max(1, Math.floor(Number(one(p.page)) || 1));
  f.offset = (page - 1) * PAGE_SIZE;
  return f;
}

export function currentPage(p: Params): number {
  return Math.max(1, Math.floor(Number(one(p.page)) || 1));
}

/** Build a URL keeping current params, with overrides (null removes). */
export function withParams(path: string, p: Params, overrides: Record<string, string | null>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    const s = one(v);
    if (s) qs.set(k, s);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v == null) qs.delete(k);
    else qs.set(k, v);
  }
  return `${path}${qs.size ? `?${qs}` : ""}`;
}
