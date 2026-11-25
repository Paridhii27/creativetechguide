import type { Entry } from "./types";

export const ICON_CHOICES = ["favicon", "image", "letter"] as const;
export type IconChoice = (typeof ICON_CHOICES)[number];

type IconEntry = Pick<Entry, "type" | "favicon_url" | "image_url" | "data">;

/**
 * The picture to show for an entry, or null for just the first letter.
 * `data.icon` is the owner's choice (the site's favicon, the page image, or the letter); entries
 * without a choice keep the old behaviour: favicon, else the page image (cards only show it for organisations).
 */
export function entryIconUrl(e: IconEntry, opts: { card?: boolean } = {}): string | null {
  switch (e.data?.icon) {
    case "letter":
      return null;
    case "favicon":
      return e.favicon_url ?? null;
    case "image":
      return e.image_url ?? null;
    default:
      return e.favicon_url ?? (!opts.card || e.type === "organisation" ? e.image_url : null);
  }
}

/** The choice to preselect: what was saved, else favicon, else image, else the letter. */
export function defaultIconChoice(saved: unknown, favicon?: string | null, image?: string | null): IconChoice {
  if (typeof saved === "string" && (ICON_CHOICES as readonly string[]).includes(saved)) return saved as IconChoice;
  return favicon ? "favicon" : image ? "image" : "letter";
}

/**
 * The picture for list rows and cards in the field-guide design. Honours the owner's icon choice;
 * otherwise prefers the page image (cropped) over the favicon (kept small and centred).
 * `src: null` → the palette letter block.
 */
export function entryPicture(e: IconEntry): { src: string | null; fit: "cover" | "icon" } {
  switch (e.data?.icon) {
    case "letter":
      return { src: null, fit: "cover" };
    case "favicon":
      return { src: e.favicon_url ?? null, fit: "icon" };
    case "image":
      return { src: e.image_url ?? null, fit: "cover" };
    default:
      return e.image_url ? { src: e.image_url, fit: "cover" } : { src: e.favicon_url ?? null, fit: "icon" };
  }
}
