import { isTool, type Entry, type EntryType, type Section } from "./types";

/**
 * The secondary palette (DESIGN.md → Colour). Each mode defines --swatch-1…7:
 * Document (paper) = paper-square colours, Monitor (night) = gradient-tile colours, Blueprint = all one blue.
 * 1–5 are the general palette (also hashed onto disciplines and fallback blocks); 6 and 7 belong only to
 * Publications & Resources and Tools. Swatches are for fills, tints and marks — never small text.
 */
export type Swatch = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** The general palette that disciplines, skills and fallback blocks are hashed onto. */
export const SWATCHES: readonly Swatch[] = [1, 2, 3, 4, 5];

export const swatchVar = (n: Swatch) => `var(--swatch-${n})`;

/** A soft ground: the swatch mixed into the page background. */
export const tintVar = (n: Swatch, pct = 22) => `color-mix(in srgb, var(--swatch-${n}) ${pct}%, var(--bg))`;

/**
 * One colour per entry type, used for type marks and image grounds across every page.
 * Tools are resources too but have their own colour: use entrySwatch / sectionSwatch for those.
 */
export const TYPE_SWATCH: Record<EntryType, Swatch | null> = {
  opportunity: 1, // red / coral
  program: 2, // blue / sage
  job: 3, // green / pink
  event: 4, // mustard / cobalt
  organisation: 5, // pink / orange
  resource: 6, // violet / sand
};

/** Tools' own colour (teal / lavender). */
export const TOOL_SWATCH: Swatch = 7;

/** An entry's colour: its type's, or the Tools colour for a tool. */
export const entrySwatch = (e: Pick<Entry, "type" | "data">): Swatch | null => (isTool(e) ? TOOL_SWATCH : TYPE_SWATCH[e.type]);

/** A section's colour: the Tools section is a slice of resources with its own colour. */
export const sectionSwatch = (s: Pick<Section, "type" | "kind">): Swatch | null => (s.kind ? TOOL_SWATCH : TYPE_SWATCH[s.type]);

/** Stable swatch for any string (disciplines, skills, cities): same key → same colour everywhere. */
export function swatchFor(key: string): Swatch {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((((h >>> 0) % 5) + 1) as Swatch);
}
