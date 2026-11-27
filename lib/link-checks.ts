/**
 * Warning signs for a suggested entry, shown to the admin before approving. Pure rules over what was fetched:
 * they flag things to look at and never approve or reject anything. A clean result doesn't prove a link is safe.
 */
export type Level = "ok" | "warn" | "bad";
export interface Check {
  level: Level;
  label: string;
  detail: string;
}

/** What fetching a link gave: the page, or why it couldn't be read. */
export type Fetched =
  | { ok: true; url: string; title: string | null; description: string | null; text: string }
  | { ok: false; kind: "http" | "not_html" | "no_such_host" | "lookup_failed" | "refused" | "redirects" | "failed"; status?: number };

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "tiny.cc", "rb.gy", "t.ly"];
const SPAM = /\b(casino|sports ?betting|slot online|jackpot|payday loans?|instant loans?|viagra|cialis|online pharmacy|escorts?|porn|xxx|forex signals?|crypto giveaway|free bitcoin|replica watches|buy followers|essay writing service)\b/i;
const PARKED = /(this domain (name )?(is|may be) (for sale|parked)|buy this domain|domain (is )?for sale|domain parking|parked free|inquire about this domain)/i;

/** Terms that suggest a page is about this field. Deliberately specific: "design" or "game" alone say little. */
export const RELATED_TERMS = [
  "creative technology", "creative technologist", "creative coding", "design technology", "design technologist",
  "interaction design", "experience design", "interactive", "installation", "media art", "new media", "digital art",
  "electronic art", "generative art", "generative design", "projection mapping", "immersive", "virtual reality",
  "augmented reality", "mixed reality", "spatial computing", "physical computing", "data visualisation",
  "data visualization", "sound art", "audiovisual", "game design", "service design", "human-computer interaction",
  "touchdesigner", "unreal engine", "unity3d", "p5.js", "three.js", "openframeworks", "arduino", "max/msp", "webgl", "shader",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** Which of the terms (plus any extra ones, such as discipline names) appear as whole words. */
export function relatedTerms(text: string, extra: string[] = []): string[] {
  const hay = text.toLowerCase();
  const terms = [...new Set([...RELATED_TERMS, ...extra.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 3 && t !== "research")])];
  return terms.filter((t) => new RegExp(`(?<![a-z0-9])${escape(t)}s?(?![a-z0-9])`).test(hay));
}

const SECOND_LEVEL = new Set(["ac", "co", "com", "edu", "gov", "net", "org"]);
/** The part of a host that someone registers: "www.studio.co.in" → "studio.co.in". An approximation. */
export function siteOf(host: string): string {
  const parts = host.toLowerCase().replace(/\.$/, "").split(".");
  const n = parts.length > 2 && parts.at(-1)!.length === 2 && SECOND_LEVEL.has(parts.at(-2)!) ? 3 : 2;
  return parts.slice(-n).join(".");
}

const parse = (raw: string) => {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
};

/** Signs visible in the address itself. */
export function addressChecks(raw: string): Check[] {
  const u = parse(raw);
  if (!u) return [{ level: "bad", label: "Not a web link", detail: "It doesn't start with http or https." }];
  const out: Check[] = [];
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (u.username || u.password) out.push({ level: "bad", label: "Disguised address", detail: "It has a name or password before the website, a common trick." });
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) out.push({ level: "bad", label: "Bare IP address", detail: "Real organisations almost always use a domain name." });
  if (host.split(".").some((p) => p.startsWith("xn--"))) out.push({ level: "warn", label: "Unusual characters", detail: "The domain uses non-Latin letters, which can imitate another site." });
  if (SHORTENERS.includes(siteOf(host))) out.push({ level: "warn", label: "Shortened link", detail: "It hides where it goes. Replace it with the full address." });
  if (u.protocol === "http:") out.push({ level: "warn", label: "Not encrypted", detail: "The link uses http rather than https." });
  return out;
}

/** Does the link lead somewhere real? */
export function reachChecks(link: string, f: Fetched): Check[] {
  if (!f.ok) {
    if (f.kind === "no_such_host") return [{ level: "bad", label: "Site doesn't exist", detail: "The domain doesn't resolve." }];
    if (f.kind === "refused") return [{ level: "bad", label: "Address refused", detail: "It isn't a public web address." }];
    if (f.status === 404 || f.status === 410) return [{ level: "bad", label: "Page not found", detail: `The site answered ${f.status}.` }];
    if (f.kind === "redirects") return [{ level: "warn", label: "Too many redirects", detail: "Open it yourself to see where it ends up." }];
    const why = f.status ? `The site answered ${f.status}.` : f.kind === "not_html" ? "It isn't a web page (perhaps a file)." : "It didn't respond.";
    return [{ level: "warn", label: "Couldn't check", detail: `${why} Some real sites block automated visits, so open it yourself.` }];
  }
  const out: Check[] = [];
  if (PARKED.test(`${f.title ?? ""} ${f.description ?? ""} ${f.text.slice(0, 3000)}`)) out.push({ level: "bad", label: "Parked domain", detail: "The page offers the domain for sale or is a placeholder." });
  const from = parse(link);
  const to = parse(f.url);
  if (from && to && siteOf(from.hostname) !== siteOf(to.hostname)) out.push({ level: "warn", label: "Redirects elsewhere", detail: `It ends up on ${to.hostname}.` });
  if (!out.length) out.push({ level: "ok", label: "Link works", detail: "The page loaded." });
  return out;
}

export interface CheckInput {
  url: string | null;
  page: Fetched | null;
  /** A second link people will be sent to (the apply button), when it differs. */
  applyUrl?: string | null;
  applyPage?: Fetched | null;
  title: string;
  summary: string | null;
  disciplineLabels?: string[];
  /** A public entry that already has this link. */
  duplicateTitle?: string | null;
  /** Entries the same person added in the last 24 hours. */
  addedByOwnerToday?: number;
  /** Other waiting suggestions on the same website. */
  pendingSameSite?: number;
}

export const BUSY_OWNER = 10;
export const BUSY_SITE = 3;
const MIN_TEXT = 200;
const ORDER: Record<Level, number> = { bad: 0, warn: 1, ok: 2 };

/** Every check for one suggestion, most serious first. */
export function checkEntry(i: CheckInput): Check[] {
  const out: Check[] = [];
  const links: [string, string, Fetched | null | undefined][] = [];
  if (i.url) links.push(["", i.url, i.page]);
  else out.push({ level: "warn", label: "No link", detail: "There's nothing to open and check." });
  if (i.applyUrl && i.applyUrl !== i.url) links.push(["Apply link: ", i.applyUrl, i.applyPage]);

  for (const [prefix, link, page] of links) {
    const found = [...addressChecks(link), ...(page ? reachChecks(link, page) : [])];
    out.push(...found.map((c) => ({ ...c, label: prefix + c.label })));
  }

  const p = i.page?.ok ? i.page : null;
  // Spam words are looked for in headlines and summaries only; a long page may mention one in passing.
  const spam = [i.title, i.summary, p?.title, p?.description].filter(Boolean).join(" ").match(SPAM)?.[0];
  if (spam) out.push({ level: "bad", label: "Spam wording", detail: `The title or summary mentions “${spam.toLowerCase()}”.` });

  // Relevance is judged from the page itself, not from what the person typed.
  if (p) {
    const body = [p.title, p.description, p.text].filter(Boolean).join(" ");
    const terms = relatedTerms(body, i.disciplineLabels);
    if (terms.length >= 2) out.push({ level: "ok", label: "Looks related", detail: `The page mentions ${terms.slice(0, 5).join(", ")}.` });
    else if (body.length < MIN_TEXT) out.push({ level: "warn", label: "Relevance unclear", detail: "The page has too little readable text to judge." });
    else out.push({ level: "warn", label: "Possibly off-topic", detail: terms.length ? `Only one related term found: ${terms[0]}.` : "No related terms found on the page (checked in English)." });
  }

  if (i.duplicateTitle) out.push({ level: "bad", label: "Already on the Map", detail: `“${i.duplicateTitle}” has the same link.` });
  if ((i.addedByOwnerToday ?? 0) > BUSY_OWNER) out.push({ level: "warn", label: "Many additions", detail: `This person added ${i.addedByOwnerToday} entries in the last 24 hours.` });
  if ((i.pendingSameSite ?? 0) >= BUSY_SITE) out.push({ level: "warn", label: "Many from one site", detail: `${i.pendingSameSite} other waiting suggestions point to this website.` });

  return out.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
}
