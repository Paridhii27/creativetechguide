"use server";
import { browseEntries } from "@/lib/db/entries";
import { sectionForEntry, SECTIONS } from "@/lib/types";

export type Surprise = { id: string; title: string; kind: string } | null;

/** "Surprise me" on the home globe: one entry picked at random from a city, optionally within one section. */
export async function surpriseAction(city: string, section: string | null): Promise<Surprise> {
  if (typeof city !== "string" || !city || city.length > 100) return null;
  const s = SECTIONS.find((x) => x.slug === section);
  const { entries } = await browseEntries({ lens: "global", city, type: s?.type, kind: s?.kind, excludeKind: s?.excludeKind, limit: 50 });
  const e = entries[Math.floor(Math.random() * entries.length)];
  return e ? { id: e.id, title: e.title.replace(/^\[Demo\]\s*/, ""), kind: sectionForEntry(e).singular } : null;
}
