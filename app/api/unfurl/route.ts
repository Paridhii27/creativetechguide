import { NextResponse } from "next/server";
import { z } from "zod";
import { linkProblem, NOT_A_LINK } from "@/lib/links";
import { badLinkMessage, normaliseUrl, unfurl, unreadableLinkMessage } from "@/lib/unfurl";
import { getCurrentUser } from "@/lib/db/profiles";
import { findEntryByUrl } from "@/lib/db/mylayer";

const Body = z.object({ url: z.string() });

/** POST {url} → page metadata, plus the matching Map entry if the URL is already there. Signed-in users only. */
export async function POST(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "Sign in to add entries." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const problem = parsed.success ? linkProblem(parsed.data.url) : NOT_A_LINK;
  if (!parsed.success || problem) return NextResponse.json({ error: problem }, { status: 400 });

  const url = normaliseUrl(parsed.data.url);
  const existing = await findEntryByUrl(url);
  try {
    const page = await unfurl(url);
    const finalExisting = existing ?? (page.url !== url ? await findEntryByUrl(normaliseUrl(page.url)) : null);
    // The visible text is only needed server-side; keep the response small.
    return NextResponse.json({ page: { ...page, text: undefined, url: normaliseUrl(page.url) }, existing: finalExisting });
  } catch (e) {
    // A link that's plainly wrong is turned away (unless it's already on the Map); otherwise the user can add it by hand.
    const bad = badLinkMessage(e);
    if (bad && !existing) return NextResponse.json({ error: bad }, { status: 422 });
    return NextResponse.json({ page: null, existing, warning: unreadableLinkMessage(e) });
  }
}
