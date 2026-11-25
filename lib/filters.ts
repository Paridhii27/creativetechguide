import { RELEVANCE, KINDS, type EntryType, type Lens, type Relevance } from "./types";
import type { BrowseFilters } from "./db/entries";
import { addDays } from "./dates";

export type Params = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 40;

/** Tuition bands per year, in USD; labels are shown in the lens currency. */
export const TUITION_BANDS = [
  { value: "0-5000", min: 0, max: 5000 },
  { value: "5000-15000", min: 5000, max: 15000 },
  { value: "15000-35000", min: 15000, max: 35000 },
  { value: "35000-", min: 35000, max: null },
] as const;

export const WINDOWS = [
  { value: "7", label: "Next 7 days" },
  { value: "30", label: "Next 30 days" },
  { value: "90", label: "Next 3 months" },
  { value: "365", label: "Next 12 months" },
] as const;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

/** Turn URL search params into validated browse filters. Unknown values are dropped. */
export function parseFilters(p: Params, type: EntryType | undefined, lens: Lens, now = new Date()): BrowseFilters {
  const f: BrowseFilters = { type, lens: lens.slug, limit: PAGE_SIZE };
  f.q = one(p.q)?.slice(0, 200);
  f.discipline = one(p.discipline);
  const remote = one(p.remote);
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

  if (type === "program") {
    const band = one(p.tuition);
    const m = band?.match(/^(\d*)-(\d*)$/);
    if (m) {
      if (m[1]) f.tuitionUsdMin = Number(m[1]);
      if (m[2]) f.tuitionUsdMax = Number(m[2]);
    }
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
