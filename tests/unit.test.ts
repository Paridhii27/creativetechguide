import { describe, expect, it } from "vitest";
import { daysUntil, urgency, addDays } from "@/lib/dates";
import { parseFilters, withParams } from "@/lib/filters";
import { approxIn, convert, formatInr, formatMoney, toInr } from "@/lib/money";
import { GLOBAL_LENS, buildLens, parseLensSlug, relevanceBadge, slugify } from "@/lib/lens";
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

describe("money", () => {
  it("converts and formats rupees", () => {
    expect(toInr({ amount: 100, currency: "gbp" }, { GBP: 107 })).toBe(10700);
    expect(toInr({ amount: 100, currency: "XYZ" }, {})).toBeNull();
    expect(formatInr(2_568_000)).toBe("₹25.7L");
    expect(formatInr(12_000_000)).toBe("₹1.2Cr");
    expect(formatInr(45_000)).toBe("₹45,000");
  });
  it("converts between any two currencies via INR", () => {
    const fx = { INR: 1, EUR: 100, BRL: 16 };
    expect(convert({ amount: 16, currency: "BRL" }, "EUR", fx)).toBeCloseTo(2.56);
    expect(convert({ amount: 1, currency: "XYZ" }, "EUR", fx)).toBeNull();
    expect(approxIn({ amount: 20000, currency: "EUR" }, "BRL", fx)).toMatch(/^≈R\$125,000$/);
    expect(approxIn({ amount: 1, currency: "EUR" }, "EUR", fx)).toBeNull();
    expect(approxIn({ amount: 1, currency: "EUR" }, null, fx)).toBeNull();
    expect(formatMoney({ amount: 2_568_000, currency: "INR" })).toBe("₹25.7L");
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
