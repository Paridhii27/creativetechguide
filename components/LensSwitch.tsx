"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { setLensAction } from "@/app/actions/lens";
import { parseLensSlug } from "@/lib/lens";
import type { Geo } from "@/lib/types";
import { segmentClass } from "@/components/ui/layout";

/** Global, or any country/region. The choice goes in the URL (?lens=) and is remembered per user. */
export default function LensSwitch({ fallback, geo }: { fallback: string; geo: Geo }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = parseLensSlug(params.get("lens")) ?? fallback;
  const [pending, start] = useTransition();

  const place =
    geo.countries.find((c) => c.slug === current)?.name ?? geo.regions.find((r) => r.slug === current)?.name ?? null;
  const isGlobal = !place;

  function choose(slug: string) {
    const next = new URLSearchParams(params);
    next.set("lens", slug);
    next.delete("page");
    next.delete("relevance");
    start(async () => {
      await setLensAction(slug);
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  // Same outer height as the My Layer pill beside it (border + 2px inset + a py-1 segment = its py-1.5).
  const pill = (active: boolean) => `${segmentClass(active)} py-1! px-3.5!`;

  return (
    <div className="flex items-center gap-3">
      {/* No visible "Lens" label: Global / a place reads on its own; the tooltip and aria-label explain it. */}
      <div role="group" aria-label="Geographic lens" title="Lens: see the field globally, or from one country or region" className={`flex items-center rounded-full border border-line p-0.5 transition-opacity ${pending ? "opacity-60" : ""}`}>
        <button type="button" aria-pressed={isGlobal} onClick={() => choose("global")} className={pill(isGlobal)}>
          Global
        </button>
        <label className={`relative flex max-w-48 cursor-pointer items-center gap-1 ${pill(!isGlobal)}`}>
          <span className="truncate">{place ?? "Choose a place"}</span>
          <span aria-hidden className="text-body-s leading-none opacity-70">▾</span>
          <select
            aria-label="Lens: choose a country or region"
            value={isGlobal ? "" : current}
            onChange={(e) => e.target.value && choose(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="" disabled>
              Choose a country or region
            </option>
            <optgroup label="Regions">
              {geo.regions.map((r) => (
                <option key={r.slug} value={r.slug}>{r.name}</option>
              ))}
            </optgroup>
            {geo.regions.map((r) => {
              const cs = geo.countries.filter((c) => c.region === r.name);
              return cs.length ? (
                <optgroup key={r.slug} label={r.name}>
                  {cs.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </optgroup>
              ) : null;
            })}
          </select>
        </label>
      </div>
    </div>
  );
}
