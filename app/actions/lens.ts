"use server";
import { cookies } from "next/headers";
import { LENS_COOKIE, buildLens, parseLensSlug } from "@/lib/lens";
import { getGeo } from "@/lib/db/entries";
import { setPreferredLens } from "@/lib/db/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function setLensAction(value: string) {
  const lens = buildLens(parseLensSlug(value), await getGeo());
  if (!lens) return;
  (await cookies()).set(LENS_COOKIE, lens.slug, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  if (isSupabaseConfigured()) await setPreferredLens(lens.slug);
}
