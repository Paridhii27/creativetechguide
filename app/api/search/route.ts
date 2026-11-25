import { NextResponse } from "next/server";
import { browseEntries } from "@/lib/db/entries";
import { resolveLens } from "@/lib/lens-server";
import { locationLabel } from "@/lib/places";
import { TYPE_SWATCH } from "@/lib/swatch";
import { sectionForEntry } from "@/lib/types";

/** GET ?q=&lens= → a handful of compact matches for the navbar search dropdown. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = params.get("q")?.trim().slice(0, 100) ?? "";
  if (q.length < 2) return NextResponse.json({ results: [], hasMore: false });

  const lens = await resolveLens(params.get("lens") ?? undefined);
  const { entries, hasMore } = await browseEntries({ q, lens: lens.slug, limit: 6 });
  const results = entries.map((e) => ({
    id: e.id,
    title: e.title,
    kind: sectionForEntry(e).singular,
    swatch: TYPE_SWATCH[e.type],
    location: locationLabel(e),
  }));
  return NextResponse.json({ results, hasMore });
}
