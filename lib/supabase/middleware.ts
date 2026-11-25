import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** Refreshes the auth session cookie on every request. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  // If the callback URL isn't allow-listed in Supabase, auth falls back to the Site URL (e.g. "/?code=…").
  // Send those through the callback so sign-in still completes.
  const { pathname, searchParams } = request.nextUrl;
  if (!pathname.startsWith("/auth/") && (searchParams.has("code") || searchParams.has("token_hash"))) {
    const to = request.nextUrl.clone();
    to.pathname = "/auth/callback";
    if (!to.searchParams.has("next")) to.searchParams.set("next", pathname);
    return NextResponse.redirect(to);
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}
