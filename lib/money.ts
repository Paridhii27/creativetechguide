import type { Money } from "./types";

/** currency → INR per unit. INR is only the storage base; any currency in the table can be a display currency. */
export type FxTable = Record<string, number>;

export function toInr(m: Money, fx: FxTable): number | null {
  const rate = fx[m.currency.toUpperCase()];
  return rate == null ? null : m.amount * rate;
}

/** Convert between any two currencies in the table (via INR). Null when either rate is missing. */
export function convert(m: Money, to: string, fx: FxTable): number | null {
  const inr = toInr(m, fx);
  const rate = fx[to.toUpperCase()];
  return inr == null || !rate ? null : inr / rate;
}

/** Indian-style compact rupees: ₹21.8L, ₹1.2Cr, ₹45,000. */
export function formatInr(n: number): string {
  if (n >= 1e7) return `₹${trim(n / 1e7)}Cr`;
  if (n >= 1e5) return `₹${trim(n / 1e5)}L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const trim = (n: number) => (Math.round(n * 10) / 10).toString();

export function formatMoney(m: Money): string {
  if (m.currency.toUpperCase() === "INR") return formatInr(m.amount);
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: m.currency, maximumFractionDigits: 0 }).format(m.amount);
  } catch {
    return `${m.amount.toLocaleString()} ${m.currency}`;
  }
}

/** Approximate amount in the lens currency, e.g. "≈€21,000". Null when not needed or not convertible. */
export function approxIn(m: Money, to: string | null, fx: FxTable): string | null {
  if (!to || m.currency.toUpperCase() === to.toUpperCase()) return null;
  const n = convert(m, to, fx);
  if (n == null) return null;
  const rounded = n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n);
  return `≈${formatMoney({ amount: rounded, currency: to })}`;
}

export function isMoney(v: unknown): v is Money {
  return !!v && typeof v === "object" && typeof (v as Money).amount === "number" && typeof (v as Money).currency === "string";
}
