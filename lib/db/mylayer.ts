import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { buildData, extraPlaces, mergeData, type EntryFormValues } from "@/lib/entry-input";
import type { Entry, Status } from "@/lib/types";

export type ApplicationStatus = "none" | "interested" | "applying" | "applied" | "interviewing" | "rejected" | "accepted";
export interface UserEntryState {
  entry_id: string;
  saved: boolean;
  note: string | null;
  personal_tags: string[];
  application_status: ApplicationStatus;
}

async function client() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** Public Map entry with this URL (if any), for duplicate checks. */
export async function findEntryByUrl(url: string): Promise<{ id: string; title: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const variants = [...new Set([url, url.replace(/\/$/, ""), `${url.replace(/\/$/, "")}/`])];
  const { data } = await supabase.from("entries").select("id,title").in("url", variants).eq("visibility", "public").eq("status", "approved").limit(1);
  return data?.[0] ?? null;
}

async function placeFor(city?: string, country?: string) {
  if (!city && !country) return null;
  const supabase = await createClient();
  let q = supabase.from("places").select("city,state,country,region,lat,lng").limit(1);
  if (city) q = q.ilike("city", likeLiteral(city));
  if (country) q = q.ilike("country", likeLiteral(country));
  const { data } = await q;
  if (data?.[0]) return data[0];
  if (country) {
    // A city we have no coordinates for: still file it under the right country and region. The countries
    // table covers far more countries than places does (which only has those with a seeded city).
    const { data: c } = await supabase.from("countries").select("name,region").ilike("name", likeLiteral(country)).limit(1);
    if (c?.[0]) return { city: city ?? null, state: null, country: c[0].name, region: c[0].region, lat: null, lng: null };
  }
  return null;
}

/** Escape % and _ so a typed name is matched literally by ilike. */
const likeLiteral = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Look up each extra place (city and/or country) and keep what we know about it, for data.locations. */
async function resolveExtraPlaces(v: EntryFormValues): Promise<Record<string, unknown>[]> {
  const places = await Promise.all(
    extraPlaces(v).map(async ({ city, country }) => {
      const p = await placeFor(city, country);
      return { city: p?.city ?? city ?? null, state: p?.state ?? null, country: p?.country ?? country ?? null, region: p?.region ?? null, lat: p?.lat ?? null, lng: p?.lng ?? null };
    }),
  );
  return places;
}

async function orgIdFor(name?: string): Promise<string | undefined> {
  if (!name) return undefined;
  const supabase = await createClient();
  const { data } = await supabase.from("entries").select("id").eq("type", "organisation").ilike("title", likeLiteral(name)).limit(1);
  return data?.[0]?.id;
}

async function toolIdFor(name?: string): Promise<string | undefined> {
  if (!name) return undefined;
  const supabase = await createClient();
  const { data } = await supabase.from("entries").select("id").eq("type", "resource").eq("data->>resource_kind", "tool").ilike("title", likeLiteral(name)).limit(1);
  return data?.[0]?.id;
}

async function inrRate(currency?: string): Promise<number | undefined> {
  if (!currency) return undefined;
  const supabase = await createClient();
  const { data } = await supabase.from("fx_rates").select("inr_per_unit").eq("currency", currency.toUpperCase()).order("as_of", { ascending: false }).limit(1);
  return data?.[0] ? Number(data[0].inr_per_unit) : undefined;
}

export async function isAdmin(): Promise<boolean> {
  const { supabase, user } = await client();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin";
}

/** Create an entry from the Add form. Users get a private draft (or pending_review if suggested); admins may publish. */
export async function createEntry(v: EntryFormValues): Promise<{ id: string } | { error: string } | { duplicate: { id: string; title: string } }> {
  const { supabase, user } = await client();
  if (!user) return { error: "Sign in to add entries." };
  if (v.url) {
    const dup = await findEntryByUrl(v.url);
    if (dup) return { duplicate: dup };
  }
  const admin = v.publish && (await isAdmin());
  const [place, organisationId, inrPerUnit, toolId, locations] = await Promise.all([placeFor(v.city, v.country), orgIdFor(v.organisation_name), inrRate(v.tuition_currency), toolIdFor(v.tool_name), resolveExtraPlaces(v)]);
  const row = {
    type: v.type,
    title: v.title,
    summary: v.summary ?? null,
    url: v.url ?? null,
    image_url: v.image_url ?? null,
    favicon_url: v.favicon_url ?? null,
    city: place?.city ?? v.city ?? null,
    state: place?.state ?? null,
    country: place?.country ?? v.country ?? null,
    region: place?.region ?? null,
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
    is_remote: v.is_remote,
    disciplines: v.disciplines,
    source: "drop" as const,
    owner_id: user.id,
    visibility: admin ? ("public" as const) : ("private" as const),
    status: admin ? ("approved" as Status) : v.suggest ? ("pending_review" as Status) : ("draft" as Status),
    data: { ...buildData(v, { organisationId, inrPerUnit, toolId }), ...(locations.length ? { locations } : {}) },
  };
  const { data, error } = await supabase.from("entries").insert(row).select("id").single();
  if (error) return { error: error.code === "23505" ? "An entry with this URL is already on the Map." : error.message };
  await supabase.from("user_entry_state").upsert({ user_id: user.id, entry_id: data.id, saved: true }, { onConflict: "user_id,entry_id" });
  return { id: data.id };
}

/**
 * Edit an entry from the Edit form. Owners can always edit their own private entries (a rejected
 * one goes back to draft); admins can edit anything. Status, visibility and owner never change here. RLS enforces
 * the same rules, so this check only gives a friendlier message.
 */
export async function updateEntry(id: string, v: EntryFormValues): Promise<{ id: string } | { error: string }> {
  const { supabase, user } = await client();
  if (!user) return { error: "Sign in first." };
  const { data: existing } = await supabase.from("entries").select("id,type,data,owner_id,visibility,status").eq("id", id).maybeSingle();
  if (!existing) return { error: "Entry not found." };
  const admin = await isAdmin();
  if (!admin && !(existing.owner_id === user.id && existing.visibility === "private")) return { error: "You can only edit your own private entries." };
  const [place, organisationId, inrPerUnit, toolId, locations] = await Promise.all([placeFor(v.city, v.country), orgIdFor(v.organisation_name), inrRate(v.tuition_currency), toolIdFor(v.tool_name), resolveExtraPlaces(v)]);
  const fresh = { ...buildData(v, { organisationId, inrPerUnit, toolId }), ...(locations.length ? { locations } : {}) };
  const patch = {
    type: v.type,
    title: v.title,
    summary: v.summary ?? null,
    url: v.url ?? null,
    city: place?.city ?? v.city ?? null,
    state: place?.state ?? null,
    country: place?.country ?? v.country ?? null,
    region: place?.region ?? null,
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
    is_remote: v.is_remote,
    disciplines: v.disciplines,
    data: mergeData(v.type, existing.type, (existing.data ?? {}) as Record<string, unknown>, fresh),
    // A rejected (or archived) private entry becomes a draft again when its owner edits it.
    ...(!admin && !["draft", "pending_review"].includes(existing.status) ? { status: "draft" as Status } : {}),
  };
  const { data, error } = await supabase.from("entries").update(patch).eq("id", id).select("id");
  if (error) return { error: error.code === "23505" ? "Another public entry already has this URL." : error.message };
  return data?.length ? { id } : { error: "You can't edit this entry." };
}

export async function setSaved(entryId: string, saved: boolean): Promise<string | null> {
  const { supabase, user } = await client();
  if (!user) return "Sign in to save entries.";
  const { error } = await supabase.from("user_entry_state").upsert({ user_id: user.id, entry_id: entryId, saved }, { onConflict: "user_id,entry_id" });
  return error?.message ?? null;
}

export async function getUserState(entryId: string): Promise<UserEntryState | null> {
  const { supabase, user } = await client();
  if (!user) return null;
  const { data } = await supabase.from("user_entry_state").select("entry_id,saved,note,personal_tags,application_status").eq("user_id", user.id).eq("entry_id", entryId).maybeSingle();
  return data as UserEntryState | null;
}

/** Owner suggests a private entry to the Map (draft/rejected → pending_review). */
export async function suggestEntry(entryId: string): Promise<string | null> {
  const { supabase, user } = await client();
  if (!user) return "Sign in first.";
  const { data, error } = await supabase.from("entries").update({ status: "pending_review" }).eq("id", entryId).eq("owner_id", user.id).select("id");
  if (error) return error.message;
  return data?.length ? null : "You can only suggest your own private entries.";
}

export async function deleteOwnEntry(entryId: string): Promise<string | null> {
  const { supabase, user } = await client();
  if (!user) return "Sign in first.";
  const { data, error } = await supabase.from("entries").delete().eq("id", entryId).eq("owner_id", user.id).eq("visibility", "private").select("id");
  if (error) return error.message;
  return data?.length ? null : "Only your own private entries can be deleted.";
}

/** Admin review: approve publishes (trigger sets visibility public), reject keeps it private. */
export async function reviewEntry(entryId: string, decision: "approved" | "rejected" | "archived"): Promise<string | null> {
  const { supabase } = await client();
  if (!(await isAdmin())) return "Only admins can review entries.";
  const { data, error } = await supabase.from("entries").update({ status: decision }).eq("id", entryId).select("id");
  if (error) return error.code === "23505" ? "Another public entry already has this URL. Edit or reject this one." : error.message;
  return data?.length ? null : "Entry not found.";
}

/** Your own entries (newest first) and what you saved from the Map (most recently saved first). */
export async function listMyEntries(): Promise<{ own: Entry[]; saved: Entry[] }> {
  const { supabase, user } = await client();
  if (!user) return { own: [], saved: [] };
  const [{ data: own }, { data: states }] = await Promise.all([
    supabase.from("entries").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("user_entry_state").select("entry_id").eq("user_id", user.id).eq("saved", true).order("updated_at", { ascending: false }),
  ]);
  const ownIds = new Set((own ?? []).map((e) => e.id));
  const savedIds = (states ?? []).map((s) => s.entry_id).filter((id) => !ownIds.has(id));
  const { data: saved } = savedIds.length ? await supabase.from("entries").select("*").in("id", savedIds) : { data: [] };
  const rank = new Map(savedIds.map((id, i) => [id, i]));
  const savedSorted = ((saved ?? []) as Entry[]).sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  return { own: (own ?? []) as Entry[], saved: savedSorted };
}

/** Ids of everything in the signed-in user's layer (saved or their own), to mark rows in lists. Empty when signed out. */
export async function mySavedIds(): Promise<Set<string>> {
  if (!isSupabaseConfigured()) return new Set();
  const { supabase, user } = await client();
  if (!user) return new Set();
  const { data } = await supabase.from("user_entry_state").select("entry_id").eq("user_id", user.id).eq("saved", true);
  return new Set((data ?? []).map((r) => r.entry_id as string));
}

/** How many entries are in the signed-in user's layer (for the header). */
export async function myLayerCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const { supabase, user } = await client();
  if (!user) return 0;
  const { count } = await supabase.from("user_entry_state").select("entry_id", { count: "exact", head: true }).eq("user_id", user.id).eq("saved", true);
  return count ?? 0;
}

/** How many suggestions are waiting in the review queue. 0 for anyone who isn't an admin. */
export async function pendingReviewCount(): Promise<number> {
  if (!isSupabaseConfigured() || !(await isAdmin())) return 0;
  const { supabase } = await client();
  const { count } = await supabase.from("entries").select("id", { count: "exact", head: true }).eq("status", "pending_review");
  return count ?? 0;
}

export async function listPendingReview(): Promise<Entry[]> {
  const { supabase } = await client();
  const { data } = await supabase.from("entries").select("*").eq("status", "pending_review").order("created_at", { ascending: true }).limit(200);
  return (data ?? []) as Entry[];
}
