"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { setLensAction } from "@/app/actions/lens";
import { findPlaceSlug, parseLensSlug } from "@/lib/lens";
import type { Geo } from "@/lib/types";
import { segmentClass } from "@/components/ui/layout";
import PlaceMenu from "@/components/ui/PlaceMenu";

/**
 * Global, or any country/region. The choice goes in the URL (?lens=) and is remembered per user.
 * "Other place" opens a box for typing a country that has nothing in the catalogue yet.
 */
export default function LensSwitch({ fallback, geo }: { fallback: string; geo: Geo }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = parseLensSlug(params.get("lens")) ?? fallback;
  const [pending, start] = useTransition();

  const place =
    geo.countries.find((c) => c.slug === current)?.name ?? geo.regions.find((r) => r.slug === current)?.name ?? null;
  const isGlobal = !place;
  // Only places in the catalogue are listed; the rest are typed into the "Other place" box.
  const unlisted = geo.countries.filter((c) => !c.hasEntries);
  const listedRegions = geo.regions.filter((r) => geo.countries.some((c) => c.region === r.name && c.hasEntries));
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [unknown, setUnknown] = useState<string | null>(null);

  function closeBox() {
    setTyping(false);
    setTyped("");
    setUnknown(null);
  }

  function submitPlace(e: React.FormEvent) {
    e.preventDefault();
    const slug = findPlaceSlug(typed, geo);
    if (!slug) return setUnknown(typed.trim() || null);
    closeBox();
    choose(slug);
  }

  const option = (p: { slug: string; name: string }) => ({ value: p.slug, label: p.name });
  const groups = [
    { label: "Regions", options: listedRegions.map(option) },
    ...geo.regions.map((r) => ({ label: r.name, options: geo.countries.filter((c) => c.region === r.name && c.hasEntries).map(option) })),
  ].filter((g) => g.options.length);

  function choose(slug: string) {
    // One change at a time: ignore picks until the last one has been applied.
    if (pending) return;
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
  const pill = (active: boolean) => `${segmentClass(active)} flex h-full flex-auto items-center justify-center py-0! px-3.5! aria-disabled:cursor-wait!`;

  return (
    <div className="relative flex min-w-0 max-w-full items-center gap-3">
      {/* No visible "Lens" label: Global / a place reads on its own; the tooltip and aria-label explain it. */}
      <div role="group" aria-label="Geographic lens" title="Lens: see the field globally, or from one country or region" aria-busy={pending} className={`flex h-8 min-w-0 flex-1 items-center rounded-full border border-line p-0.5 transition-opacity ${pending ? "opacity-60" : ""}`}>
        <button type="button" aria-pressed={isGlobal} aria-disabled={pending} onClick={() => choose("global")} className={pill(isGlobal)}>
          Global
        </button>
        {/* A typed place isn't in the list, so no row is marked for it (the pill still names it). */}
        <PlaceMenu
          label={place ?? "Choose a place"}
          value={isGlobal ? "" : current}
          groups={groups}
          disabled={pending}
          onSelect={(slug) => { closeBox(); choose(slug); }}
          other={{ label: "Other place", onSelect: () => setTyping(true) }}
          className={`max-w-56 ${pill(!isGlobal)}`}
        />
      </div>
      {typing && (
        <form
          onSubmit={submitPlace}
          onKeyDown={(e) => e.key === "Escape" && closeBox()}
          className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] space-y-2 border border-ink bg-bg p-3 sm:left-auto sm:right-0"
        >
          <label htmlFor="other-place" className="label">See what’s open to another place</label>
          <div className="flex gap-2">
            <input
              id="other-place"
              list="other-places"
              value={typed}
              onChange={(e) => { setTyped(e.target.value); setUnknown(null); }}
              placeholder="Type a country or region"
              autoComplete="off"
              autoFocus
              className="field min-w-0"
            />
            <button type="submit" className={`${segmentClass(true)} px-3.5!`}>Show</button>
          </div>
          <datalist id="other-places">
            {[...unlisted, ...geo.regions.filter((r) => !listedRegions.includes(r))].map((p) => <option key={p.slug} value={p.name} />)}
          </datalist>
          {unknown && (
            <p role="alert" className="text-body-s text-ink-muted">
              “{unknown}” isn’t available yet. Choose its region from the list instead.
            </p>
          )}
          <button type="button" onClick={closeBox} className="text-body-s text-ink-muted underline hover:text-ink">Cancel</button>
        </form>
      )}
    </div>
  );
}
