import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getAuthUser } from "./auth";

export interface Profile {
  id: string;
  display_name: string | null;
  role: "user" | "admin";
  /** Lens slug. */
  preferred_lens: string;
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  return getAuthUser();
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("profiles").select("id,display_name,role,preferred_lens").eq("id", auth.user.id).maybeSingle();
  return data as Profile | null;
}

/** Make sure a profile row exists (the DB trigger normally creates it on sign-up). */
export async function ensureProfile(): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase
    .from("profiles")
    .upsert({ id: auth.user.id, display_name: auth.user.email?.split("@")[0] ?? null }, { onConflict: "id", ignoreDuplicates: true });
}

export async function setPreferredLens(lens: string): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("profiles").update({ preferred_lens: lens }).eq("id", auth.user.id);
}

/** How many people have an account. RLS lets only admins count every profile; null if the count fails. */
export async function countAccounts(): Promise<number | null> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
  return error ? null : count;
}
