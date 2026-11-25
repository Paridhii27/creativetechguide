"use client";
import { useState } from "react";
import { Segment, Segmented, segmentClass } from "@/components/ui/layout";

/** Lens toggle as it will look in the top bar: Global, or a place picked from a menu. */
export function LensToggleDemo() {
  const [place, setPlace] = useState<string | null>("India");
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Segmented label="Geographic lens">
        <Segment active={!place} onClick={() => setPlace(null)}>
          Global
        </Segment>
        <label className={`relative inline-flex cursor-pointer items-center gap-1 ${segmentClass(!!place)}`}>
          <span>{place ?? "Choose a place"}</span>
          <span aria-hidden>▾</span>
          <select
            aria-label="Lens: choose a country or region"
            value={place ?? ""}
            onChange={(e) => setPlace(e.target.value || null)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="" disabled>
              Choose a place
            </option>
            {["India", "South Asia", "Germany", "Europe", "Brazil"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </Segmented>
      <span className="text-micro text-ink-muted">Lens — {place ?? "Global"}</span>
    </div>
  );
}

/** Bento pill toggle. */
export function BentoToggleDemo() {
  const [v, setV] = useState("week");
  return (
    <Segmented label="Window">
      {["week", "month", "year"].map((k) => (
        <Segment key={k} active={v === k} onClick={() => setV(k)}>
          {k}
        </Segment>
      ))}
    </Segmented>
  );
}
