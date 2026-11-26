import type { MetadataRoute } from "next";
import { listPublicEntriesForSitemap } from "@/lib/db/entries";
import { siteUrl } from "@/lib/seo";
import { SECTIONS } from "@/lib/types";

// Rebuilt at most hourly, so new approved entries show up without a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries = await listPublicEntriesForSitemap();
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...SECTIONS.map((s) => ({ url: `${base}/${s.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...entries.map((e) => ({ url: `${base}/entry/${e.id}`, lastModified: e.updated_at, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
