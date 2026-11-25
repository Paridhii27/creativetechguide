/**
 * Find a favicon and page image for public entries that have neither, by fetching each entry's own link
 * (same polite fetch as the Add form: identified user agent, public addresses only, at most one request
 * a second per site). Reads with the public key only and writes no data: it produces a SQL file to review.
 *
 *   npx tsx --conditions=react-server scripts/backfill-icons.ts out.sql [limit]
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { unfurl } from "../lib/unfurl";

config({ path: ".env.local" });

const CONCURRENCY = 8;
const PER_HOST_GAP_MS = 1100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const lastHit = new Map<string, number>();
const hostQueue = new Map<string, Promise<void>>();

/** Run `fn` at most once a second per host, however many entries share it. */
function politely<T>(host: string, fn: () => Promise<T>): Promise<T> {
  const prev = hostQueue.get(host) ?? Promise.resolve();
  const run = prev.then(async () => {
    const wait = (lastHit.get(host) ?? 0) + PER_HOST_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    try {
      return await fn();
    } finally {
      lastHit.set(host, Date.now());
    }
  });
  hostQueue.set(host, run.then(() => undefined, () => undefined));
  return run;
}

/** True if the URL answers with an image (so we never store a dead favicon or image). */
async function isImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { "user-agent": "FieldGuideBot/0.1 (+creative technology field guide; link preview)" }, redirect: "follow", signal: AbortSignal.timeout(8000) });
    const type = res.headers.get("content-type") ?? "";
    await res.body?.cancel();
    return res.ok && /^image\//i.test(type);
  } catch {
    return false;
  }
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function main() {
  const [out, limitArg] = process.argv.slice(2);
  if (!out) throw new Error("Usage: backfill-icons.ts out.sql [limit]");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.from("entries").select("id,url,title").eq("visibility", "public").eq("status", "approved").is("favicon_url", null).is("image_url", null).not("url", "is", null).order("title").limit(2000);
  if (error) throw error;
  const rows = (data ?? []).slice(0, limitArg ? Number(limitArg) : undefined);
  console.log(`${rows.length} entries to check`);

  const results: { url: string; favicon: string | null; image: string | null; error?: string }[] = [];
  let next = 0;
  async function worker() {
    while (next < rows.length) {
      const r = rows[next++];
      const host = new URL(r.url!).hostname;
      try {
        const page = await politely(host, () => unfurl(r.url!));
        const [favicon, image] = await Promise.all([
          page.favicon_url && (await isImage(page.favicon_url)) ? page.favicon_url : null,
          page.image_url && (await isImage(page.image_url)) ? page.image_url : null,
        ]);
        results.push({ url: r.url!, favicon, image });
      } catch (e) {
        results.push({ url: r.url!, favicon: null, image: null, error: (e as Error).message });
      }
      if (results.length % 25 === 0) console.log(`  ${results.length}/${rows.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const found = results.filter((r) => r.favicon || r.image);
  const sql = [
    "-- Favicons and page images found by scripts/backfill-icons.ts. Only fills entries that have neither.",
    ...found.map(
      (r) =>
        `update entries set favicon_url = ${r.favicon ? q(r.favicon) : "null"}, image_url = ${r.image ? q(r.image) : "null"} where url = ${q(r.url)} and visibility = 'public' and favicon_url is null and image_url is null;`,
    ),
  ].join("\n");
  writeFileSync(out, sql + "\n");
  writeFileSync(out.replace(/\.sql$/, ".json"), JSON.stringify(results, null, 1));
  console.log(`done: ${found.length} with a picture (${results.filter((r) => r.favicon).length} favicons, ${results.filter((r) => r.image).length} images), ${results.filter((r) => r.error).length} unreachable, ${results.length - found.length - results.filter((r) => r.error).length} with nothing usable`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
