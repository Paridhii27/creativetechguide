import type { Entry, Geo, Relevance } from "@/lib/types";

/** A slice of seed/countries.csv + regions.csv, enough for the cases below. */
export const TEST_GEO: Geo = {
  regions: [
    { slug: "south-asia", name: "South Asia", also_matches: ["Asia", "APAC", "Asia-Pacific", "Asia Pacific"] },
    { slug: "europe", name: "Europe", also_matches: ["EMEA"] },
    { slug: "latin-america", name: "Latin America", also_matches: ["Americas", "LATAM", "Latin America and the Caribbean"] },
    { slug: "east-asia", name: "East Asia", also_matches: ["Asia", "APAC", "Asia-Pacific", "Asia Pacific"] },
  ],
  countries: [
    { code: "IN", slug: "india", name: "India", region: "South Asia", currency: "INR", groups: ["Commonwealth", "Global South"] },
    { code: "DE", slug: "germany", name: "Germany", region: "Europe", currency: "EUR", groups: ["EU", "EEA", "Schengen"] },
    { code: "FR", slug: "france", name: "France", region: "Europe", currency: "EUR", groups: ["EU", "EEA", "Schengen"] },
    { code: "GB", slug: "united-kingdom", name: "United Kingdom", region: "Europe", currency: "GBP", groups: ["Commonwealth"] },
    { code: "BR", slug: "brazil", name: "Brazil", region: "Latin America", currency: "BRL", groups: ["South America", "Global South"] },
    { code: "JP", slug: "japan", name: "Japan", region: "East Asia", currency: "JPY", groups: [] },
  ],
};

type E = Pick<Entry, "country" | "region" | "is_remote" | "data">;
const e = (over: Partial<E>): E => ({ country: null, region: null, is_remote: false, data: {}, ...over });

/** [name, lens slug, entry, expected] */
export const RELEVANCE_CASES: [string, string, E, Relevance][] = [
  ["based in the lens country", "india", e({ country: "India", region: "South Asia" }), "based_in"],
  ["main office elsewhere but another office is in the lens country", "india", e({ country: "United Kingdom", region: "Europe", data: { locations: [{ city: "Mumbai", country: "India", region: "South Asia" }] } }), "based_in"],
  ["other office in the lens region", "europe", e({ country: "Japan", region: "East Asia", data: { locations: [{ city: "Berlin", country: "Germany", region: "Europe" }] } }), "based_in"],
  ["based in a country of the lens region", "europe", e({ country: "France", region: "Europe" }), "based_in"],
  ["remote worldwide job", "brazil", e({ country: "Germany", is_remote: true, data: { remote_regions: ["Worldwide"] } }), "open_to"],
  ["remote for the lens's wider region name", "india", e({ country: "Singapore", is_remote: true, data: { remote_regions: ["APAC"] } }), "open_to"],
  ["remote elsewhere only", "india", e({ country: "Germany", is_remote: true, data: { remote_regions: ["Europe"] } }), "not_open"],
  ["remote elsewhere only, but that's the lens region", "france", e({ country: "Germany", is_remote: true, data: { remote_regions: ["Europe"] } }), "open_to"],
  ["eligibility names the lens country", "india", e({ country: "France", data: { eligibility_countries: ["India"] } }), "open_to"],
  ["EU-only call, EU country lens", "france", e({ country: "Germany", data: { eligibility_countries: ["EU"] } }), "open_to"],
  ["EU-only call, UK lens", "united-kingdom", e({ country: "Germany", data: { eligibility_countries: ["EU"] } }), "not_open"],
  ["EU-only call, Europe lens", "europe", e({ country: "Japan", data: { eligibility_countries: ["Germany"] } }), "open_to"],
  ["open worldwide", "japan", e({ country: "Austria", data: { open_worldwide: true } }), "open_to"],
  ["visa sponsorship", "brazil", e({ country: "United Kingdom", data: { visa_sponsorship: "yes" } }), "open_to"],
  ["scholarship for the lens country", "india", e({ country: "United Kingdom", data: { scholarships: [{ name: "x", eligible_countries: ["India"] }] } }), "open_to"],
  ["scholarship for someone else", "brazil", e({ country: "United Kingdom", data: { scholarships: [{ name: "x", eligible_countries: ["India"] }] } }), "unknown"],
  ["explicitly excluded beats open worldwide", "india", e({ country: "Germany", data: { open_worldwide: true, ineligible_countries: ["India"] } }), "not_open"],
  ["restricted list without the lens", "japan", e({ country: "Germany", data: { eligibility_countries: ["Germany", "France"] } }), "not_open"],
  ["nothing known", "india", e({ country: "Japan" }), "unknown"],
];
