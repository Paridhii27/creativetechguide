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
    readonly kind: "http" | "not_html" | "no_such_host" | "lookup_failed" | "refused" | "redirects",
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
        // Some hosts report a missing domain with another code (EBUSY, EAI_AGAIN), so any failed lookup counts.
        throw new UnfurlError(`The address lookup failed (${e.code}).`, "lookup_failed");
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

/** Why a link can't be added at all, in plain language, or null if the failure doesn't prove the link is wrong. */
export function badLinkMessage(e: unknown): string | null {
  if (!(e instanceof UnfurlError)) return null;
  if (e.kind === "no_such_host") return "We couldn't find a website at that address. Check the spelling and try again.";
  if (e.kind === "lookup_failed") return "We couldn't confirm that website exists. Check the spelling, or try again in a moment.";
  if (e.kind === "refused") return "That address isn't a public website, so it can't be added.";
  if (e.kind === "http" && (e.status === 404 || e.status === 410)) return "That page doesn't exist on this website. Check the link and try again.";
  return null;
}

/** Why a real-looking link couldn't be read, in plain language. The user can still fill the entry in by hand. */
export function unreadableLinkMessage(e: unknown): string {
  if (e instanceof UnfurlError) {
    if (e.kind === "not_html") return "That link points to a file rather than a web page, so we couldn't read its details.";
    if (e.kind === "http" && (e.status === 401 || e.status === 403 || e.status === 429)) return "That website didn't let us read the page.";
  }
  return "We couldn't open that page just now.";
}

/** A message if the link's website can't be found or isn't public. Only looks up the address; fetches nothing. */
export async function websiteProblem(url: string): Promise<string | null> {
  try {
    await assertPublicUrl(new URL(url));
    return null;
  } catch (e) {
    return badLinkMessage(e);
  }
}

/** Fetch a public page politely and extract metadata. */
export async function unfurl(input: string): Promise<Unfurled> {
  const { url, html } = await fetchPage(input);
  return { url, ...parseHtml(html, url) };
}

/** GET a public address, following up to 5 redirects and re-checking each hop. */
async function fetchPublic(input: string, accept: string): Promise<{ url: URL; res: Response }> {
  let url = new URL(input);
  for (let hop = 0; hop < 6; hop++) {
    await assertPublicUrl(url);
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": UA, accept },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    if (!res.ok) throw new UnfurlError(`The page answered with HTTP ${res.status}.`, "http", res.status);
    return { url, res };
  }
  throw new UnfurlError("Too many redirects.", "redirects");
}

/** A response body, cut off once it passes MAX_BYTES. */
async function readCapped(res: Response): Promise<{ body: Buffer; truncated: boolean }> {
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
    if (size > MAX_BYTES) {
      await reader.cancel();
      truncated = true;
      break;
    }
  }
  return { body: Buffer.concat(chunks), truncated };
}

/** A public page's HTML (capped). */
export async function fetchPage(input: string): Promise<{ url: string; html: string }> {
  const { url, res } = await fetchPublic(input, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5");
  if (!/html|xml/i.test(res.headers.get("content-type") ?? "")) throw new UnfurlError("That link isn't a web page.", "not_html");
  const { body } = await readCapped(res);
  return { url: url.toString(), html: new TextDecoder().decode(body) };
}

/** A public picture's bytes. Files over the size cap are refused, since part of an image is no use. */
export async function fetchImage(input: string): Promise<Buffer> {
  const { res } = await fetchPublic(input, "image/*,*/*;q=0.5");
  const { body, truncated } = await readCapped(res);
  if (truncated) throw new UnfurlError("That picture is too large.", "refused");
  return body;
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
