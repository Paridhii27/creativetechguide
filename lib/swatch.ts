import type { EntryType } from "./types";

/**
 * The five-colour secondary palette (DESIGN.md → Colour). Each mode defines --swatch-1…5:
 * Document (paper) = paper-square colours, Monitor (night) = gradient-tile colours, Blueprint = all one blue.
 * Swatches are for fills, tints and marks — never small text.
 */
export type Swatch = 1 | 2 | 3 | 4 | 5;

export const SWATCHES: readonly Swatch[] = [1, 2, 3, 4, 5];

export const swatchVar = (n: Swatch) => `var(--swatch-${n})`;

/** A soft ground: the swatch mixed into the page background. */
export const tintVar = (n: Swatch, pct = 22) => `color-mix(in srgb, var(--swatch-${n}) ${pct}%, var(--bg))`;

/**
 * One colour per entry type, used for type marks and image grounds across every page.
 * Resources have no fill of their own: they show an outlined mark.
 */
export const TYPE_SWATCH: Record<EntryType, Swatch | null> = {
  opportunity: 1, // red / coral
  program: 2, // blue / sage
  job: 3, // green / pink
  event: 4, // mustard / cobalt
  organisation: 5, // pink / orange
  resource: null,
};

/** Stable swatch for any string (disciplines, skills, cities): same key → same colour everywhere. */
export function swatchFor(key: string): Swatch {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((((h >>> 0) % 5) + 1) as Swatch);
}
