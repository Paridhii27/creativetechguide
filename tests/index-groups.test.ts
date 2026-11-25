import { describe, expect, it } from "vitest";
import { DEFAULT_BAND_LABELS, groupByDeadline, groupByLetter } from "@/lib/index-groups";
import { GLOBAL_LENS } from "@/lib/lens";
import type { Lens } from "@/lib/types";

const now = new Date(2026, 10, 25); // 25 Nov 2026, local
const e = (key_date: string | null, country: string | null = "Germany", data: Record<string, unknown> = {}) => ({ key_date, country, region: null, is_remote: false, data });

const INDIA: Lens = {
  kind: "country",
  slug: "india",
  label: "India",
  currency: "INR",
  homeCountries: ["india"],
  homeRegion: null,
  terms: ["india", "in", "south asia", "worldwide"],
};

describe("groupByDeadline", () => {
  it("bands consecutive rows by deadline without reordering", () => {
    const rows = [e("2026-11-27"), e("2026-11-30"), e("2026-12-10"), e("2027-02-01"), e("2028-01-05"), e(null), e("2025-06-01")];
    const g = groupByDeadline(rows, GLOBAL_LENS, { now });
    expect(g.map((x) => [x.title, x.period, x.items.length])).toEqual([
      ["Closing this week", "7 days", 2],
      ["Closing this month", "30 days", 1],
      ["Upcoming", "2027", 1],
      ["Upcoming", "2028", 1],
      ["Dates to be confirmed", "", 1],
      ["Past", "2025", 1],
    ]);
    expect(g.flatMap((x) => x.items)).toEqual(rows);
  });

  it("splits by relevance bucket in a place lens", () => {
    const rows = [e("2026-11-27", "India"), e("2026-11-26", "Germany", { open_worldwide: true }), e("2026-11-28", "Germany")];
    const g = groupByDeadline(rows, INDIA, { now });
    expect(g.map((x) => x.title)).toEqual(["Based in India · closing this week", "Open to India · closing this week", "Elsewhere · closing this week"]);
  });

  it("keeps search results in one group (ranked order)", () => {
    const g = groupByDeadline([e("2027-01-01"), e("2026-11-26")], GLOBAL_LENS, { query: "light", now });
    expect(g).toHaveLength(1);
    expect(g[0].title).toBe("Matches for “light”");
  });

  it("uses type-specific labels for undated and past rows", () => {
    const g = groupByDeadline([e(null), e("2025-06-01")], GLOBAL_LENS, { now, labels: { ...DEFAULT_BAND_LABELS, undated: "No closing date", past: "Closed" } });
    expect(g.map((x) => x.title)).toEqual(["No closing date", "Closed"]);
  });

  it("puts started-but-not-ended events under the ongoing label", () => {
    const labels = { ...DEFAULT_BAND_LABELS, week: "This week", ongoing: "On now" };
    const g = groupByDeadline([e("2026-11-20", "Germany", { end_date: "2026-11-30" }), e("2026-11-01", "Germany", { end_date: "2026-11-10" })], GLOBAL_LENS, { now, labels });
    expect(g.map((x) => x.title)).toEqual(["On now", "Past"]);
  });

  it("groups alphabetical catalogues by first letter, keeping order", () => {
    const t = (title: string) => ({ ...e(null), title });
    const rows = [t("1024 Architecture"), t("Aalto"), t("ACM"), t("[Demo] Bauhaus"), t("Élan")];
    const g = groupByLetter(rows, GLOBAL_LENS, { minPerGroup: 1 });
    expect(g.map((x) => [x.period, x.items.length])).toEqual([["#", 1], ["A", 2], ["B", 1], ["E", 1]]);
    expect(g.flatMap((x) => x.items)).toEqual(rows);
  });

  it("merges sparse letters into ranges and folds a short tail back", () => {
    const t = (title: string) => ({ ...e(null), title });
    const rows = ["Arduino", "Blender", "Cinder", "Max", "Notch", "openFrameworks", "p5.js", "Processing", "TouchDesigner", "Unity"].map(t);
    const g = groupByLetter(rows, GLOBAL_LENS, { minPerGroup: 3 });
    expect(g.map((x) => [x.period, x.items.length])).toEqual([["A–C", 3], ["M–O", 3], ["P–U", 4]]);
    expect(g.flatMap((x) => x.items)).toEqual(rows);
  });
});
