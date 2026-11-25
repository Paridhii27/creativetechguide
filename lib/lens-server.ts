import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { GLOBAL_LENS, LENS_COOKIE, buildLens, parseLensSlug } from "./lens";
import { getGeo } from "./db/entries";
import type { Lens } from "./types";

const geo = cache(getGeo);

/** Lens precedence: URL ?lens= → cookie (set when the user switches; mirrors profiles.preferred_lens) → Global. */
export async function resolveLens(param?: string | string[]): Promise<Lens> {
  const g = await geo();
  const fromUrl = buildLens(parseLensSlug(Array.isArray(param) ? param[0] : param), g);
  if (fromUrl) return fromUrl;
  return cookieLens();
}

export async function cookieLens(): Promise<Lens> {
  const jar = await cookies();
  return buildLens(parseLensSlug(jar.get(LENS_COOKIE)?.value), await geo()) ?? GLOBAL_LENS;
}

export const getGeoCached = geo;
