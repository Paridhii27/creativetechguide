export type Urgency = "past" | "week" | "month" | "later";

const DAY = 86_400_000;

/** Days from today (local midnight) to an ISO date. */
export function daysUntil(iso: string, now = new Date()): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / DAY);
}

/** Urgency bands from CLAUDE.md: >30 days, <30 days, <7 days. */
export function urgency(iso: string, now = new Date()): Urgency {
  const n = daysUntil(iso, now);
  if (n < 0) return "past";
  if (n < 7) return "week";
  if (n < 30) return "month";
  return "later";
}

export interface DateChipInfo {
  /** chip colour: an urgency band, or "none" for plain grey */
  tone: Urgency | "none";
  text: string;
  /** "in 3d", "tomorrow"… shown after the date while it's still ahead */
  rel: string | null;
}

/**
 * What the date chip on a card says. Deadlines (jobs, open calls, programmes) "close"; an event has no
 * closing date, so a start that has passed reads "Ongoing until…" / "Ended…" / "Started…", never "Closed".
 */
export function dateChip(o: { date: string | null; label: string; event?: boolean; endDate?: string | null }, now = new Date()): DateChipInfo {
  const { date, label, event, endDate } = o;
  if (!date) return { tone: "none", text: event ? "Dates TBA" : `${label}: unknown`, rel: null };
  const u = urgency(date, now);
  if (!event) return u === "past" ? { tone: "past", text: `Closed ${formatDate(date)}`, rel: null } : { tone: u, text: `${label} ${formatDate(date)}`, rel: relativeDays(date, now) };
  if (u !== "past") return { tone: u, text: `${label} ${formatDate(date)}`, rel: relativeDays(date, now) };
  if (endDate && daysUntil(endDate, now) >= 0) return { tone: "none", text: `Ongoing until ${formatDate(endDate)}`, rel: null };
  if (endDate) return { tone: "none", text: `Ended ${formatDate(endDate)}`, rel: null };
  return { tone: "none", text: `Started ${formatDate(date)}`, rel: null };
}

export function formatDate(iso: string): string {
  // Full timestamps (created_at etc.) are shown in local time; plain YYYY-MM-DD dates are calendar dates.
  if (iso.length > 10) return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function relativeDays(iso: string, now = new Date()): string {
  const n = daysUntil(iso, now);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n < 0) return `${-n}d ago`;
  return `in ${n}d`;
}

export function addDays(n: number, now = new Date()): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) + n * DAY);
  return d.toISOString().slice(0, 10);
}
