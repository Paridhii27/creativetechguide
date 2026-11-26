import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { extractSuggestions, type Suggested } from "./extract";

export interface Unfurled {
  url: string; // final URL after redirects
  title: string | null;
  description: string | null;
  image_url: string | null;
  favicon_url: string | null;
  site_name: string | null;
  text: string; // visible text, capped
  suggested: Suggested; // fields the page states (JSON-LD, meta, deadline sentences)
}

const MAX_BYTES = 2_000_000;
const MAX_TEXT = 20_000;
const UA = "FieldGuideBot/0.1 (+creative technology field guide; link preview)";

/** Block loopback, private, link-local and other non-public addresses (SSRF guard). */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  // IPv6: allow only public (global unicast, 2000::/3) addresses. That refuses loopback, local, multicast and the
  // forms that carry an IPv4 address inside them (::ffff:7f00:1, 64:ff9b::…, 6to4 2002::…) however they're written.
  const first = parseInt(ip.split(":")[0] || "0", 16);
  return !(first >= 0x2000 && first <= 0x3fff) || first === 0x2002;
}

/** Why a page couldn't be read, so callers can tell "gone" from "wouldn't let us in". */
export class UnfurlError extends Error {
  constructor(
    message: string,
    readonly kind: "http" | "not_html" | "no_such_host" | "refused" | "redirects",
    readonly status?: number,
  ) {
    super(message);
  }
}

async function assertPublicUrl(u: URL) {
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new UnfurlError("Only http and https links are supported.", "refused");
  if (u.username || u.password) throw new UnfurlError("Links with credentials aren't supported.", "refused");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch((e: NodeJS.ErrnoException) => {
        if (e.code === "ENOTFOUND") throw new UnfurlError("That website address doesn't exist.", "no_such_host");
        throw e;
      });
  if (addrs.length === 0 || addrs.some((a) => isPrivateAddress(a.address))) throw new UnfurlError("That address isn't publicly reachable.", "refused");
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? "").trim() : null;
}

/** Pure HTML → metadata parser (exported for tests). */
export function parseHtml(html: string, baseUrl: string): Omit<Unfurled, "url"> {
  const meta: Record<string, string> = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attr(tag, "property") ?? attr(tag, "name") ?? "").toLowerCase();
    const content = attr(tag, "content");
    if (key && content && !(key in meta)) meta[key] = content;
  }
  let favicon: string | null = null;
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    if (/(^|\s)(icon|shortcut icon|apple-touch-icon)(\s|$)/.test(rel)) {
      favicon = attr(tag, "href");
      if (!rel.includes("apple")) break;
    }
  }
  const abs = (v: string | null) => {
    if (!v) return null;
    try {
      const u = new URL(v, baseUrl);
      return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
    } catch {
      return null;
    }
  };
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const text = decode(
    html
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
  const clean = (s?: string | null) => (s ? decode(s).replace(/\s+/g, " ").trim() || null : null);
  const title = clean(meta["og:title"] ?? meta["twitter:title"] ?? titleTag);
  const description = clean(meta["og:description"] ?? meta["description"] ?? meta["twitter:description"]);
  const site_name = clean(meta["og:site_name"]);
  return {
    title,
    description,
    image_url: abs(meta["og:image"] ?? meta["og:image:url"] ?? meta["twitter:image"] ?? null),
    favicon_url: abs(favicon) ?? abs("/favicon.ico"),
    site_name,
    text,
    suggested: extractSuggestions({ html, meta, url: baseUrl, title, description, site_name, text }),
  };
}

/** Fetch a public page politely and extract metadata. Follows up to 5 redirects, re-checking each hop. */
export async function unfurl(input: string): Promise<Unfurled> {
  let url = new URL(input);
  for (let hop = 0; hop < 6; hop++) {
    await assertPublicUrl(url);
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    if (!res.ok) throw new UnfurlError(`The page answered with HTTP ${res.status}.`, "http", res.status);
    const type = res.headers.get("content-type") ?? "";
    if (!/html|xml/i.test(type)) throw new UnfurlError("That link isn't a web page.", "not_html");
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    return { url: url.toString(), ...parseHtml(html, url.toString()) };
  }
  throw new UnfurlError("Too many redirects.", "redirects");
}

/** Normalise for duplicate checks: lowercase host, drop default ports, trailing slash and tracking params. */
export function normaliseUrl(raw: string): string {
  const u = new URL(raw.trim());
  u.hash = u.hash === "#" ? "" : u.hash;
  for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_|ref$)/i.test(k)) u.searchParams.delete(k);
  u.hostname = u.hostname.toLowerCase();
  let s = u.toString();
  if (u.pathname === "/" && !u.search && !u.hash) s = s.replace(/\/$/, "");
  return s;
}
