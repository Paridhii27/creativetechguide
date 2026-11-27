/**
 * Find sharper logos for public entries that show a small favicon: touch icons, larger declared icons, SVG icons
 * and web-manifest icons from the site itself. Polite (identified user agent, public addresses only, at most one
 * request a second per site). Reads with the public key only and writes no data: it produces a SQL file to apply
 * after review, plus a JSON report.
 *
 *   npx tsx --conditions=react-server scripts/upgrade-icons.ts out.sql [limit]
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { entryPicture } from "../lib/icon";
import { websiteProblem } from "../lib/unfurl";

config({ path: ".env.local" });

const UA = "FieldGuideBot/0.1 (+creative technology field guide; link preview)";
const CONCURRENCY = 8;
const PER_HOST_GAP_MS = 1100;
const SHARP = 128; // at or above this there's nothing worth replacing
const MIN_NEW = 96;
const MAX_BYTES = 2_000_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const queue = new Map<string, Promise<unknown>>();

/** GET a public URL, checking every redirect hop, at most once a second per host. */
async function get(input: string): Promise<{ url: string; type: string; body: Buffer } | null> {
  let url = new URL(input);
  for (let hop = 0; hop < 6; hop++) {
    if (await websiteProblem(url.toString())) return null;
    const target = url;
    const turn = (queue.get(target.hostname) ?? Promise.resolve()).then(async () => {
      try {
        const res = await fetch(target, { redirect: "manual", headers: { "user-agent": UA }, signal: AbortSignal.timeout(10_000) });
        const location = res.headers.get("location");
        if (res.status >= 300 && res.status < 400 && location) {
          await res.body?.cancel();
          return { location };
        }
        if (!res.ok || Number(res.headers.get("content-length") ?? 0) > MAX_BYTES * 2) {
          await res.body?.cancel();
          return null;
        }
        const chunks: Uint8Array[] = [];
        let size = 0;
        const reader = res.body?.getReader();
        while (reader && size <= MAX_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          size += value.length;
        }
        await reader?.cancel();
        return { type: res.headers.get("content-type") ?? "", body: Buffer.concat(chunks) };
      } catch {
        return null;
      }
    });
    queue.set(target.hostname, turn.then(() => sleep(PER_HOST_GAP_MS)));
    const out = await turn;
    if (!out) return null;
    if ("location" in out) {
      url = new URL(out.location!, url);
      continue;
    }
    return { url: url.toString(), type: out.type!, body: out.body! };
  }
  return null;
}

/** Pixel size read from the file itself (declared `sizes` can't be trusted). SVG counts as unlimited. */
function dimensions(b: Buffer): { w: number; h: number } | null {
  if (b.length < 24) return null;
  if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.toString("ascii", 0, 3) === "GIF") return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  if (b.readUInt32LE(0) === 0x00010000) {
    let best = { w: 0, h: 0 };
    for (let i = 0; i < b.readUInt16LE(4) && 6 + i * 16 + 2 <= b.length; i++) {
      const w = b[6 + i * 16] || 256;
      if (w > best.w) best = { w, h: b[7 + i * 16] || 256 };
    }
    return best.w ? best : null;
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length; ) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      i += 2 + b.readUInt16BE(i + 2);
    }
    return null;
  }
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" && b.length >= 30) {
    const kind = b.toString("ascii", 12, 16);
    if (kind === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (kind === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (kind === "VP8L") return { w: 1 + (b.readUInt32LE(21) & 0x3fff), h: 1 + ((b.readUInt32LE(21) >> 14) & 0x3fff) };
    return null;
  }
  if (/^\s*(<\?xml[\s\S]*?)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg\b/i.test(b.toString("utf8", 0, 4000))) return { w: 10_000, h: 10_000 };
  return null;
}

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "").replace(/&amp;/g, "&").trim() : "";
};

const resolve = (href: string, base: string) => {
  try {
    const u = new URL(href, base);
    return /^https?:$/.test(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
};

/** Icon addresses the page offers, most promising first. */
async function candidates(pageUrl: string): Promise<string[]> {
  const origin = new URL(pageUrl).origin;
  const page = (await get(pageUrl)) ?? (await get(origin));
  const base = page?.url ?? origin;
  const found: { url: string; rank: number }[] = [];
  let manifest: string | null = null;
  for (const tag of page?.body.toString("utf8").match(/<link\b[^>]*>/gi) ?? []) {
    const rel = attr(tag, "rel").toLowerCase();
    const url = attr(tag, "href") && resolve(attr(tag, "href"), base);
    if (!url) continue;
    if (rel === "manifest") manifest = url;
    if (!/(^|\s)(icon|apple-touch-icon|apple-touch-icon-precomposed|fluid-icon)(\s|$)/.test(rel)) continue;
    const size = Math.max(0, ...attr(tag, "sizes").split(/\s+/).map((s) => parseInt(s, 10) || 0));
    const svg = /\.svg(\?|$)/i.test(url) || attr(tag, "type") === "image/svg+xml";
    found.push({ url, rank: svg ? 2000 : size || (rel.includes("apple") ? 180 : 1) });
  }
  if (manifest) {
    const m = await get(manifest);
    try {
      for (const i of JSON.parse(m!.body.toString("utf8")).icons ?? []) {
        const url = resolve(String(i.src), m!.url);
        if (url && !String(i.purpose ?? "").includes("monochrome")) found.push({ url, rank: parseInt(String(i.sizes ?? ""), 10) || 1 });
      }
    } catch {
      /* not a readable manifest */
    }
  }
  found.push({ url: `${new URL(base).origin}/apple-touch-icon.png`, rank: 150 });
  return [...new Set(found.sort((a, b) => b.rank - a.rank).map((f) => f.url))].slice(0, 6);
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function main() {
  const [out, limitArg] = process.argv.slice(2);
  if (!out) throw new Error("Usage: upgrade-icons.ts out.sql [limit]");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("entries").select("id,url,title,type,favicon_url,image_url,data").eq("visibility", "public").eq("status", "approved").not("favicon_url", "is", null).not("url", "is", null).order("id").range(from, from + 999);
    if (error) throw error;
    all.push(...data);
    if (data.length < 1000) break;
  }
  const rows = all.filter((e) => entryPicture(e).src === e.favicon_url).slice(0, limitArg ? Number(limitArg) : undefined);
  console.log(`${rows.length} entries show their favicon`);

  const cache = new Map<string, Promise<{ w: number; h: number } | null>>();
  const size = (url: string) => {
    if (!cache.has(url)) cache.set(url, get(url).then((r) => (r ? dimensions(r.body) : null)));
    return cache.get(url)!;
  };

  const results: { id: string; title: string; old: string; oldSize: number; new?: string; newSize?: number; note: string }[] = [];
  let next = 0;
  async function worker() {
    while (next < rows.length) {
      const r = rows[next++];
      const old = r.favicon_url!;
      const before = (await size(old))?.w ?? 0;
      const row = { id: r.id, title: r.title, old, oldSize: before };
      if (before >= SHARP) {
        results.push({ ...row, note: "already sharp" });
      } else {
        let best: { url: string; w: number } | null = null;
        for (const url of await candidates(r.url!)) {
          if (url === old) continue;
          const d = await size(url);
          // Squarish only: a wide banner declared as an icon would look tiny in the square.
          if (!d || d.w < MIN_NEW || d.w < before * 1.5 || Math.max(d.w, d.h) / Math.min(d.w, d.h) > 1.3) continue;
          if (!best || d.w > best.w) best = { url, w: d.w };
          if (d.w >= 180) break;
        }
        results.push(best ? { ...row, new: best.url, newSize: best.w, note: "sharper found" } : { ...row, note: before ? "nothing sharper" : "current icon unreadable, nothing found" });
      }
      if (results.length % 25 === 0) console.log(`  ${results.length}/${rows.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const found = results.filter((r) => r.new);
  writeFileSync(
    out,
    [
      "-- Sharper icons found by scripts/upgrade-icons.ts. Each row changes only if its icon is still the old one.",
      ...found.map((r) => `update entries set favicon_url = ${q(r.new!)} where id = ${q(r.id)} and favicon_url = ${q(r.old)};`),
    ].join("\n") + "\n",
  );
  writeFileSync(out.replace(/\.sql$/, ".json"), JSON.stringify(results, null, 1));
  const count = (note: string) => results.filter((r) => r.note === note).length;
  console.log(`done: ${found.length} sharper, ${count("already sharp")} already sharp, ${results.length - found.length - count("already sharp")} without anything better`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
