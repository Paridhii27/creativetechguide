/** Pictures a web page offers for an entry: its icons and logos first, then its larger images. */
export interface PageImage {
  url: string;
  /** logo: shown centred with room around it · photo: fills the picture area */
  slot: "logo" | "photo";
}

const MAX_LOGOS = 12;
const MAX_PHOTOS = 12;

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "").replace(/&amp;/g, "&").trim() : "";
};

/** The widest address in a srcset ("a.jpg 400w, b.jpg 1200w"). Addresses may contain commas, so split on ", ". */
function widest(srcset: string): string {
  let best = { url: "", size: 0 };
  for (const part of srcset.split(/,\s+/)) {
    const [url, descriptor = ""] = part.trim().split(/\s+/);
    const size = parseFloat(descriptor) || 1;
    if (url && size > best.size) best = { url, size };
  }
  return best.url;
}

/** Pure HTML → candidate images, absolute http(s) addresses only, no duplicates. */
export function findImages(html: string, baseUrl: string): PageImage[] {
  const seen = new Set<string>();
  const logos: PageImage[] = [];
  const photos: PageImage[] = [];
  const add = (href: string, slot: PageImage["slot"]) => {
    if (!href) return;
    let u: URL;
    try {
      u = new URL(href, baseUrl);
    } catch {
      return;
    }
    if ((u.protocol !== "http:" && u.protocol !== "https:") || seen.has(u.toString())) return;
    seen.add(u.toString());
    (slot === "logo" ? logos : photos).push({ url: u.toString(), slot });
  };
  const clean = html.replace(/<!--[\s\S]*?-->/g, " ");

  // Images the page calls a logo, wherever it says so (address, description, class or id).
  const images = clean.match(/<img\b[^>]*>/gi) ?? [];
  const sourceOf = (tag: string) => {
    const set = attr(tag, "srcset") || attr(tag, "data-srcset");
    return (set && widest(set)) || attr(tag, "data-src") || attr(tag, "src");
  };
  const isLogo = (tag: string) => /logo/i.test(["src", "data-src", "alt", "class", "id"].map((n) => attr(tag, n)).join(" "));
  for (const tag of images) if (isLogo(tag)) add(sourceOf(tag), "logo");

  // Declared icons, largest first.
  const icons: { href: string; size: number }[] = [];
  for (const tag of clean.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = attr(tag, "rel").toLowerCase();
    if (!/(^|\s)(icon|apple-touch-icon|apple-touch-icon-precomposed|fluid-icon)(\s|$)/.test(rel)) continue;
    const href = attr(tag, "href");
    const svg = /\.svg(\?|$)/i.test(href);
    icons.push({ href, size: svg ? 2000 : parseInt(attr(tag, "sizes"), 10) || (rel.includes("apple") ? 180 : 1) });
  }
  for (const i of icons.sort((a, b) => b.size - a.size)) add(i.href, "logo");
  add("/apple-touch-icon.png", "logo");

  for (const tag of clean.match(/<meta\b[^>]*>/gi) ?? []) {
    if (/^(og:image(:url|:secure_url)?|twitter:image(:src)?)$/i.test(attr(tag, "property") || attr(tag, "name"))) add(attr(tag, "content"), "photo");
  }
  for (const tag of images) {
    // Skip what the page itself sizes as tiny: tracking pixels, arrows, social buttons.
    const declared = [attr(tag, "width"), attr(tag, "height")].map((v) => parseInt(v, 10)).filter(Boolean);
    if (declared.some((n) => n < 48) || isLogo(tag)) continue;
    add(sourceOf(tag), "photo");
  }

  return [...logos.slice(0, MAX_LOGOS), ...photos.slice(0, MAX_PHOTOS)];
}
