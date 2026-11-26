import { describe, expect, it } from "vitest";
import { parseHtml } from "@/lib/unfurl";
import { findDeadline, parseDateText, suggestDisciplines, suggestionsToFormValues } from "@/lib/extract";
import { EntryForm, buildData, entryToFormValues, extraPlaces, formDataToObject, mergeData } from "@/lib/entry-input";
import { dateChip } from "@/lib/dates";
import { defaultIconChoice, entryIconUrl } from "@/lib/icon";
import { countryForCity, extraPlaceNames, locationLabel, placeName } from "@/lib/places";

describe("extractSuggestions via parseHtml", () => {
  it("reads an article's author and publisher, and leaves the rest out", () => {
    const html = `<head><title>On light</title><meta property="og:type" content="article"><meta property="og:site_name" content="Creative Applications">
      <meta name="author" content="Filip Visnjic"></head><body>Projection mapping and TouchDesigner.</body>`;
    const s = parseHtml(html, "https://example.org/on-light").suggested;
    expect(s).toMatchObject({ type: "resource", kind: "article", author: "Filip Visnjic", publisher: "Creative Applications" });
    expect(s.disciplines).toEqual(expect.arrayContaining(["creative-coding", "projection-mapping"]));
    expect(Object.values(s)).not.toContain("unknown");
    expect(s).not.toHaveProperty("is_free");
  });

  it("reads a JSON-LD event with dates and location", () => {
    const ld = { "@context": "https://schema.org", "@type": "Festival", name: "Ars", startDate: "2027-09-03T10:00", endDate: "2027-09-07", location: { "@type": "Place", name: "POSTCITY", address: { addressLocality: "Linz", addressCountry: "AT" } } };
    const s = parseHtml(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`, "https://ars.example/").suggested;
    expect(s).toMatchObject({ type: "event", kind: "festival", start_date: "2027-09-03", end_date: "2027-09-07", city: "Linz", country: "Austria", venue: "POSTCITY" });
  });

  it("reads a JSON-LD job posting inside @graph", () => {
    const ld = { "@graph": [{ "@type": "Organization", name: "Studio" }, { "@type": "JobPosting", title: "Creative Technologist", hiringOrganization: { name: "Studio X" }, employmentType: "FULL_TIME", validThrough: "2027-01-31", jobLocationType: "TELECOMMUTE" }] };
    const s = parseHtml(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`, "https://x.example/jobs/1").suggested;
    expect(s).toMatchObject({ type: "job", role_title: "Creative Technologist", organisation_name: "Studio X", employment: "full_time", deadline: "2027-01-31", is_remote: true });
    expect(suggestionsToFormValues(s)).toMatchObject({ closes_at: "2027-01-31", is_remote: true });
  });

  it("finds a deadline sentence on an open call and keeps the exact wording", () => {
    const s = parseHtml(`<title>Open call: Light residency</title><p>About the residency.</p><p>The deadline for applications is 15 January 2027. Good luck!</p>`, "https://x.org/call").suggested;
    expect(s).toMatchObject({ type: "opportunity", kind: "residency", deadline: "2027-01-15", deadline_source_text: "The deadline for applications is 15 January 2027." });
  });
});

describe("date chip", () => {
  const now = new Date(2026, 10, 23); // 23 Nov 2026
  it("a passed deadline is Closed", () => {
    expect(dateChip({ date: "2026-11-01", label: "Deadline" }, now)).toMatchObject({ tone: "past", text: "Closed 1 Nov 2026" });
    expect(dateChip({ date: "2026-11-01", label: "Closes" }, now).text).toBe("Closed 1 Nov 2026");
  });
  it("an upcoming deadline counts down", () => {
    expect(dateChip({ date: "2026-11-25", label: "Deadline" }, now)).toMatchObject({ tone: "week", text: "Deadline 25 Nov 2026", rel: "in 2d" });
  });
  it("an event that already started is never 'Closed'", () => {
    expect(dateChip({ date: "2026-11-01", label: "Starts", event: true }, now)).toMatchObject({ tone: "none", text: "Started 1 Nov 2026" });
    expect(dateChip({ date: "2026-11-01", label: "Starts", event: true, endDate: "2026-11-05" }, now).text).toBe("Ended 5 Nov 2026");
    expect(dateChip({ date: "2026-11-20", label: "Starts", event: true, endDate: "2026-11-27" }, now).text).toBe("Ongoing until 27 Nov 2026");
  });
  it("an upcoming event says when it starts; no date says TBA", () => {
    expect(dateChip({ date: "2027-03-01", label: "Starts", event: true }, now)).toMatchObject({ tone: "later", text: "Starts 1 Mar 2027" });
    expect(dateChip({ date: null, label: "Starts", event: true }, now).text).toBe("Dates TBA");
    expect(dateChip({ date: null, label: "Deadline" }, now).text).toBe("Deadline: unknown");
  });
});

describe("entry picture", () => {
  const e = (data: Record<string, unknown>, type: "organisation" | "resource" = "organisation") => ({ type, favicon_url: "https://x.org/fav.ico", image_url: "https://x.org/og.jpg", data });
  it("follows the owner's choice", () => {
    expect(entryIconUrl(e({ icon: "favicon" }))).toBe("https://x.org/fav.ico");
    expect(entryIconUrl(e({ icon: "image" }))).toBe("https://x.org/og.jpg");
    expect(entryIconUrl(e({ icon: "letter" }))).toBeNull();
  });
  it("keeps the old behaviour when nothing was chosen", () => {
    expect(entryIconUrl(e({}))).toBe("https://x.org/fav.ico");
    expect(entryIconUrl({ ...e({}), favicon_url: null }, { card: true })).toBe("https://x.org/og.jpg");
    expect(entryIconUrl({ ...e({}, "resource"), favicon_url: null }, { card: true })).toBeNull();
  });
  it("a chosen picture the link doesn't have falls back to the letter", () => {
    expect(entryIconUrl({ ...e({ icon: "image" }), image_url: null })).toBeNull();
  });
  it("preselects the saved choice, else favicon, image, letter", () => {
    expect(defaultIconChoice("letter", "f", "i")).toBe("letter");
    expect(defaultIconChoice(undefined, "f", "i")).toBe("favicon");
    expect(defaultIconChoice(undefined, null, "i")).toBe("image");
    expect(defaultIconChoice(undefined, null, null)).toBe("letter");
    expect(defaultIconChoice("bogus", "f", null)).toBe("favicon");
  });
  it("is saved with the entry and replaced on edit", () => {
    const f = new FormData();
    f.append("type", "organisation");
    f.append("title", "Studio");
    f.append("icon", "letter");
    const v = EntryForm.parse(formDataToObject(f));
    expect(buildData(v, {})).toMatchObject({ icon: "letter" });
    expect(mergeData("organisation", "organisation", { icon: "favicon", org_kind: "studio" }, { icon: "letter" })).toEqual({ icon: "letter" });
    expect(entryToFormValues({ type: "organisation", title: "S", summary: null, url: null, city: null, country: null, is_remote: false, disciplines: [], data: { icon: "image" } }).icon).toBe("image");
  });
});

describe("city → country autofill", () => {
  const places = [
    { city: "Linz", country: "Austria" },
    { city: "Mumbai", country: "India" },
    { city: "Birmingham", country: "United Kingdom" },
    { city: "Birmingham", country: "United States" },
  ];
  it("fills the country for a known city, ignoring case and spaces", () => {
    expect(countryForCity(places, "linz")).toBe("Austria");
    expect(countryForCity(places, "  Mumbai ")).toBe("India");
  });
  it("leaves it blank for unknown, empty or ambiguous cities", () => {
    expect(countryForCity(places, "Atlantis")).toBeNull();
    expect(countryForCity(places, "")).toBeNull();
    expect(countryForCity(places, "Birmingham")).toBeNull();
  });
});

describe("several places", () => {
  const form = (pairs: [string, string][], main: { city?: string; country?: string } = {}) => {
    const f = new FormData();
    f.append("type", "organisation");
    f.append("title", "Studio");
    if (main.city) f.append("city", main.city);
    if (main.country) f.append("country", main.country);
    for (const [c, k] of pairs) {
      f.append("extra_city", c);
      f.append("extra_country", k);
    }
    return EntryForm.parse(formDataToObject(f));
  };

  it("keeps extra places in order, dropping blanks and repeats of the main place", () => {
    const v = form([["Mumbai", "India"], ["", ""], ["london", "united kingdom"], ["Mumbai", "India"]], { city: "London", country: "United Kingdom" });
    expect(extraPlaces(v)).toEqual([{ city: "Mumbai", country: "India" }]);
  });

  it("round-trips through stored data and the edit form", () => {
    const locations = [{ city: "Mumbai", country: "India", region: "South Asia" }, { city: "Berlin", country: "Germany", region: "Europe" }];
    const entry = { type: "organisation" as const, title: "Studio", summary: null, url: null, city: "London", country: "United Kingdom", is_remote: false, disciplines: [], data: { org_kind: "studio", locations } };
    const values = entryToFormValues(entry);
    expect(values.extra_city).toEqual(["Mumbai", "Berlin"]);
    expect(values.extra_country).toEqual(["India", "Germany"]);
    // editing replaces the list; clearing it removes the key
    expect(mergeData("organisation", "organisation", entry.data, { org_kind: "studio" })).toEqual({ org_kind: "studio" });
    expect(mergeData("organisation", "organisation", entry.data, { org_kind: "studio", locations: [locations[0]] }).locations).toEqual([locations[0]]);
  });

  it("labels: main place plus a count on cards, every place on the entry page", () => {
    const e = { city: "London", country: "United Kingdom", is_remote: false, data: { locations: [{ city: "Mumbai", country: "India" }, { city: "Berlin", country: "Germany" }] } };
    expect(extraPlaceNames(e)).toEqual(["Mumbai, India", "Berlin, Germany"]);
    expect(locationLabel(e)).toBe("London, United Kingdom +2 more");
    expect(locationLabel(e, { all: true })).toBe("London, United Kingdom · Mumbai, India · Berlin, Germany");
    expect(locationLabel({ city: null, country: null, is_remote: false })).toBe("Location unknown");
  });
});

describe("production design discipline", () => {
  it("is suggested for set and show design, not for producing or managing", () => {
    expect(suggestDisciplines("Production designer for stage design on touring shows")).toEqual(["production"]);
    expect(suggestDisciplines("Producer and project manager for the studio")).toEqual([]);
  });
});

describe("role disciplines", () => {
  it("recognises product, UI/UX and motion roles from a job page", () => {
    const s = parseHtml("<title>Senior UI/UX Designer, Product Design team</title><p>Motion graphics and Figma.</p>", "https://x.example/jobs/9").suggested;
    expect(s.disciplines).toEqual(expect.arrayContaining(["ui-ux-design", "product-design", "motion-design"]));
  });
});

describe("programme level", () => {
  it("files an MFA under Masters", () => {
    const s = parseHtml("<title>MFA Design Media Arts</title>", "https://dma.example.edu/").suggested;
    expect(s).toMatchObject({ type: "program", kind: "masters" });
  });
  it("shows a legacy mfa entry as Masters in the edit form", () => {
    const v = entryToFormValues({ type: "program", title: "MFA X", summary: null, url: null, city: null, country: null, is_remote: false, disciplines: [], data: { program_kind: "mfa" } });
    expect(v.kind).toBe("masters");
  });
});

describe("date parsing", () => {
  it.each([
    ["Apply by March 3rd, 2027", "2027-03-03"],
    ["closes 2027-02-01", "2027-02-01"],
    ["Deadline: 1 Sept 2027", "2027-09-01"],
  ])("%s", (t, d) => expect(parseDateText(t)).toBe(d));
  it("ignores dates without a year or deadline wording", () => {
    expect(findDeadline("Deadline: 15 January. Founded 12 May 2020.")).toBeNull();
  });
});

describe("edit round trip", () => {
  const fd = (o: Record<string, string | string[] | boolean | undefined>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) {
      if (v === undefined || v === false) continue;
      if (v === true) f.append(k, "on");
      else for (const x of [v].flat()) f.append(k, x);
    }
    return formDataToObject(f);
  };

  it("turns stored data back into the same form values", () => {
    const entry = { type: "opportunity" as const, title: "Light", summary: null, url: "https://x.org/c", city: "Linz", country: "Austria", is_remote: false, disciplines: ["installation"],
      data: { opp_kind: "residency", deadline: "2027-01-15", deadline_source_text: "Apply by 15 Jan 2027", fee: "unknown", travel_covered: "unknown", apply_url: "https://x.org/c", eligibility_countries: ["EU"] } };
    const values = entryToFormValues(entry);
    expect(values).toMatchObject({ kind: "residency", deadline: "2027-01-15", eligibility_countries: "EU", city: "Linz" });
    expect(values.fee).toBeUndefined();
    expect(values.travel_covered).toBeUndefined();
    const again = buildData(EntryForm.parse(fd(values)), {});
    expect(again).toEqual(entry.data);
  });

  it("keeps data the form doesn't manage, and extra programme rounds", () => {
    const old = { program_kind: "masters", notable_alumni_or_faculty: ["A"], application_deadlines: [{ round: "R1", date: "2027-01-01" }, { round: "R2", date: "2027-03-01" }] };
    const fresh = { program_kind: "phd", application_deadlines: [{ round: "R1", date: "2027-01-10", source_text: null }], scholarships: [] };
    const merged = mergeData("program", "program", old, { ...fresh });
    expect(merged).toMatchObject({ program_kind: "phd", notable_alumni_or_faculty: ["A"] });
    expect(merged.application_deadlines).toEqual([{ round: "R1", date: "2027-01-10", source_text: null }, { round: "R2", date: "2027-03-01" }]);
  });
});

describe("placeName", () => {
  it("names a place once when the city and country or region match", () => {
    expect(placeName("Hong Kong", "Hong Kong")).toBe("Hong Kong");
    expect(placeName("Taipei", "Taiwan")).toBe("Taipei, Taiwan");
    expect(placeName(null, "Singapore")).toBe("Singapore");
  });
});
