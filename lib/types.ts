export const ENTRY_TYPES = ["organisation", "program", "job", "opportunity", "resource", "event"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

/** How an entry relates to the place the viewer's lens is set to. */
export const RELEVANCE = ["based_in", "open_to", "not_open", "unknown"] as const;
export type Relevance = (typeof RELEVANCE)[number];

export interface Region {
  slug: string;
  name: string;
  also_matches: string[];
}

export interface Country {
  code: string;
  slug: string;
  name: string;
  region: string;
  currency: string | null;
  groups: string[];
  /** At least one public entry is based there. The lens picker lists only these; others are typed in. */
  hasEntries?: boolean;
}

export interface Geo {
  regions: Region[];
  countries: Country[];
}

/**
 * The geographic lens: Global (no place rules) or a country/region.
 * homeCountries/terms are lowercased; see lib/relevance.ts.
 */
export type Lens =
  | { kind: "global"; slug: "global"; label: "Global"; currency: null }
  | PlaceLens;

export interface PlaceLens {
  kind: "country" | "region";
  slug: string;
  label: string;
  /** Display currency for costs; null = show original currencies. */
  currency: string | null;
  homeCountries: string[];
  homeRegion: string | null;
  terms: string[];
}

export type Visibility = "public" | "private";
export type Status = "draft" | "pending_review" | "approved" | "rejected" | "archived";

export interface Entry {
  id: string;
  type: EntryType;
  title: string;
  summary: string | null;
  url: string | null;
  favicon_url: string | null;
  image_url: string | null;
  visibility: Visibility;
  status: Status;
  owner_id: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  region: string | null;
  is_remote: boolean;
  lat: number | null;
  lng: number | null;
  disciplines: string[];
  source: string;
  last_verified_at: string | null;
  key_date: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Place {
  city: string;
  state: string | null;
  country: string;
  region: string;
  lat: number | null;
  lng: number | null;
}

export interface Discipline {
  slug: string;
  label: string;
}

/** The `resource_kind` that has its own Tools section. */
export const TOOL_KIND = "tool";

export interface Section {
  slug: string;
  type: EntryType;
  label: string;
  singular: string;
  /** Only entries of this kind (Tools = resources of kind 'tool'). */
  kind?: string;
  /** Leave out entries of this kind (Publications leaves out tools). */
  excludeKind?: string;
}

/** URL sections, in nav order. Tools is a section over resources, not a separate entry type. */
export const SECTIONS: readonly Section[] = [
  { slug: "studios", type: "organisation", label: "Studios & Companies", singular: "Organisation" },
  { slug: "programmes", type: "program", label: "Programmes", singular: "Programme" },
  { slug: "jobs", type: "job", label: "Jobs", singular: "Job" },
  { slug: "open-calls", type: "opportunity", label: "Open Calls", singular: "Open call" },
  { slug: "resources", type: "resource", label: "Publications & Resources", singular: "Resource", excludeKind: TOOL_KIND },
  { slug: "tools", type: "resource", label: "Tools", singular: "Tool", kind: TOOL_KIND },
  { slug: "events", type: "event", label: "Events", singular: "Event" },
];

export const sectionForType = (t: EntryType): Section => SECTIONS.find((s) => s.type === t)!;
export const sectionForSlug = (slug: string): Section | undefined => SECTIONS.find((s) => s.slug === slug);
export const isTool = (e: { type: EntryType; data: Record<string, unknown> }) => e.type === "resource" && e.data.resource_kind === TOOL_KIND;
/** The section an entry is listed in (tools → Tools, other resources → Publications). */
export const sectionForEntry = (e: { type: EntryType; data: Record<string, unknown> }): Section =>
  isTool(e) ? SECTIONS.find((s) => s.slug === "tools")! : SECTIONS.find((s) => s.type === e.type && !s.kind)!;
/** Kinds a section's filter and the add form offer. */
export const kindsForSection = (s: Section): string[] => (s.kind ? [] : KINDS[s.type].values.filter((k) => k !== s.excludeKind));

/** Sub-kind options per type (stored in data.*_kind). */
export const KINDS: Record<EntryType, { field: string; values: string[] }> = {
  organisation: { field: "org_kind", values: ["studio", "company", "collective", "lab", "institution", "funder", "festival_org"] },
  program: { field: "program_kind", values: ["masters", "phd", "postgrad_diploma", "bachelors", "short_course", "summer_school", "online_course"] },
  job: { field: "seniority", values: ["intern", "junior", "mid", "senior", "lead"] },
  opportunity: { field: "opp_kind", values: ["open_call", "commission", "residency", "grant", "fellowship", "competition", "call_for_papers", "festival_submission"] },
  resource: { field: "resource_kind", values: ["magazine", "journal", "book", "article", "newsletter", "podcast", "talk", "tool", "library", "archive", "community", "directory"] },
  event: { field: "event_kind", values: ["festival", "conference", "exhibition", "meetup", "workshop", "hackathon", "degree_show"] },
};

export const humanize = (s: string) => s.replace(/_/g, " ").replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
