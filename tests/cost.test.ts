import { describe, expect, it } from "vitest";
import { costLine } from "@/lib/cost";
import { GLOBAL_LENS } from "@/lib/lens";
import type { Entry, Lens } from "@/lib/types";

const job = (salary: unknown) => ({ type: "job", data: { salary } }) as unknown as Entry;
const INDIA: Lens = { kind: "country", slug: "india", label: "India", currency: "INR", homeCountries: ["india"], homeRegion: null, terms: ["india"] };
const fx = { INR: 1, EUR: 90 };

describe("costLine (job salary)", () => {
  it("shows the original range and period in the Global lens", () => {
    expect(costLine(job({ min: 40000, max: 50000, currency: "EUR", period: "year" }), GLOBAL_LENS, fx)).toBe("€40,000–€50,000 / year");
  });
  it("adds an approximate lens-currency conversion in a country lens", () => {
    const s = costLine(job({ min: 40000, max: 50000, currency: "EUR", period: "year" }), INDIA, fx)!;
    expect(s.startsWith("€40,000–€50,000 / year · ")).toBe(true);
  });
  it("returns null without a salary", () => {
    expect(costLine(job(null), GLOBAL_LENS, fx)).toBeNull();
  });
});
