"use client";
import { useState } from "react";
import { Segment, Segmented, segmentClass } from "@/components/ui/layout";
import PlaceMenu from "@/components/ui/PlaceMenu";

/** Lens toggle as it will look in the top bar: Global, or a place picked from a menu. */
export function LensToggleDemo() {
  const [place, setPlace] = useState<string | null>("India");
  return (
    <div className="relative flex flex-wrap items-center gap-4">
      <Segmented label="Geographic lens">
        <Segment active={!place} onClick={() => setPlace(null)}>
          Global
        </Segment>
        <PlaceMenu
          label={place ?? "Choose a place"}
          value={place ?? ""}
          groups={[{ label: "Places", options: ["India", "South Asia", "Germany", "Europe", "Brazil"].map((p) => ({ value: p, label: p })) }]}
          onSelect={setPlace}
          className={`inline-flex items-center ${segmentClass(!!place)}`}
        />
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
