import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, getCurrentProfile } from "@/lib/db/profiles";
import { LENS_COOKIE, parseLensSlug } from "@/lib/lens";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const otpType = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code || (tokenHash && otpType)) {
    const supabase = await createClient();
    // PKCE links carry ?code=; links built from the email template's {{ .TokenHash }} carry ?token_hash=&type=.
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: otpType! });
    if (!error) {
      await ensureProfile();
      // Restore the user's remembered lens unless they already picked one on this device.
      const jar = await cookies();
      const profile = await getCurrentProfile();
      if (!parseLensSlug(jar.get(LENS_COOKIE)?.value) && profile?.preferred_lens) {
        jar.set(LENS_COOKIE, profile.preferred_lens, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
