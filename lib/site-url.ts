import "server-only";
import { headers } from "next/headers";

/**
 * The origin the current request came in on: the Vercel production domain, a preview URL, or
 * localhost in dev. It is read from the request, not from env, so a copied `localhost` value can't leak
 * into production emails. Supabase still checks the final redirect against its allow-list
 * (Authentication → URL Configuration), so a forged Host header can't send links elsewhere.
 * `NEXT_PUBLIC_SITE_URL` / `VERCEL_URL` are only fallbacks for contexts with no request.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) || host.endsWith(".localhost");
    const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (local ? "http" : "https");
    return `${proto}://${host}`;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
