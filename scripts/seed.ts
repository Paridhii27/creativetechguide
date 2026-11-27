/**
 * Seed the catalogue from seed/*.csv.
 *   npm run seed            real entries + taxonomy
 *   npm run seed -- --demo  also load seed/demo/*.csv (clearly labelled fake jobs/calls/programmes with dates)
 * Idempotent: public entries are matched on url and updated.
 */
import { config } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { createAdminClient } from "../lib/supabase/admin";
import { addDays } from "../lib/dates";
import { slugify } from "../lib/lens";

config({ path: ".env.local" });

const SEED = path.join(process.cwd(), "seed");
const demo = process.argv.includes("--demo");
const db = createAdminClient();

type Row = Record<string, string>;
const read = (file: string): Row[] => {
  const p = path.join(SEED, file);
  return existsSync(p) ? parse(readFileSync(p), { columns: true, skip_empty_lines: true, trim: true }) : [];
};
const str = (v?: string) => (v ? v : null);
const bool = (v?: string) => (v === "true" ? true : v === "false" ? false : null);
const num = (v?: string) => (v ? Number(v) : null);
const list = (v?: string) => (v ? v.split("|").map((s) => s.trim()).filter(Boolean) : []);
const triState = (v?: string) => (v === "yes" || v === "no" ? v : "unknown");
const compact = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)));

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function main() {
  // Taxonomy
  await must(db.from("disciplines").upsert(read("disciplines.csv").map((r) => ({ slug: r.slug, label: r.label, sort_order: Number(r.sort_order) })), { onConflict: "slug" }), "disciplines");
  const regions = read("regions.csv").map((r) => ({ slug: r.slug, name: r.name, also_matches: list(r.also_matches), sort_order: Number(r.sort_order) }));
  await must(db.from("regions").upsert(regions, { onConflict: "slug" }), "regions");
  const countries = read("countries.csv").map((r) => ({ code: r.code, slug: slugify(r.name), name: r.name, region: r.region, currency: str(r.currency), groups: list(r.groups) }));
  await must(db.from("countries").upsert(countries, { onConflict: "code" }), "countries");
  const places = read("places.csv").map((r) => ({ city: r.city, state: str(r.state), country: r.country, region: r.region, lat: num(r.lat), lng: num(r.lng) }));
  await must(db.from("places").upsert(places, { onConflict: "city,country" }), "places");
  console.log(`taxonomy: ${regions.length} regions, ${countries.length} countries, ${places.length} places`);

  const geo = (city?: string, country?: string) => {
    const p = places.find((x) => x.city === city && (!country || x.country === country));
    return { city: str(city), state: p?.state ?? null, country: str(country) ?? p?.country ?? null, region: p?.region ?? null, lat: p?.lat ?? null, lng: p?.lng ?? null };
  };

  const orgIds = new Map<string, string>();

  async function upsertEntry(e: Record<string, unknown>): Promise<string> {
    const row: Record<string, unknown> = { visibility: "public", status: "approved", source: "manual", owner_id: null, ...e };
    const existing = await must(db.from("entries").select("id").eq("url", String(row.url)).eq("visibility", "public").maybeSingle(), "lookup");
    if (existing) {
      await must(db.from("entries").update(row).eq("id", existing.id), `update ${row.title}`);
      return existing.id;
    }
    const inserted = await must(db.from("entries").insert(row).select("id").single(), `insert ${row.title}`);
    return inserted!.id;
  }

  // Organisations first so others can link to them.
  const orgs = read("organisations.csv");
  for (const r of orgs) {
    const id = await upsertEntry({
      type: "organisation", title: r.title, url: r.url, summary: str(r.summary), is_remote: bool(r.is_remote) ?? false,
      disciplines: list(r.disciplines), ...geo(r.city, r.country),
      data: compact({ org_kind: str(r.org_kind), hires_design_technologists: bool(r.hires_design_technologists), careers_url: str(r.careers_url), instagram: str(r.instagram) }),
    });
    orgIds.set(r.title, id);
  }

  async function demoOrg(name: string, city: string, country: string): Promise<string> {
    if (orgIds.has(name)) return orgIds.get(name)!;
    const id = await upsertEntry({
      type: "organisation", title: `[Demo] ${name}`, url: `https://example.com/demo/orgs/${name.toLowerCase().replace(/\W+/g, "-")}`,
      summary: "Demo organisation for development. Not real.", disciplines: ["creative-coding"], ...geo(city, country),
      data: { org_kind: "studio", hires_design_technologists: true },
    });
    orgIds.set(name, id);
    return id;
  }

  const programs = read("programs.csv");
  for (const r of programs) {
    await upsertEntry({
      type: "program", title: r.title, url: r.url, summary: str(r.summary), is_remote: bool(r.is_remote) ?? false,
      disciplines: list(r.disciplines), ...geo(r.city, r.country),
      data: compact({
        program_kind: str(r.program_kind), institution_id: orgIds.get(r.institution) ?? null, degree_name: str(r.degree_name),
        duration_months: num(r.duration_months), mode: str(r.mode), portfolio_required: bool(r.portfolio_required),
        curriculum_tags: list(r.curriculum_tags), application_deadlines: r.deadline ? [{ round: "Last day to apply", date: r.deadline, source_text: str(r.deadline_source_text) }] : [], scholarships: [],
      }),
    });
  }

  const resources = read("resources.csv");
  for (const r of resources) {
    await upsertEntry({
      type: "resource", title: r.title, url: r.url, summary: str(r.summary), is_remote: bool(r.is_remote) ?? false,
      disciplines: list(r.disciplines), ...geo(r.city, r.country),
      data: compact({ resource_kind: str(r.resource_kind), author: str(r.author), publisher: str(r.publisher), frequency: str(r.frequency), is_free: bool(r.is_free) }),
    });
  }

  const events = read("events.csv");
  for (const r of events) {
    await upsertEntry({
      type: "event", title: r.title, url: r.url, summary: str(r.summary), is_remote: bool(r.is_remote) ?? false,
      disciplines: list(r.disciplines), ...geo(r.city, r.country),
      data: compact({ event_kind: str(r.event_kind), start_date: str(r.start_date), end_date: str(r.end_date), recurring: bool(r.recurring), venue: str(r.venue), organisation_id: orgIds.get(r.organisation) ?? null }),
    });
  }

  const opps = read("opportunities.csv");
  for (const r of opps) {
    await upsertEntry({
      type: "opportunity", title: r.title, url: r.url, summary: str(r.summary), is_remote: bool(r.is_remote) ?? false,
      disciplines: list(r.disciplines), ...geo(r.city, r.country),
      data: compact({
        opp_kind: str(r.opp_kind), organisation_id: orgIds.get(r.organisation) ?? null, open_worldwide: bool(r.open_worldwide),
        eligibility_countries: list(r.eligibility_countries), ineligible_countries: list(r.ineligible_countries),
        fee: str(r.fee) ?? "unknown", travel_covered: "unknown", apply_url: r.url,
        // Only filled when the organiser's page states it; deadline_source_text is the verbatim sentence.
        deadline: str(r.deadline), deadline_source_text: str(r.deadline_source_text), stipend_or_budget: str(r.stipend_or_budget),
      }),
    });
  }
  // Real job listings, verified on the employer's own job board. Dates are left empty unless the posting states them.
  const jobs = read("jobs.csv");
  for (const r of jobs) {
    await upsertEntry({
      type: "job", title: r.title, url: r.url, summary: str(r.summary), is_remote: bool(r.is_remote) ?? false, disciplines: list(r.disciplines), ...geo(r.city, r.country),
      data: compact({
        role_title: str(r.role_title), organisation_id: orgIds.get(r.organisation) ?? null, seniority: str(r.seniority), employment: str(r.employment),
        work_mode: str(r.work_mode), remote_regions: list(r.remote_regions), visa_sponsorship: triState(r.visa_sponsorship),
        posted_at: str(r.posted_at), closes_at: str(r.closes_at), apply_url: r.url, skills: list(r.skills),
      }),
    });
  }
  console.log(`entries: ${orgs.length} orgs, ${programs.length} programmes, ${resources.length} resources, ${events.length} events, ${opps.length} open calls, ${jobs.length} jobs`);

  if (!demo) return;

  // ── Demo data: fake, clearly labelled, with deadlines relative to today so urgency colours can be checked.
  const djobs = read("demo/jobs.csv");
  for (const r of djobs) {
    const orgId = await demoOrg(r.organisation, r.city, r.country);
    await upsertEntry({
      type: "job", title: r.title, url: r.url, summary: r.summary, is_remote: bool(r.is_remote) ?? false, disciplines: list(r.disciplines), ...geo(r.city, r.country),
      data: compact({
        role_title: r.role_title, organisation_id: orgId, seniority: r.seniority, employment: r.employment, work_mode: r.work_mode,
        remote_regions: list(r.remote_regions), visa_sponsorship: triState(r.visa_sponsorship),
        posted_at: addDays(-3), closes_at: addDays(Number(r.closes_in_days)), apply_url: r.url, skills: list(r.skills),
      }),
    });
  }
  const dopps = read("demo/opportunities.csv");
  for (const r of dopps) {
    await upsertEntry({
      type: "opportunity", title: r.title, url: r.url, summary: r.summary, is_remote: bool(r.is_remote) ?? false, disciplines: ["installation"], ...geo(r.city, r.country),
      data: compact({
        opp_kind: r.opp_kind, deadline: addDays(Number(r.closes_in_days)), deadline_source_text: r.deadline_source_text,
        open_worldwide: bool(r.open_worldwide), eligibility_countries: list(r.eligibility_countries),
        fee: r.fee || "unknown", stipend_or_budget: str(r.stipend_or_budget), travel_covered: bool(r.travel_covered) ?? "unknown", apply_url: r.url,
      }),
    });
  }
  const dprogs = read("demo/programs.csv");
  for (const r of dprogs) {
    await upsertEntry({
      type: "program", title: r.title, url: r.url, summary: r.summary, is_remote: bool(r.is_remote) ?? false, disciplines: list(r.disciplines), ...geo(r.city, r.country),
      data: compact({
        program_kind: r.program_kind, degree_name: str(r.degree_name), duration_months: num(r.duration_months), mode: r.mode,
        portfolio_required: bool(r.portfolio_required),
        application_deadlines: [{ round: r.deadline_round, date: addDays(Number(r.deadline_in_days)), source_text: `Demo: ${r.deadline_round} closes in ${r.deadline_in_days} days.` }],
        scholarships: r.scholarship_name ? [compact({ name: r.scholarship_name, url: r.url, eligible_countries: list(r.scholarship_eligible_countries), open_worldwide: bool(r.scholarship_open_worldwide) })] : [],
      }),
    });
  }
  console.log(`demo: ${djobs.length} jobs, ${dopps.length} open calls, ${dprogs.length} programmes`);
}

main()
  .then(() => console.log("seed complete"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
