import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { SECTIONS, TOOL_KIND, type Country, type Discipline, type Entry, type EntryType, type Geo, type Place, type Region, type Relevance } from "@/lib/types";
import type { FxTable } from "@/lib/money";

export interface BrowseFilters {
  type?: EntryType;
  /** Lens slug: 'global', a country slug or a region slug. */
  lens: string;
  q?: string;
  region?: string;
  country?: string;
  city?: string;
  discipline?: string;
  remote?: boolean;
  relevance?: Relevance;
  dateFrom?: string;
  dateTo?: string;
  programKind?: string;
  seniority?: string;
  workMode?: string;
  visa?: string;
  kind?: string;
  excludeKind?: string;
  limit?: number;
  offset?: number;
  /** Also count every match (for "Page 02 of 05"). Costs a second query, so only paged lists ask. */
  withTotal?: boolean;
}

export async function browseEntries(f: BrowseFilters): Promise<{ entries: Entry[]; hasMore: boolean; total: number }> {
  if (!isSupabaseConfigured()) return { entries: [], hasMore: false, total: 0 };
  const supabase = await createClient();
  const limit = f.limit ?? 50;
  const args = {
    p_type: f.type ?? null,
    p_lens: f.lens,
    p_q: f.q || null,
    p_region: f.region ?? null,
    p_country: f.country ?? null,
    p_city: f.city ?? null,
    p_discipline: f.discipline ?? null,
    p_remote: f.remote ?? null,
    p_relevance: f.relevance ?? null,
    p_date_from: f.dateFrom ?? null,
    p_date_to: f.dateTo ?? null,
    p_program_kind: f.programKind ?? null,
    // No tuition filter in the UI (cost data isn't reliable); the SQL parameters stay unused.
    p_tuition_inr_min: null,
    p_tuition_inr_max: null,
    p_seniority: f.seniority ?? null,
    p_work_mode: f.workMode ?? null,
    p_visa: f.visa ?? null,
    p_kind: f.kind ?? null,
    // Only sent when used: needs migration 20261123000002_tools_section.
    ...(f.excludeKind ? { p_exclude_kind: f.excludeKind } : {}),
  };
  const offset = f.offset ?? 0;
  // The page itself, plus a count of every match (p_limit null = no limit; PostgREST returns one row and the exact total).
  const [{ data, error }, counted] = await Promise.all([
    supabase.rpc("browse_entries", { ...args, p_limit: limit + 1, p_offset: offset }),
    f.withTotal ? supabase.rpc("browse_entries", { ...args, p_limit: null, p_offset: 0 }, { count: "exact" }).select("id").range(0, 0) : null,
  ]);
  if (error) throw new Error(`browse_entries failed: ${error.message}`);
  const rows = (data ?? []) as Entry[];
  const hasMore = rows.length > limit;
  // If the count fails, fall back to what this page shows.
  const total = !counted || counted.error || counted.count == null ? offset + rows.length : counted.count;
  return { entries: rows.slice(0, limit), hasMore, total };
}

export async function getEntry(id: string): Promise<Entry | null> {
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("entries").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Entry | null;
}

/** Look up linked entries (e.g. a job's organisation) by id. RLS hides anything the user can't see. */
export async function getEntriesByIds(ids: string[]): Promise<Record<string, Entry>> {
  const clean = ids.filter((i) => /^[0-9a-f-]{36}$/i.test(i));
  if (!isSupabaseConfigured() || clean.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("entries").select("*").in("id", clean);
  return Object.fromEntries(((data ?? []) as Entry[]).map((e) => [e.id, e]));
}

/** Entries that point at this one (programmes at an institution, jobs and calls at a studio). */
export async function getRelatedEntries(orgId: string): Promise<Entry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("entries")
    .select("*")
    .eq("visibility", "public")
    .eq("status", "approved")
    .or(`data->>organisation_id.eq.${orgId},data->>institution_id.eq.${orgId}`)
    .limit(50);
  return (data ?? []) as Entry[];
}

/** Public entry counts per section slug (Tools and Publications split the resources). */
export async function countBySection(): Promise<Record<string, number>> {
  const out: Record<string, number> = Object.fromEntries(SECTIONS.map((s) => [s.slug, 0]));
  if (!isSupabaseConfigured()) return out;
  const supabase = await createClient();
  await Promise.all(
    SECTIONS.map(async (s) => {
      let q = supabase.from("entries").select("id", { count: "exact", head: true }).eq("type", s.type).eq("visibility", "public").eq("status", "approved");
      if (s.kind) q = q.eq("data->>resource_kind", s.kind);
      if (s.excludeKind) q = q.or(`data->>resource_kind.is.null,data->>resource_kind.neq.${s.excludeKind}`);
      const { count } = await q;
      out[s.slug] = count ?? 0;
    }),
  );
  return out;
}

/** Titles of tools on the Map, plus the user's own, for the "For tool" picker. */
export async function getToolNames(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("entries").select("title").eq("type", "resource").eq("data->>resource_kind", TOOL_KIND).neq("status", "archived").order("title").limit(500);
  return [...new Set((data ?? []).map((r) => r.title as string))];
}

/** Libraries, tutorials and other resources linked to a tool. */
export async function getToolResources(toolId: string): Promise<Entry[]> {
  if (!isSupabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(toolId)) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("entries").select("*").eq("data->>tool_id", toolId).neq("status", "archived").order("title").limit(100);
  return (data ?? []) as Entry[];
}

export async function getPlaces(): Promise<Place[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("places").select("city,state,country,region,lat,lng").order("country").order("city");
  return (data ?? []) as Place[];
}

/** Every country name (from the countries table), for the Country field's suggestions. */
export async function getCountryNames(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("countries").select("name").order("name");
  return (data ?? []).map((c) => c.name as string);
}

export async function getDisciplines(): Promise<Discipline[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("disciplines").select("slug,label").order("sort_order");
  return (data ?? []) as Discipline[];
}

/**
 * Rates change once a day, so they're kept in Next's data cache and shared by every visitor, not read again on each
 * page. A signed-out client because a cached read can't depend on cookies; anyone may read fx_rates. A failed read
 * throws, so it is never cached.
 */
const readFxTable = unstable_cache(
  async (): Promise<FxTable> => {
    const supabase = createAnonClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data, error } = await supabase.from("fx_rates").select("currency,inr_per_unit,as_of").order("as_of", { ascending: false });
    if (error) throw new Error(`fx_rates query failed: ${error.message}`);
    const fx: FxTable = { INR: 1 };
    for (const r of data ?? []) if (fx[r.currency] == null) fx[r.currency] = Number(r.inr_per_unit);
    return fx;
  },
  ["fx-table"],
  { revalidate: 3600 },
);

/** Latest INR rate per currency, at most an hour old. Without it, costs just show in their original currency. */
export async function getFxTable(): Promise<FxTable> {
  if (!isSupabaseConfigured()) return { INR: 1 };
  try {
    return await readFxTable();
  } catch (e) {
    console.error(e);
    return { INR: 1 };
  }
}

/** Countries and regions for the lens picker and relevance rules. */
export async function getGeo(): Promise<Geo> {
  if (!isSupabaseConfigured()) return { regions: [], countries: [] };
  const supabase = await createClient();
  const [r, c] = await Promise.all([
    supabase.from("regions").select("slug,name,also_matches").order("sort_order"),
    supabase.from("countries").select("code,slug,name,region,currency,groups").order("name"),
  ]);
  return { regions: (r.data ?? []) as Region[], countries: (c.data ?? []) as Country[] };
}

/**
 * Every public, approved entry's id and last update, for the sitemap. Uses a signed-out client (no
 * cookies) so the sitemap can be cached, and RLS already limits it to what anyone may read.
 */
export async function listPublicEntriesForSitemap(): Promise<Pick<Entry, "id" | "updated_at">[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAnonClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const out: Pick<Entry, "id" | "updated_at">[] = [];
  // Page through in chunks of 1000 (PostgREST's default cap); a sitemap file holds up to 50,000 URLs.
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await supabase
      .from("entries")
      .select("id, updated_at")
      .eq("visibility", "public")
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .range(from, from + 999);
    if (error) throw new Error(`sitemap query failed: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
