"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type LoginState = { ok: boolean; message: string } | null;

export async function sendMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase is not configured yet (see README)." };
  const parsed = z.email().safeParse(String(form.get("email") ?? "").trim());
  if (!parsed.success) return { ok: false, message: "Enter a valid email address." };
  const next = String(form.get("next") ?? "/");
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next.startsWith("/") ? next : "/")}` },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Check your inbox for a sign-in link." };
}
