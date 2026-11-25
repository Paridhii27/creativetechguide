import { NextResponse } from "next/server";
import { z } from "zod";
import { normaliseUrl, unfurl } from "@/lib/unfurl";
import { getCurrentUser } from "@/lib/db/profiles";
import { findEntryByUrl } from "@/lib/db/mylayer";

const Body = z.object({ url: z.url({ protocol: /^https?$/ }) });

/** POST {url} → page metadata, plus the matching Map entry if the URL is already there. Signed-in users only. */
export async function POST(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Sign in to add entries." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a full http(s) link." }, { status: 400 });

  const url = normaliseUrl(parsed.data.url);
  const existing = await findEntryByUrl(url);
  try {
    const page = await unfurl(url);
    const finalExisting = existing ?? (page.url !== url ? await findEntryByUrl(normaliseUrl(page.url)) : null);
    // The visible text is only needed server-side; keep the response small.
    return NextResponse.json({ page: { ...page, text: undefined, url: normaliseUrl(page.url) }, existing: finalExisting });
  } catch (e) {
    // Still let the user add it by hand.
    return NextResponse.json({ page: null, existing, warning: e instanceof Error ? e.message : "Couldn't fetch that page." });
  }
}
