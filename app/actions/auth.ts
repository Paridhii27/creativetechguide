"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requestOrigin } from "@/lib/site-url";

export type LoginState = { ok: boolean; message: string } | null;

export async function sendMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Supabase is not configured yet (see README)." };
  const parsed = z.email().safeParse(String(form.get("email") ?? "").trim());
  if (!parsed.success) return { ok: false, message: "Enter a valid email address." };
  const next = String(form.get("next") ?? "/");
  // The domain this request came in on (production, preview or localhost), never a hard-coded env value.
  const origin = await requestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next.startsWith("/") ? next : "/")}` },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Check your inbox for a sign-in link." };
}
