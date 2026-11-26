import { z } from "zod";
import { ICON_CHOICES } from "./icon";
import { linkProblem } from "./links";
import { ENTRY_TYPES, KINDS, type EntryType } from "./types";

/** Form → entry. Every type-specific field is optional; unknowns stay unknown (never invented). */
const opt = z
  .string()
  .trim()
  .transform((s) => (s === "" ? undefined : s))
  .optional();
const optUrl = opt.superRefine((v, ctx) => {
  const problem = v ? linkProblem(v) : null;
  if (problem) ctx.addIssue({ code: "custom", message: problem });
});
/** Pictures come from the fetched page, not the user, so they only need to be web links. */
const optImageUrl = opt.refine((v) => !v || /^https?:\/\/\S+$/i.test(v), "Must be a full http(s) link");
const optDate = opt.refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use YYYY-MM-DD");
const optNum = opt.refine((v) => !v || Number.isFinite(Number(v)), "Must be a number").transform((v) => (v ? Number(v) : undefined));
const triState = z.enum(["yes", "no", "unknown"]).catch("unknown");
const list = opt.transform((v) => (v ? v.split(/[,\n|]/).map((s) => s.trim()).filter(Boolean) : []));

export const EntryForm = z
  .object({
    type: z.enum(ENTRY_TYPES),
    url: optUrl,
    title: z.string().trim().min(2, "Give it a title").max(300),
    summary: opt.refine((v) => !v || v.length <= 1000, "Keep the summary under 1000 characters"),
    image_url: optImageUrl,
    favicon_url: optImageUrl,
    icon: z.enum(ICON_CHOICES).optional().catch(undefined),
    city: opt,
    country: opt,
    /** Other offices, paired by index (extra_city[i] with extra_country[i]). */
    extra_city: z.array(z.string()).default([]),
    extra_country: z.array(z.string()).default([]),
    is_remote: z.boolean().default(false),
    disciplines: z.array(z.string()).default([]),
    suggest: z.boolean().default(false),
    publish: z.boolean().default(false),
    // shared
    kind: opt,
    organisation_name: opt,
    apply_url: optUrl,
    // organisation
    hires_design_technologists: triState,
    careers_url: optUrl,
    instagram: opt,
    // program
    degree_name: opt,
    duration_months: optNum,
    mode: opt,
    deadline_round: opt,
    deadline_date: optDate,
    deadline_source_text: opt,
    portfolio_required: triState,
    scholarship_name: opt,
    scholarship_url: optUrl,
    scholarship_eligible_countries: list,
    scholarship_open_worldwide: triState,
    // job
    role_title: opt,
    employment: opt,
    work_mode: opt,
    remote_regions: list,
    visa_sponsorship: triState,
    closes_at: optDate,
    skills: list,
    // opportunity
    deadline: optDate,
    open_worldwide: triState,
    eligibility_countries: list,
    ineligible_countries: list,
    fee: opt,
    stipend_or_budget: opt,
    travel_covered: triState,
    // resource
    author: opt,
    publisher: opt,
    frequency: opt,
    is_free: triState,
    tool_name: opt,
    // event
    start_date: optDate,
    end_date: optDate,
    recurring: triState,
    venue: opt,
  })
  .superRefine((v, ctx) => {
    if (v.kind && !KINDS[v.type].values.includes(v.kind)) ctx.addIssue({ code: "custom", path: ["kind"], message: "Pick a value from the list" });
    if (v.start_date && v.end_date && v.end_date < v.start_date) ctx.addIssue({ code: "custom", path: ["end_date"], message: "Ends before it starts" });
  });

export type EntryFormValues = z.infer<typeof EntryForm>;

const yn = (v: "yes" | "no" | "unknown") => (v === "yes" ? true : v === "no" ? false : undefined);
const compact = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)));

/** Build the type-specific `data` jsonb. Linked ids are filled in by the caller. */
export function buildData(v: EntryFormValues, ctx: { organisationId?: string; toolId?: string }): Record<string, unknown> {
  return { ...typeData(v, ctx), ...(v.icon ? { icon: v.icon } : {}) };
}

function typeData(v: EntryFormValues, ctx: { organisationId?: string; toolId?: string }): Record<string, unknown> {
  const t: EntryType = v.type;
  switch (t) {
    case "organisation":
      return compact({ org_kind: v.kind, hires_design_technologists: yn(v.hires_design_technologists), careers_url: v.careers_url, instagram: v.instagram?.replace(/^@/, "") });
    case "program":
      return compact({
        program_kind: v.kind,
        institution_id: ctx.organisationId,
        degree_name: v.degree_name,
        duration_months: v.duration_months,
        mode: v.mode,
        application_deadlines: v.deadline_date ? [{ round: v.deadline_round ?? "Main round", date: v.deadline_date, source_text: v.deadline_source_text ?? null }] : [],
        portfolio_required: yn(v.portfolio_required),
        scholarships: v.scholarship_name
          ? [compact({ name: v.scholarship_name, url: v.scholarship_url ?? null, open_worldwide: yn(v.scholarship_open_worldwide), eligible_countries: v.scholarship_eligible_countries })]
          : [],
        apply_url: v.apply_url,
      });
    case "job":
      return compact({
        role_title: v.role_title ?? v.title,
        organisation_id: ctx.organisationId,
        seniority: v.kind,
        employment: v.employment,
        work_mode: v.work_mode,
        remote_regions: v.remote_regions,
        visa_sponsorship: v.visa_sponsorship,
        closes_at: v.closes_at,
        apply_url: v.apply_url ?? v.url,
        skills: v.skills,
      });
    case "opportunity":
      return compact({
        opp_kind: v.kind,
        organisation_id: ctx.organisationId,
        deadline: v.deadline,
        deadline_source_text: v.deadline ? v.deadline_source_text : undefined,
        open_worldwide: yn(v.open_worldwide),
        eligibility_countries: v.eligibility_countries,
        ineligible_countries: v.ineligible_countries,
        fee: v.fee ?? "unknown",
        stipend_or_budget: v.stipend_or_budget,
        travel_covered: yn(v.travel_covered) ?? "unknown",
        apply_url: v.apply_url ?? v.url,
      });
    case "resource":
      return compact({ resource_kind: v.kind, author: v.author, publisher: v.publisher, frequency: v.frequency, is_free: yn(v.is_free), tool_id: v.kind === "tool" ? undefined : ctx.toolId });
    case "event":
      return compact({ event_kind: v.kind, start_date: v.start_date, end_date: v.end_date, recurring: yn(v.recurring), venue: v.venue, organisation_id: ctx.organisationId });
  }
}

/** Parse a FormData submission (checkboxes → booleans, multi-select disciplines). */
export function formDataToObject(fd: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && k !== "disciplines") o[k] = v;
  o.disciplines = fd.getAll("disciplines").filter((x): x is string => typeof x === "string");
  o.extra_city = fd.getAll("extra_city").filter((x): x is string => typeof x === "string");
  o.extra_country = fd.getAll("extra_country").filter((x): x is string => typeof x === "string");
  for (const k of ["is_remote", "suggest", "publish"]) o[k] = fd.get(k) === "on";
  return o;
}

type FormValue = string | string[] | boolean | undefined;
const s = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : undefined);
const tri = (v: unknown) => (v === true || v === "yes" ? "yes" : v === false || v === "no" ? "no" : undefined);
const joined = (v: unknown) => (Array.isArray(v) && v.length ? v.join(", ") : undefined);

/** Inverse of buildData: an existing entry → the Add/Edit form's field values. */
export function entryToFormValues(e: { type: EntryType; title: string; summary: string | null; url: string | null; city: string | null; country: string | null; is_remote: boolean; disciplines: string[]; data: Record<string, unknown> }, linkedOrgName?: string, linkedToolName?: string): Record<string, FormValue> {
  const d = e.data ?? {};
  const kindField = KINDS[e.type].field;
  const base: Record<string, FormValue> = {
    type: e.type,
    title: e.title,
    summary: e.summary ?? undefined,
    url: e.url ?? undefined,
    city: e.city ?? undefined,
    country: e.country ?? undefined,
    is_remote: e.is_remote,
    disciplines: e.disciplines,
    extra_city: Array.isArray(d.locations) ? (d.locations as { city?: string }[]).map((l) => l?.city ?? "") : undefined,
    extra_country: Array.isArray(d.locations) ? (d.locations as { country?: string }[]).map((l) => l?.country ?? "") : undefined,
    icon: s(d.icon),
    kind: s(d[kindField]) === "mfa" ? "masters" : s(d[kindField]),
    organisation_name: linkedOrgName,
    apply_url: s(d.apply_url) !== (e.url ?? undefined) ? s(d.apply_url) : undefined,
  };
  switch (e.type) {
    case "organisation":
      return { ...base, hires_design_technologists: tri(d.hires_design_technologists), careers_url: s(d.careers_url), instagram: s(d.instagram) };
    case "program": {
      const round = (Array.isArray(d.application_deadlines) ? d.application_deadlines[0] : undefined) as { round?: string; date?: string; source_text?: string } | undefined;
      const sch = (Array.isArray(d.scholarships) ? d.scholarships[0] : undefined) as { name?: string; url?: string; open_worldwide?: boolean; eligible_countries?: string[] } | undefined;
      return {
        ...base,
        degree_name: s(d.degree_name),
        duration_months: s(d.duration_months),
        mode: s(d.mode),
        portfolio_required: tri(d.portfolio_required),
        deadline_round: round?.round,
        deadline_date: round?.date,
        deadline_source_text: round?.source_text ?? undefined,
        scholarship_name: sch?.name,
        scholarship_url: sch?.url ?? undefined,
        scholarship_open_worldwide: tri(sch?.open_worldwide),
        scholarship_eligible_countries: joined(sch?.eligible_countries),
      };
    }
    case "job": {
      return {
        ...base,
        role_title: s(d.role_title) !== e.title ? s(d.role_title) : undefined,
        employment: s(d.employment),
        work_mode: s(d.work_mode),
        remote_regions: joined(d.remote_regions),
        visa_sponsorship: tri(d.visa_sponsorship),
        closes_at: s(d.closes_at),
        skills: joined(d.skills),
      };
    }
    case "opportunity":
      return {
        ...base,
        deadline: s(d.deadline),
        deadline_source_text: s(d.deadline_source_text),
        open_worldwide: tri(d.open_worldwide),
        eligibility_countries: joined(d.eligibility_countries),
        ineligible_countries: joined(d.ineligible_countries),
        fee: d.fee === "unknown" ? undefined : s(d.fee),
        stipend_or_budget: s(d.stipend_or_budget),
        travel_covered: tri(d.travel_covered),
      };
    case "resource":
      return { ...base, author: s(d.author), publisher: s(d.publisher), frequency: s(d.frequency), is_free: tri(d.is_free), tool_name: linkedToolName };
    case "event":
      return { ...base, start_date: s(d.start_date), end_date: s(d.end_date), venue: s(d.venue), recurring: tri(d.recurring) };
  }
}

/** The extra (city, country) pairs typed into the form, blanks dropped and duplicates removed. */
export function extraPlaces(v: Pick<EntryFormValues, "extra_city" | "extra_country" | "city" | "country">): { city?: string; country?: string }[] {
  const seen = new Set([`${(v.city ?? "").toLowerCase()}|${(v.country ?? "").toLowerCase()}`]);
  const out: { city?: string; country?: string }[] = [];
  const n = Math.max(v.extra_city.length, v.extra_country.length);
  for (let i = 0; i < n; i++) {
    const city = v.extra_city[i]?.trim() || undefined;
    const country = v.extra_country[i]?.trim() || undefined;
    const key = `${(city ?? "").toLowerCase()}|${(country ?? "").toLowerCase()}`;
    if ((!city && !country) || seen.has(key)) continue;
    seen.add(key);
    out.push({ city, country });
  }
  return out.slice(0, 20);
}

/** data keys the form owns per type; anything else already stored (e.g. notable_projects) is kept on edit. */
export const FORM_DATA_KEYS: Record<EntryType, string[]> = {
  organisation: ["locations", "icon", "org_kind", "hires_design_technologists", "careers_url", "instagram"],
  program: ["locations", "icon", "program_kind", "institution_id", "degree_name", "duration_months", "mode", "portfolio_required", "apply_url"],
  job: ["locations", "icon", "role_title", "organisation_id", "seniority", "employment", "work_mode", "remote_regions", "visa_sponsorship", "closes_at", "apply_url", "skills"],
  opportunity: ["locations", "icon", "opp_kind", "organisation_id", "deadline", "deadline_source_text", "open_worldwide", "eligibility_countries", "ineligible_countries", "fee", "stipend_or_budget", "travel_covered", "apply_url"],
  resource: ["locations", "icon", "resource_kind", "author", "publisher", "frequency", "is_free", "tool_id"],
  event: ["locations", "icon", "event_kind", "start_date", "end_date", "recurring", "venue", "organisation_id"],
};

/** Merge a form edit into stored data: replace form-owned keys, keep the rest (and extra programme rounds/scholarships). */
export function mergeData(type: EntryType, oldType: EntryType, oldData: Record<string, unknown>, fresh: Record<string, unknown>): Record<string, unknown> {
  if (type !== oldType) return fresh;
  const kept = Object.fromEntries(Object.entries(oldData).filter(([k]) => !FORM_DATA_KEYS[type].includes(k)));
  if (type === "program") {
    for (const k of ["application_deadlines", "scholarships"] as const) {
      const rest = Array.isArray(oldData[k]) ? (oldData[k] as unknown[]).slice(1) : [];
      const first = Array.isArray(fresh[k]) ? (fresh[k] as unknown[]) : [];
      kept[k] = [...first, ...rest];
      delete fresh[k];
    }
  }
  return { ...kept, ...fresh };
}
