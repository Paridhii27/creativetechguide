import { daysUntil } from "./dates";
import { placeRelevance } from "./relevance";
import type { Entry, Lens } from "./types";

/**
 * Section headings for index tables and catalogue grids, built from runs of consecutive rows.
 * They never reorder: the database sort (relevance bucket in a place lens, then date or title)
 * is kept exactly, and a heading starts whenever the band changes. With a keyword search the
 * order is by rank, so everything is one group.
 */
export interface IndexGroupSpec<T> {
  key: string;
  title: string;
  period: string;
  items: T[];
}

type Band = { key: string; title: string; period: string };

/** Heading words that differ by type: a job "closes", an event "starts". */
export interface BandLabels {
  week: string;
  month: string;
  later: string;
  undated: string;
  past: string;
  /** events only: started but not yet ended */
  ongoing?: string;
}

export const DEFAULT_BAND_LABELS: BandLabels = {
  week: "Closing this week",
  month: "Closing this month",
  later: "Upcoming",
  undated: "Dates to be confirmed",
  past: "Past",
};

type Groupable = Pick<Entry, "key_date" | "country" | "region" | "is_remote" | "data">;

function dateBand(e: Groupable, now: Date, labels: BandLabels): Band {
  const iso = e.key_date;
  // No big period label for undated items: the missing date shouldn't be the focal point.
  if (!iso) return { key: "tbc", title: labels.undated, period: "" };
  const n = daysUntil(iso, now);
  const year = iso.slice(0, 4);
  if (n < 0) {
    const end = typeof e.data?.end_date === "string" ? e.data.end_date : null;
    if (labels.ongoing && end && daysUntil(end, now) >= 0) return { key: "ongoing", title: labels.ongoing, period: "Now" };
    return { key: `past-${year}`, title: labels.past, period: year };
  }
  if (n < 7) return { key: "week", title: labels.week, period: "7 days" };
  if (n < 30) return { key: "month", title: labels.month, period: "30 days" };
  return { key: `later-${year}`, title: labels.later, period: year };
}

/** Same buckets as the SQL sort: based_in 0, open_to 1, everything else 2. Always 2 in the Global lens. */
function bucketOf(e: Groupable, lens: Lens): 0 | 1 | 2 {
  if (lens.kind === "global") return 2;
  const r = placeRelevance(e, lens);
  return r === "based_in" ? 0 : r === "open_to" ? 1 : 2;
}

const BUCKET_TITLE = (lens: Lens, b: 0 | 1 | 2) =>
  lens.kind === "global" ? "" : b === 0 ? `Based in ${lens.label}` : b === 1 ? `Open to ${lens.label}` : "Elsewhere";

function runs<T extends Groupable>(entries: T[], lens: Lens, band: (e: T) => Band, query?: string, byRelevance = true): IndexGroupSpec<T>[] {
  if (entries.length === 0) return [];
  if (query?.trim()) return [{ key: "search", title: `Matches for “${query.trim()}”`, period: String(entries.length), items: entries }];
  const groups: IndexGroupSpec<T>[] = [];
  for (const e of entries) {
    const bucket = byRelevance ? bucketOf(e, lens) : 2;
    const b = band(e);
    const key = `${bucket}:${b.key}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(e);
    else {
      const prefix = byRelevance ? BUCKET_TITLE(lens, bucket) : "";
      groups.push({ key, title: prefix ? (b.title ? `${prefix} · ${b.title.toLowerCase()}` : prefix) : b.title, period: b.period, items: [e] });
    }
  }
  return groups;
}

/** Date bands for time-based types (open calls, jobs, programmes, events). */
export function groupByDeadline<T extends Groupable>(
  entries: T[],
  lens: Lens,
  /** byRelevance: false for lists not sorted by relevance first (e.g. the home page's date-sorted mix) */
  opts: { query?: string; now?: Date; labels?: BandLabels; byRelevance?: boolean } = {},
): IndexGroupSpec<T>[] {
  const now = opts.now ?? new Date();
  const labels = opts.labels ?? DEFAULT_BAND_LABELS;
  return runs(entries, lens, (e) => dateBand(e, now, labels), opts.query, opts.byRelevance ?? true);
}

/**
 * First-letter bands for alphabetical catalogues (studios, resources, tools): "A", "B"… "#" for
 * digits/symbols. Neighbouring letters in the same relevance bucket merge into ranges ("A–C")
 * until a group has at least `minPerGroup` entries, so short lists don't get a heading per card.
 */
export function groupByLetter<T extends Groupable & { title: string }>(
  entries: T[],
  lens: Lens,
  /** byRelevance: false for lists that aren't place-based (tools): plain A–Z, no "Elsewhere" prefix */
  opts: { query?: string; minPerGroup?: number; byRelevance?: boolean } = {},
): IndexGroupSpec<T>[] {
  const letters = runs(
    entries,
    lens,
    (e) => {
      const ch = e.title.replace(/^\[Demo\]\s*/, "").trim().charAt(0).normalize("NFD").charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(ch) ? ch : "#";
      return { key: letter, title: "", period: letter };
    },
    opts.query,
    opts.byRelevance ?? true,
  );
  if (opts.query?.trim()) return letters;
  const min = opts.minPerGroup ?? 6;
  const bucketOfKey = (k: string) => k.split(":")[0];
  const out: IndexGroupSpec<T>[] = [];
  const first: string[] = []; // first letter of each merged group, parallel to `out`
  const join = (i: number, g: IndexGroupSpec<T>) => {
    out[i].items.push(...g.items);
    out[i].period = `${first[i]}–${g.period.split("–").pop()}`;
    out[i].key = `${bucketOfKey(out[i].key)}:${out[i].period}`;
  };
  for (const g of letters) {
    const i = out.length - 1;
    if (i >= 0 && bucketOfKey(out[i].key) === bucketOfKey(g.key) && out[i].items.length < min) join(i, g);
    else {
      out.push({ ...g, items: [...g.items] });
      first.push(g.period);
    }
  }
  // A short tail joins the group before it (same bucket) rather than standing alone.
  const n = out.length;
  if (n >= 2 && out[n - 1].items.length < min && bucketOfKey(out[n - 1].key) === bucketOfKey(out[n - 2].key)) {
    join(n - 2, out[n - 1]);
    out.pop();
  }
  return out;
}
