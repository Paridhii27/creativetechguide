import aliases from "@/lib/place-aliases.json";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { daysUntil, urgency, addDays } from "@/lib/dates";
import { parseFilters, withParams } from "@/lib/filters";
import { GLOBAL_LENS, buildLens, parseLensSlug, relevanceBadge, slugify, findPlaceSlug } from "@/lib/lens";
import { placeRelevance } from "@/lib/relevance";
import type { PlaceLens } from "@/lib/types";
import { RELEVANCE_CASES, TEST_GEO } from "./relevance-cases";

const india = buildLens("india", TEST_GEO)!;

const NOW = new Date(2026, 10, 22); // 22 Nov 2026 local

describe("deadline urgency", () => {
  it("bands by days remaining", () => {
    expect(urgency("2026-11-21", NOW)).toBe("past");
    expect(urgency("2026-11-22", NOW)).toBe("week");
    expect(urgency("2026-11-28", NOW)).toBe("week");
    expect(urgency("2026-11-29", NOW)).toBe("month");
    expect(urgency("2026-12-21", NOW)).toBe("month");
    expect(urgency("2026-12-22", NOW)).toBe("later");
  });
  it("counts days and adds days", () => {
    expect(daysUntil("2026-12-01", NOW)).toBe(9);
    expect(addDays(10, NOW)).toBe("2026-12-02");
  });
});

describe("lens", () => {
  it("parses slugs and maps the old 'all' lens to global", () => {
    expect(parseLensSlug("india")).toBe("india");
    expect(parseLensSlug("all")).toBe("global");
    expect(parseLensSlug("INDIA")).toBeUndefined();
    expect(parseLensSlug("x; drop")).toBeUndefined();
    expect(parseLensSlug(undefined)).toBeUndefined();
  });
  it("builds country, region and global lenses from geography data", () => {
    expect(buildLens("global", TEST_GEO)).toBe(GLOBAL_LENS);
    expect(buildLens("atlantis", TEST_GEO)).toBeUndefined();
    expect(india).toMatchObject({ kind: "country", label: "India", currency: "INR", homeCountries: ["india"] });
    expect((india as PlaceLens).terms).toEqual(expect.arrayContaining(["india", "in", "south asia", "apac", "commonwealth", "worldwide"]));
    const europe = buildLens("europe", TEST_GEO) as PlaceLens;
    expect(europe).toMatchObject({ kind: "region", label: "Europe", currency: null, homeRegion: "europe" });
    expect(europe.homeCountries).toEqual(["germany", "france", "united kingdom"]);
  });
  it("labels eligibility for the chosen place", () => {
    expect(relevanceBadge("unknown", "Brazil").label).toBe("Eligibility unclear");
    expect(relevanceBadge("based_in", "Brazil").label).toBe("Based in Brazil");
    expect(relevanceBadge("open_to", "Europe").label).toBe("Open to Europe");
  });
  it("slugifies place names", () => {
    expect(slugify("Côte d'Ivoire")).toBe("cote-d-ivoire");
    expect(slugify("United Kingdom")).toBe("united-kingdom");
  });
});

describe("relevance rules", () => {
  for (const [name, slug, entry, expected] of RELEVANCE_CASES) {
    it(name, () => {
      expect(placeRelevance(entry, buildLens(slug, TEST_GEO) as PlaceLens)).toBe(expected);
    });
  }
});

describe("filters", () => {
  it("maps params per type and drops junk", () => {
    const f = parseFilters({ kind: "masters", within: "30", remote: "yes", relevance: "nope", page: "3" }, "program", india, NOW);
    expect(f).toMatchObject({ type: "program", lens: "india", programKind: "masters", remote: true, dateFrom: "2026-11-22", dateTo: "2026-12-22", offset: 80 });
    expect(f.relevance).toBeUndefined();
  });
  it("job filters", () => {
    const f = parseFilters({ kind: "senior", work_mode: "remote", visa: "yes" }, "job", GLOBAL_LENS, NOW);
    expect(f).toMatchObject({ seniority: "senior", workMode: "remote", visa: "yes" });
  });
  it("applies work mode or remote only to the sections that show them", () => {
    expect(parseFilters({ remote: "no", work_mode: "hybrid" }, "job", GLOBAL_LENS)).toMatchObject({ workMode: "hybrid" });
    expect(parseFilters({ remote: "no" }, "job", GLOBAL_LENS).remote).toBeUndefined();
    const studio = parseFilters({ remote: "no", work_mode: "hybrid" }, "organisation", GLOBAL_LENS);
    expect([studio.remote, studio.workMode]).toEqual([undefined, undefined]);
    for (const type of ["program", "opportunity", "event"] as const) {
      expect(parseFilters({ remote: "no" }, type, GLOBAL_LENS).remote).toBe(false);
      expect(parseFilters({ work_mode: "hybrid" }, type, GLOBAL_LENS).workMode).toBeUndefined();
    }
    expect(parseFilters({ remote: "yes" }, "resource", GLOBAL_LENS).remote).toBeUndefined();
  });
  it("ignores a kind that doesn't belong to the type", () => {
    expect(parseFilters({ kind: "masters" }, "event", GLOBAL_LENS).kind).toBeUndefined();
  });
  it("keeps relevance only in a place lens", () => {
    expect(parseFilters({ relevance: "open_to" }, "job", india).relevance).toBe("open_to");
    expect(parseFilters({ relevance: "open_to" }, "job", GLOBAL_LENS).relevance).toBeUndefined();
  });
  it("builds urls", () => {
    expect(withParams("/jobs", { lens: "india", page: "2" }, { page: null, kind: "mid" })).toBe("/jobs?lens=india&kind=mid");
  });
});

describe("findPlaceSlug", () => {
  const geo = {
    regions: [{ slug: "south-asia", name: "South Asia", also_matches: [] }],
    countries: [{ code: "CI", slug: "cote-d-ivoire", name: "Côte d'Ivoire", region: "Africa", currency: "XOF", groups: [] }],
  };
  it("matches a typed country or region, ignoring case and accents", () => {
    expect(findPlaceSlug("  cote d'ivoire ", geo)).toBe("cote-d-ivoire");
    expect(findPlaceSlug("South Asia", geo)).toBe("south-asia");
  });
  it("returns nothing for an empty or unknown name", () => {
    expect(findPlaceSlug("", geo)).toBeUndefined();
    expect(findPlaceSlug("Atlantis", geo)).toBeUndefined();
  });
});

describe("place data", () => {
  const rows = readFileSync("seed/countries.csv", "utf8").trim().split(/\r?\n/).slice(1).map((l) => l.split(","));
  const geo = { regions: [], countries: rows.map(([code, name, region]) => ({ code, name, region, slug: slugify(name), currency: null, groups: [] })) };
  const aliasList = Object.entries(aliases as Record<string, string[]>);
  it("has no repeated code or name", () => {
    expect(new Set(rows.map((r) => r[0])).size).toBe(rows.length);
    expect(new Set(geo.countries.map((c) => c.slug)).size).toBe(rows.length);
  });
  it("points every alternative name at exactly one listed country", () => {
    for (const [name, others] of aliasList) for (const other of others) expect(findPlaceSlug(other, geo), other).toBe(slugify(name));
  });
});
