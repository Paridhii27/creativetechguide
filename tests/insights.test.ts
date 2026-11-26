import { describe, expect, it } from "vitest";
import { layerInsights } from "@/lib/insights";
import { GLOBAL_LENS } from "@/lib/lens";
import type { Entry, Lens } from "@/lib/types";

const now = new Date(2026, 10, 26); // 26 Nov 2026, local

const entry = (over: Partial<Entry>): Entry =>
  ({ id: "x", type: "organisation", title: "X", country: null, region: null, is_remote: false, disciplines: [], key_date: null, data: {}, ...over }) as Entry;

const INDIA: Lens = {
  kind: "country",
  slug: "india",
  label: "India",
  currency: "INR",
  homeCountries: ["india"],
  homeRegion: null,
  terms: ["india", "in", "south asia", "worldwide"],
};

describe("layerInsights", () => {
  it("handles an empty layer", () => {
    const i = layerInsights([], GLOBAL_LENS, now);
    expect([i.total, i.upcoming.length, i.bySection.length, i.relevance]).toEqual([0, 0, 0, null]);
  });

  it("lists upcoming dates soonest first and splits the next 30 days into deadlines and events", () => {
    const i = layerInsights(
      [
        entry({ title: "later", type: "opportunity", key_date: "2027-03-01" }),
        entry({ title: "past", type: "job", key_date: "2026-11-25" }),
        entry({ title: "event", type: "event", key_date: "2026-12-01" }),
        entry({ title: "today", type: "job", key_date: "2026-11-26" }),
      ],
      GLOBAL_LENS,
      now,
    );
    expect(i.upcoming.map((e) => e.title)).toEqual(["today", "event", "later"]);
    expect([i.deadlinesIn30, i.eventsIn30]).toEqual([1, 1]);
  });

  it("counts sections (tools apart), and each discipline, country and job skill once per entry", () => {
    const i = layerInsights(
      [
        entry({ type: "resource", data: { resource_kind: "tool" }, disciplines: ["ai"] }),
        entry({ type: "job", country: "India", is_remote: true, disciplines: ["ai", "ai"], data: { skills: ["Unity", "unity", "p5.js"] } }),
        entry({ country: "India", data: { locations: [{ country: "India" }, { country: "Japan" }] } }),
        entry({ type: "program", data: { skills: ["Unreal"] } }),
      ],
      GLOBAL_LENS,
      now,
    );
    expect(i.bySection.map((x) => [x.section.slug, x.count])).toEqual([
      ["studios", 1],
      ["programmes", 1],
      ["jobs", 1],
      ["tools", 1],
    ]);
    expect(i.disciplines).toEqual([{ key: "ai", count: 2 }]);
    expect(i.countries).toEqual([
      { key: "India", count: 2 },
      { key: "Japan", count: 1 },
    ]);
    expect(i.skills.map((s) => [s.key.toLowerCase(), s.count])).toEqual([
      ["p5.js", 1],
      ["unity", 1],
    ]);
    expect(i.remote).toBe(1);
  });

  it("counts every entry in the layer, published or not", () => {
    const states = [
      ["private", "draft"],
      ["private", "pending_review"],
      ["private", "rejected"],
      ["public", "approved"],
      ["public", "archived"],
    ] as const;
    const i = layerInsights(
      states.map(([visibility, status]) => entry({ type: "resource", visibility, status, disciplines: ["ai"], country: "India" })),
      GLOBAL_LENS,
      now,
    );
    expect(i.total).toBe(5);
    expect(i.bySection.map((x) => x.count)).toEqual([5]);
    expect(i.disciplines).toEqual([{ key: "ai", count: 5 }]);
    expect(i.countries).toEqual([{ key: "India", count: 5 }]);
  });

  it("counts eligibility in a place lens", () => {
    const i = layerInsights(
      [entry({ country: "India" }), entry({ data: { open_worldwide: true } }), entry({ data: { eligibility_countries: ["Japan"] } }), entry({})],
      INDIA,
      now,
    );
    expect(i.relevance).toEqual({ based_in: 1, open_to: 1, not_open: 1, unknown: 1 });
  });
});
