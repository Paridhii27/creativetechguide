import { KINDS, type EntryType } from "./types";

/**
 * Field suggestions pulled straight from a page: JSON-LD (schema.org), meta tags and a few
 * well-marked sentences. Only things the page actually states are returned; anything absent
 * is simply left out (never "unknown"), so the form can show just what was found.
 */
export interface Suggested {
  type?: EntryType;
  kind?: string;
  organisation_name?: string;
  author?: string;
  publisher?: string;
  city?: string;
  country?: string;
  is_remote?: boolean;
  is_free?: "yes" | "no";
  start_date?: string;
  end_date?: string;
  venue?: string;
  deadline?: string;
  deadline_source_text?: string;
  employment?: string;
  work_mode?: string;
  role_title?: string;
  disciplines?: string[];
}

/** Map suggestions onto the entry form's field names (deadline goes to the type's own date field). */
export function suggestionsToFormValues(s: Suggested): Record<string, string | string[] | boolean> {
  const { type, deadline, disciplines, is_remote, ...rest } = s;
  const v: Record<string, string | string[] | boolean> = {};
  for (const [k, x] of Object.entries(rest)) if (typeof x === "string") v[k] = x;
  if (type) v.type = type;
  if (is_remote) v.is_remote = true;
  if (disciplines?.length) v.disciplines = disciplines;
  if (deadline) v[type === "job" ? "closes_at" : type === "program" ? "deadline_date" : "deadline"] = deadline;
  return v;
}

type Json = Record<string, unknown>;

const asArray = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.replace(/\s+/g, " ").trim() : undefined);
const nameOf = (v: unknown): string | undefined => {
  for (const x of asArray(v as unknown)) {
    const s = str(x) ?? (x && typeof x === "object" ? str((x as Json).name) : undefined);
    if (s) return s;
  }
  return undefined;
};
const isoDate = (v: unknown): string | undefined => {
  const s = str(v);
  const m = s?.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1];
};
const typesOf = (o: Json): string[] => asArray(o["@type"] as string | string[]).map((t) => String(t).toLowerCase());

/** Flatten every JSON-LD object on the page (handles arrays and @graph). */
export function jsonLdObjects(html: string): Json[] {
  const out: Json[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const o = v as Json;
      if (o["@type"]) out.push(o);
      if (o["@graph"]) walk(o["@graph"]);
    }
  };
  for (const m of html.matchAll(/<script[^>]+type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      walk(JSON.parse(m[1].trim()));
    } catch {
      /* malformed JSON-LD is common; skip it */
    }
  }
  return out;
}

function address(o: unknown): { city?: string; country?: string; venue?: string } {
  for (const loc of asArray(o as Json | Json[])) {
    if (!loc || typeof loc !== "object") continue;
    const addr = (loc.address ?? loc) as Json | string;
    if (typeof addr === "string") return { venue: str(loc.name) };
    const country = nameOf(addr.addressCountry);
    return { city: str(addr.addressLocality), country: country && country.length > 2 ? country : COUNTRY_CODES[country?.toUpperCase() ?? ""] ?? country, venue: str(loc.name) };
  }
  return {};
}

const COUNTRY_CODES: Record<string, string> = {
  IN: "India", GB: "United Kingdom", UK: "United Kingdom", US: "United States", DE: "Germany", NL: "Netherlands", FR: "France", AT: "Austria",
  ES: "Spain", DK: "Denmark", FI: "Finland", CA: "Canada", JP: "Japan", KR: "South Korea", SG: "Singapore", CN: "China", AU: "Australia",
  MX: "Mexico", BR: "Brazil", IT: "Italy", CH: "Switzerland", SE: "Sweden", NO: "Norway", BE: "Belgium", PT: "Portugal", IE: "Ireland",
};

const EMPLOYMENT: Record<string, string> = { full_time: "full_time", part_time: "part_time", contractor: "contract", temporary: "contract", intern: "full_time", freelance: "freelance" };

function fromJsonLd(objs: Json[]): Suggested {
  const s: Suggested = {};
  for (const o of objs) {
    const t = typesOf(o);
    const has = (...names: string[]) => names.some((n) => t.includes(n));
    if (has("jobposting")) {
      s.type ??= "job";
      s.role_title ??= str(o.title);
      s.organisation_name ??= nameOf(o.hiringOrganization);
      s.deadline ??= isoDate(o.validThrough);
      const emp = asArray(o.employmentType as string | string[]).map((e) => EMPLOYMENT[String(e).toLowerCase()]).find(Boolean);
      s.employment ??= emp;
      if (String(o.employmentType ?? "").toLowerCase().includes("intern")) s.kind ??= "intern";
      if (String(o.jobLocationType ?? "").toUpperCase().includes("TELECOMMUTE")) {
        s.is_remote = true;
        s.work_mode ??= "remote";
      }
      const a = address(o.jobLocation);
      s.city ??= a.city;
      s.country ??= a.country;
    } else if (has("event", "festival", "exhibitionevent", "educationevent", "socialevent", "businessevent")) {
      s.type ??= "event";
      if (t.includes("festival")) s.kind ??= "festival";
      if (t.includes("exhibitionevent")) s.kind ??= "exhibition";
      s.start_date ??= isoDate(o.startDate);
      s.end_date ??= isoDate(o.endDate);
      const a = address(o.location);
      s.city ??= a.city;
      s.country ??= a.country;
      s.venue ??= a.venue;
      if (/online/i.test(String(o.eventAttendanceMode ?? ""))) s.is_remote = true;
      s.organisation_name ??= nameOf(o.organizer);
      const free = asArray(o.offers as Json | Json[]).find((x) => x && typeof x === "object" && x.price != null);
      if (free) s.is_free ??= Number(free.price) === 0 ? "yes" : "no";
    } else if (has("course", "educationaloccupationalprogram")) {
      s.type ??= "program";
      s.organisation_name ??= nameOf(o.provider);
      if (/online/i.test(JSON.stringify(o.hasCourseInstance ?? o.educationalProgramMode ?? ""))) s.is_remote = true;
      s.deadline ??= isoDate(o.applicationDeadline);
    } else if (has("article", "newsarticle", "blogposting", "scholarlyarticle", "report")) {
      s.type ??= "resource";
      s.kind ??= t.includes("scholarlyarticle") ? "journal" : "article";
      s.author ??= nameOf(o.author);
      s.publisher ??= nameOf(o.publisher);
    } else if (has("book")) {
      s.type ??= "resource";
      s.kind ??= "book";
      s.author ??= nameOf(o.author);
      s.publisher ??= nameOf(o.publisher);
    } else if (has("podcastseries", "podcastepisode")) {
      s.type ??= "resource";
      s.kind ??= "podcast";
      s.author ??= nameOf(o.author);
    } else if (has("softwareapplication", "softwaresourcecode")) {
      s.type ??= "resource";
      s.kind ??= "tool";
      s.author ??= nameOf(o.author ?? o.creator);
      const offer = asArray(o.offers as Json | Json[])[0];
      if (offer && offer.price != null) s.is_free ??= Number(offer.price) === 0 ? "yes" : "no";
    } else if (has("collegeoruniversity", "educationalorganization")) {
      s.type ??= "organisation";
      s.kind ??= "institution";
      const a = address(o.address ? { address: o.address } : o.location);
      s.city ??= a.city;
      s.country ??= a.country;
    } else if (has("organization", "corporation", "localbusiness", "ngo")) {
      // Most sites declare an Organization alongside the real content; only use it for location.
      const a = address(o.address ? { address: o.address } : o.location);
      s.city ??= a.city;
      s.country ??= a.country;
      s.publisher ??= str(o.name);
    }
  }
  return s;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Parse "15 January 2027", "January 15, 2027" or "2027-01-15". Returns null if the year is missing. */
export function parseDateText(s: string): string | null {
  const iso = s.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const mon = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
  const dmy = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${mon},?\\s+(20\\d{2})\\b`, "i"));
  const mdy = s.match(new RegExp(`\\b${mon}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2})\\b`, "i"));
  let d: number, m: number, y: number;
  if (dmy) [d, m, y] = [Number(dmy[1]), MONTHS.indexOf(dmy[2].slice(0, 3).toLowerCase()) + 1, Number(dmy[3])];
  else if (mdy) [d, m, y] = [Number(mdy[2]), MONTHS.indexOf(mdy[1].slice(0, 3).toLowerCase()) + 1, Number(mdy[3])];
  else return null;
  if (m < 1 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** The first sentence that clearly states a deadline with a full date, and that date. */
export function findDeadline(text: string): { date: string; sentence: string } | null {
  const sentences = text.slice(0, 20_000).split(/(?<=[.!?])\s+|\s{2,}|\s[|•·]\s/);
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (sentence.length > 300 || !/\b(deadline|apply by|applications? (?:close|due|open until)|submissions? (?:close|due)|closing date|closes on|due by|entries close)\b/i.test(sentence)) continue;
    const date = parseDateText(sentence);
    if (date) return { date, sentence };
  }
  return null;
}

/** Keyword hints for the discipline taxonomy (matched on title + description + start of text). */
const DISCIPLINE_HINTS: Record<string, RegExp> = {
  "creative-coding": /\b(creative cod|p5\.js|processing\.org|openframeworks|touchdesigner|three\.js|shader)/i,
  "interaction-design": /\binteraction design/i,
  "experience-design": /\b(experience design|experiential|immersive experience)/i,
  "spatial-xr": /\b(xr|vr|ar|virtual reality|augmented reality|mixed reality|spatial computing)\b/i,
  installation: /\b(installation art|interactive installation|installations)\b/i,
  "projection-mapping": /\bprojection mapping/i,
  "ai-art": /\b(ai art|machine learning art|generative ai|artificial intelligence)\b/i,
  "sound-music-tech": /\b(sound art|music tech|audio-visual|audiovisual|sonic)\b/i,
  "generative-art": /\bgenerative art|generative design\b/i,
  "physical-computing": /\b(physical computing|arduino|raspberry pi|microcontroller)\b/i,
  "game-design": /\b(game design|video games?|unreal engine|game jam)\b/i,
  "data-visualisation": /\bdata vi[sz]uali[sz]ation|dataviz\b/i,
  "service-design": /\bservice design\b/i,
  research: /\b(research lab|call for papers|journal|symposium)\b/i,
  "ui-ux-design": /\b(ui\/ux|ux\/ui|ux design|ui design|user experience|user interface|ux research)\b/i,
  "product-design": /\b(product design|industrial design|product designer)\b/i,
  "design-engineering": /\b(design engineer|design engineering|design technologist)/i,
  "motion-design": /\b(motion design|motion graphics|animation|animator|after effects)\b/i,
  "3d-real-time": /\b(3d (?:art|graphics|modell?ing|design)|real-time (?:3d|graphics|rendering)|cgi|blender|houdini|cinema 4d|unreal engine)\b/i,
  "technical-art": /\btechnical art(?:ist)?\b/i,
  "creative-direction": /\b(creative direct(?:or|ion)|art direct(?:or|ion))\b/i,
  "web-development": /\b(front-?end|web develop|webgl|full-?stack)\b/i,
  "graphic-design": /\b(graphic design|visual design|brand design|typography)\b/i,
  robotics: /\brobotics?\b/i,
  "machine-learning": /\b(machine learning|deep learning|neural net|computer vision)\b/i,
  "architecture-spatial": /\b(architecture|spatial design|exhibition design|scenograph)/i,
  "wearables-fashion-tech": /\b(wearables?|fashion tech|e-textiles?|smart textiles?)\b/i,
  production: /\b(producer|production manager|project manager|project management|studio manager)\b/i,
};

export function suggestDisciplines(haystack: string, allowed?: string[]): string[] {
  return Object.entries(DISCIPLINE_HINTS)
    .filter(([slug, re]) => (!allowed || allowed.includes(slug)) && re.test(haystack))
    .map(([slug]) => slug)
    .slice(0, 4);
}

/** Very light guess from the URL/title when the page has no structured data. */
export function guessType(s: string): EntryType {
  s = s.toLowerCase();
  if (/\b(job|career|hiring|vacanc|position)/.test(s)) return "job";
  if (/\b(open call|call for|residency|grant|fellowship|commission|competition|prize|submission)/.test(s)) return "opportunity";
  if (/\b(m\.?des|master|mfa|msc|bachelor|b\.?des|phd|course|programme|program|summer school|admission)/.test(s)) return "program";
  if (/\b(festival|conference|exhibition|meetup|workshop|hackathon|biennale|symposium)/.test(s)) return "event";
  if (/\b(magazine|journal|newsletter|podcast|book|article|blog|library|tool|archive|directory)/.test(s)) return "resource";
  return "organisation";
}

function guessKind(type: EntryType, s: string): string | undefined {
  s = s.toLowerCase();
  const values = KINDS[type].values;
  const hits: Record<string, RegExp> = {
    newsletter: /newsletter|substack/, podcast: /podcast/, magazine: /magazine/, journal: /journal/, book: /\bbook\b/, tool: /\btool\b|github\.com/,
    community: /community|discord|forum/, directory: /directory|awesome-/, archive: /archive/, library: /library/, talk: /\btalk\b|youtube\.com|vimeo\.com/,
    residency: /residenc/, grant: /\bgrant/, fellowship: /fellowship/, competition: /competition|prize|award/, call_for_papers: /call for papers|cfp/,
    commission: /commission/, festival_submission: /festival submission/, open_call: /open call/,
    festival: /festival/, conference: /conference|symposium/, exhibition: /exhibition/, meetup: /meetup/, workshop: /workshop/, hackathon: /hackathon|game jam/,
    summer_school: /summer school/, short_course: /short course/, online_course: /online course/, phd: /\bph\.?d/, masters: /master|\bmfa\b|\bm\.?des\b|\bma\b|\bmsc\b/, bachelors: /bachelor|\bb\.?des\b/,
    intern: /intern/, senior: /senior/, lead: /\blead\b|head of|director/, junior: /junior/,
    studio: /studio/, lab: /\blab\b/, collective: /collective/, funder: /foundation|fund\b/,
  };
  // Check in the order above (specific before generic, e.g. residency before open_call).
  return Object.keys(hits).find((k) => values.includes(k) && hits[k].test(s));
}

/**
 * Pull everything we can from the page. `meta` is the page's <meta> map (lowercased keys),
 * `text` its visible text. Pure, so it's unit-tested without the network.
 */
export function extractSuggestions(input: { html: string; meta: Record<string, string>; url: string; title: string | null; description: string | null; site_name: string | null; text: string }): Suggested {
  const { html, meta, url, title, description, site_name, text } = input;
  const s = fromJsonLd(jsonLdObjects(html));
  const haystack = `${url} ${title ?? ""} ${description ?? ""}`;

  const ogType = (meta["og:type"] ?? "").toLowerCase();
  // Words in the URL/title ("festival", "MA", "open call") beat og:type, which many CMSs set to "article" on every page.
  const keywordType = guessType(haystack);
  if (!s.type && keywordType !== "organisation") s.type = keywordType;
  if (!s.type && (ogType === "article" || ogType === "book" || ogType.startsWith("music") || ogType.startsWith("video"))) {
    s.type = "resource";
    s.kind ??= ogType === "book" ? "book" : ogType.startsWith("video") ? "talk" : "article";
  }
  s.type ??= guessType(haystack);
  s.kind ??= guessKind(s.type, haystack);

  if (s.type === "resource") {
    const author = meta["author"] ?? meta["article:author"] ?? meta["twitter:creator"] ?? meta["dc.creator"];
    if (author && !/^https?:/.test(author)) s.author ??= author.replace(/^@/, "");
    s.publisher ??= site_name ?? undefined;
  }

  if (s.type === "opportunity" || s.type === "program" || s.type === "job") {
    const found = !s.deadline ? findDeadline(text) : null;
    if (found) {
      s.deadline = found.date;
      s.deadline_source_text = found.sentence;
    }
  }

  if (!s.is_remote && /\b(fully remote|remote[- ]first|100% remote|online programme|online program|virtual event|takes place online)\b/i.test(`${haystack} ${text.slice(0, 5000)}`)) s.is_remote = true;

  // Title, description and the opening of the page only: deeper text is mostly navigation and listings.
  const disciplines = suggestDisciplines(`${haystack} ${text.slice(0, 1500)}`);
  if (disciplines.length) s.disciplines = disciplines;

  // Drop empties so the client can treat "present" as "found".
  return Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && !v.length))) as Suggested;
}
