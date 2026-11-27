import { sectionForEntry, type Entry } from "@/lib/types";
import { placeName } from "./places";

export const SITE_NAME = "A map of Creative Technology";
/** The shorter form used in browser tabs. */
export const TAB_NAME = "Map of Creative Technology";
export const SITE_DESCRIPTION =
  "Creative technology, experience design and design-technology work, mapped through any country or region.";

/**
 * The canonical public address, for sitemap, canonical links and Open Graph URLs (which must be
 * absolute and the same for every visitor, so not read from the request like `requestOrigin()`).
 * Set NEXT_PUBLIC_SITE_URL once you have a custom domain; until then Vercel's production domain is used.
 */
export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env && !/localhost|127\.0\.0\.1/.test(env)) return env.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return env?.replace(/\/$/, "") || "http://localhost:3000";
}

/** Only approved public entries belong in search engines; private and pending ones are noindex. */
export const isIndexable = (e: Pick<Entry, "visibility" | "status">) => e.visibility === "public" && e.status === "approved";

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const cleanTitle = (t: string) => t.replace(/^\[Demo\]\s*/, "");

function place(e: Entry) {
  if (!e.city && !e.country) return undefined;
  return {
    "@type": "Place",
    name: placeName(e.city, e.country),
    address: { "@type": "PostalAddress", addressLocality: e.city ?? undefined, addressRegion: e.state ?? undefined, addressCountry: e.country ?? undefined },
  };
}

/**
 * schema.org structured data for an entry. Only types where we have the fields Google requires
 * are given a rich type (Event needs a start date, JobPosting a posted date); everything else is
 * described as a plain Thing so it never shows up as an error in Search Console.
 */
export function entryJsonLd(e: Entry, linked: Record<string, Entry>): Record<string, unknown> {
  const d = e.data;
  const base = {
    "@context": "https://schema.org",
    name: cleanTitle(e.title),
    description: e.summary ?? undefined,
    url: `${siteUrl()}/entry/${e.id}`,
    image: e.image_url ?? undefined,
    sameAs: e.url ?? undefined,
  };
  const orgName = (id: unknown) => (typeof id === "string" && linked[id] ? cleanTitle(linked[id].title) : undefined);

  switch (e.type) {
    case "organisation":
      return { ...base, "@type": "Organization", location: place(e) };
    case "program": {
      const provider = orgName(d.institution_id);
      return { ...base, "@type": "Course", provider: provider ? { "@type": "Organization", name: provider } : undefined, inLanguage: str(d.language) };
    }
    case "event": {
      const start = str(d.start_date);
      if (!start) break;
      return {
        ...base,
        "@type": "Event",
        startDate: start,
        endDate: str(d.end_date),
        eventAttendanceMode: e.is_remote ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
        location: e.is_remote ? { "@type": "VirtualLocation", url: e.url ?? base.url } : place(e) ?? { "@type": "Place", name: str(d.venue) ?? "TBA" },
      };
    }
    case "job": {
      const posted = str(d.posted_at);
      const org = orgName(d.organisation_id);
      if (!posted || !org) break;
      return {
        ...base,
        "@type": "JobPosting",
        title: str(d.role_title) ?? base.name,
        description: e.summary ?? base.name,
        datePosted: posted,
        validThrough: str(d.closes_at),
        hiringOrganization: { "@type": "Organization", name: org },
        jobLocationType: d.work_mode === "remote" ? "TELECOMMUTE" : undefined,
        jobLocation: place(e),
        directApply: false,
      };
    }
    case "resource":
      return { ...base, "@type": "CreativeWork", author: str(d.author), publisher: str(d.publisher) };
  }
  return { ...base, "@type": "Thing", additionalType: sectionForEntry(e).singular };
}

/** Serialise JSON-LD for a <script> tag; escapes `<` so entry text can't close the tag. */
export const jsonLdScript = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
