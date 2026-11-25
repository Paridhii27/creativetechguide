import { approxIn, formatMoney, isMoney, type FxTable } from "./money";
import type { Entry, Lens } from "./types";

/** Original amount first; in a country lens, an approximate conversion to that country's currency. */
export function costLine(e: Entry, lens: Lens, fx: FxTable): string | null {
  const m = e.type === "program" ? e.data.tuition : e.type === "job" ? e.data.salary : null;
  if (e.type === "job" && m && typeof m === "object") {
    const s = m as { min?: number; max?: number; currency?: string; period?: string };
    if (!s.currency || (s.min == null && s.max == null)) return null;
    const range = [s.min, s.max].filter((x): x is number => x != null);
    const per = s.period ? ` / ${s.period}` : "";
    const orig = range.map((a) => formatMoney({ amount: a, currency: s.currency! })).join("–");
    const conv = range.map((a) => approxIn({ amount: a, currency: s.currency! }, lens.currency, fx)).filter(Boolean);
    return `${orig}${per}${conv.length === range.length ? ` · ${conv.join("–")}` : ""}`;
  }
  if (!isMoney(m)) return null;
  const orig = `${formatMoney(m)}${m.per ? ` / ${m.per}` : ""}`;
  const conv = approxIn(m, lens.currency, fx);
  return conv ? `${orig} · ${conv}` : orig;
}
