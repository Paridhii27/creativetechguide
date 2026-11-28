"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { surpriseAction, type Surprise } from "@/app/actions/surprise";
import PlaceMenu from "@/components/ui/PlaceMenu";
import { BracketLabel, Mark } from "@/components/ui/primitives";
import { sectionSwatch, swatchVar } from "@/lib/swatch";
import { SECTIONS, type MapPoint } from "@/lib/types";

const R = 100;
const RAD = Math.PI / 180;
const MAX_ZOOM = 3;
/** Sections the globe can be filtered to. Tools have no location, so they aren't offered. */
const MAPPED = SECTIONS.filter((s) => s.slug !== "tools");

/** Orthographic projection: a point `lift` globe-radii above the surface, seen from above (lat0, lng0). z > 0 faces us. */
function project(lat: number, lng: number, lat0: number, lng0: number, lift = 0) {
  const p = lat * RAD, p0 = lat0 * RAD, l = (lng - lng0) * RAD;
  const k = R * (1 + lift);
  return {
    x: k * Math.cos(p) * Math.sin(l),
    y: -k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)),
    z: Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l),
  };
}

/** A faint field of dots instead of grid lines, thinned towards the poles. */
const DOTS = Array.from({ length: 17 }, (_, i) => -80 + i * 10).flatMap((lat) => {
  const n = Math.max(6, Math.round(48 * Math.cos(lat * RAD)));
  return Array.from({ length: n }, (_, j) => ({ lat, lng: (360 / n) * j - 180 }));
});

const keyOf = (p: MapPoint) => `${p.city}|${p.country}`;
const f = (n: number) => n.toFixed(2);

/**
 * The home page globe, drawn from the catalogue itself: no coastlines, only the cities that have entries,
 * each a spike as tall as its count. Drag to spin, point at a city to read it, filter by section.
 */
export default function FieldGlobe({ points, total, closing, lens, lensLabel, home }: { points: MapPoint[]; total: number; closing: { week: number; sixtyDays: number }; lens: string; lensLabel: string; home: string[] }) {
  const isHome = (p: MapPoint) => home.includes(p.country.toLowerCase());
  // Start facing the lens place (its busiest city), otherwise Europe–South Asia.
  const [view, setView] = useState(() => {
    const here = points.filter(isHome).sort((a, b) => sum(b.counts) - sum(a.counts))[0];
    return here ? { lat: clamp(here.lat), lng: here.lng } : { lat: 22, lng: 40 };
  });
  const [zoom, setZoom] = useState(1);
  const [section, setSection] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [inside, setInside] = useState(false);
  const [spin, setSpin] = useState(home.length === 0);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  /** the entry "Surprise me" turned up, shown on its city's card */
  const [surprise, setSurprise] = useState<(NonNullable<Surprise> & { key: string }) | null>(null);
  const [looking, setLooking] = useState(false);
  const flight = useRef(0);
  const land = () => cancelAnimationFrame(flight.current);
  useEffect(() => land, []);

  useEffect(() => {
    if (!spin || inside || picked || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last = performance.now();
    const turn = (now: number) => {
      const dt = now - last;
      // About 30 frames a second is plenty for a slow turn.
      if (dt > 32) {
        last = now;
        setView((v) => ({ ...v, lng: v.lng + Math.min(dt, 100) * 0.004 }));
      }
      frame = requestAnimationFrame(turn);
    };
    frame = requestAnimationFrame(turn);
    return () => cancelAnimationFrame(frame);
  }, [spin, inside, picked]);

  /** Whether it's set to turn (hovering holds it for a moment without changing this). */
  const turning = spin && !picked;

  const countOf = (p: MapPoint) => (section ? (p.counts[section] ?? 0) : sum(p.counts));
  const shown = points.filter((p) => countOf(p) > 0);
  const max = Math.max(1, ...shown.map(countOf));
  const activeKey = hover ?? picked;
  const active = shown.find((p) => keyOf(p) === activeKey);
  const chosen = shown.find((p) => keyOf(p) === picked);
  const current = SECTIONS.find((s) => s.slug === section);
  const color = current ? swatchVar(sectionSwatch(current) ?? 5) : "var(--accent)";

  const focus = (p: MapPoint) => {
    land();
    setPicked(keyOf(p));
    setView({ lat: clamp(p.lat), lng: p.lng });
  };

  /** Turns to a city over a second or so, the short way round. */
  const flyTo = (p: MapPoint) => {
    land();
    setPicked(keyOf(p));
    const to = { lat: clamp(p.lat), lng: p.lng };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setView(to);
    const from = view;
    const east = ((((to.lng - from.lng) % 360) + 540) % 360) - 180;
    const began = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / 1200);
      const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      setView({ lat: from.lat + (to.lat - from.lat) * eased, lng: from.lng + east * eased });
      if (t < 1) flight.current = requestAnimationFrame(step);
    };
    flight.current = requestAnimationFrame(step);
  };

  const surpriseMe = async () => {
    const others = shown.filter((p) => keyOf(p) !== picked);
    const p = others[Math.floor(Math.random() * others.length)] ?? shown[0];
    if (!p) return;
    setHover(null);
    setSurprise(null);
    setLooking(true);
    flyTo(p);
    try {
      const found = await surpriseAction(p.city, section);
      if (found) setSurprise({ ...found, key: keyOf(p) });
    } catch {
      /* no entry to show: the city's card still lists what's there */
    } finally {
      setLooking(false);
    }
  };

  return (
    <figure>
      <div className="bg-specimen-grid relative aspect-square w-full overflow-hidden border border-line" onPointerEnter={() => setInside(true)} onPointerLeave={() => { setInside(false); setHover(null); }}>
        <svg
          viewBox="-130 -130 260 260"
          role="group"
          aria-label="Globe of cities with entries. Drag to spin, or choose a city from the menu below."
          // Sideways drags spin the globe; up-and-down swipes still scroll the page.
          className="absolute inset-0 h-full w-full cursor-grab touch-pan-y select-none text-ink active:cursor-grabbing"
          onPointerDown={(e) => { land(); drag.current = { x: e.clientX, y: e.clientY, moved: false }; }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const dx = e.clientX - d.x, dy = e.clientY - d.y;
            if (!d.moved && Math.hypot(dx, dy) < 4) return;
            // Capture only once it's a drag, so a plain click still reaches the city under the pointer.
            if (!d.moved) e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, moved: true };
            setSpin(false);
            const speed = 0.4 / zoom;
            setView((v) => ({ lat: clamp(v.lat + dy * speed), lng: v.lng - dx * speed }));
          }}
          onPointerUp={() => {
            if (drag.current && !drag.current.moved) setPicked(null);
            drag.current = null;
          }}
          onPointerCancel={() => { drag.current = null; }}
        >
          <g transform={`scale(${zoom})`}>
            <circle r={R} fill="var(--bg)" stroke="currentColor" strokeOpacity="0.35" strokeWidth={0.6 / zoom} />
            {DOTS.map((d, i) => {
              const q = project(d.lat, d.lng, view.lat, view.lng);
              return q.z > 0 ? <circle key={i} cx={f(q.x)} cy={f(q.y)} r={0.7 / zoom} fill="currentColor" opacity={f(0.12 + 0.35 * q.z)} /> : null;
            })}
            {shown
              .map((p) => ({ p, foot: project(p.lat, p.lng, view.lat, view.lng), tip: project(p.lat, p.lng, view.lat, view.lng, (0.03 + 0.25 * Math.sqrt(countOf(p) / max)) / zoom) }))
              .filter((m) => m.foot.z > 0)
              // Nearest drawn last, so it sits on top.
              .sort((a, b) => a.foot.z - b.foot.z)
              .map(({ p, foot, tip }) => {
                const on = keyOf(p) === activeKey;
                const size = (on ? 6 : isHome(p) ? 4.5 : 3.2) / zoom;
                return (
                  <g
                    key={keyOf(p)}
                    className="cursor-pointer"
                    onPointerEnter={() => setHover(keyOf(p))}
                    onPointerLeave={() => setHover(null)}
                    onPointerUp={(e) => {
                      if (drag.current?.moved) return;
                      e.stopPropagation();
                      drag.current = null;
                      setPicked(keyOf(p));
                    }}
                    opacity={f(0.45 + 0.55 * foot.z)}
                  >
                    <line x1={f(foot.x)} y1={f(foot.y)} x2={f(tip.x)} y2={f(tip.y)} stroke={on ? "currentColor" : color} strokeWidth={(on ? 1.2 : 0.7) / zoom} />
                    <circle cx={f(foot.x)} cy={f(foot.y)} r={0.9 / zoom} fill="currentColor" />
                    <rect x={f(tip.x - size / 2)} y={f(tip.y - size / 2)} width={size} height={size} fill={on ? "currentColor" : color} />
                    {isHome(p) && <rect x={f(tip.x - size)} y={f(tip.y - size)} width={size * 2} height={size * 2} fill="none" stroke="currentColor" strokeWidth={0.5 / zoom} />}
                    <circle cx={f(tip.x)} cy={f(tip.y)} r={6 / zoom} fill="transparent" />
                  </g>
                );
              })}
          </g>
        </svg>

        <BracketLabel accent className="pointer-events-none absolute top-3 left-3 bg-bg px-1">The field</BracketLabel>
        <p className="text-micro pointer-events-none absolute top-3 right-3 bg-bg px-1 text-right text-ink-muted">
          {total.toLocaleString("en")} entries
          <br />
          {shown.length} cities shown
        </p>
        <div className="absolute right-3 bottom-3 flex border border-line bg-bg">
          {/* The globe moves on its own, so it has a pause. Not shown where reduced motion already holds it still. */}
          <button
            type="button"
            aria-label={turning ? "Pause the globe" : "Spin the globe"}
            title={turning ? "Pause the globe" : "Spin the globe"}
            onClick={() => {
              setSpin(!turning);
              setPicked(null);
              // The pointer is still over the globe, which would hold it: let "Spin" take effect straight away.
              setInside(false);
            }}
            className="grid h-8 w-8 cursor-pointer place-items-center border-r border-line text-ink hover:bg-surface motion-reduce:hidden"
          >
            <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d={turning ? "M2 1h2v8H2zM6 1h2v8H6z" : "M2 1l7 4-7 4z"} />
            </svg>
          </button>
          {([["−", "Zoom out", -0.5], ["+", "Zoom in", 0.5]] as const).map(([glyph, label, step]) => (
            <button key={label} type="button" aria-label={label} disabled={step < 0 ? zoom <= 1 : zoom >= MAX_ZOOM} onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Math.max(1, z + step)))} className="text-label h-8 w-8 cursor-pointer text-ink hover:bg-surface disabled:cursor-default disabled:opacity-30">
              {glyph}
            </button>
          ))}
        </div>

        {active ? (
          <div className="absolute bottom-3 left-3 w-[min(15rem,70%)]">
          {/* The wrapper does the positioning, because `ticks` sets its own. */}
          <div className="ticks border border-line bg-bg p-3">
            <BracketLabel accent>{active.city}</BracketLabel>
            {active.country !== active.city && <p className="text-micro mt-1 text-ink-muted">{active.country}</p>}
            {surprise?.key === activeKey && (
              <Link href={`/entry/${surprise.id}?lens=${lens}`} className="anim-fade-up mt-2 block border-y border-line py-2 hover:underline">
                <span className="text-micro block text-accent-text">Surprise · {surprise.kind}</span>
                <span className="text-body-s line-clamp-2 font-semibold text-ink">{surprise.title}</span>
              </Link>
            )}
            <ul className="mt-2">
              {SECTIONS.filter((s) => active.counts[s.slug] && (!section || s.slug === section)).map((s) => (
                <li key={s.slug}>
                  <Link href={`/${s.slug}?city=${encodeURIComponent(active.city)}&lens=${lens}`} className="text-micro flex items-center gap-2 py-1 text-ink hover:underline">
                    <Mark swatch={sectionSwatch(s)} size={6} />
                    <span className="min-w-0 flex-1">{s.label}</span>
                    <span>{active.counts[s.slug]} <span className="nudge">→</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          </div>
        ) : (
          <div className="text-micro pointer-events-none absolute bottom-3 left-3 bg-bg px-1 text-ink-muted">
            {lensLabel}
            <br />
            <span className="text-accent-text">{closing.week} closing this week</span> · {closing.sixtyDays} in 60 days
          </div>
        )}
      </div>

      {/* One quiet row under the globe: what to show, where to look, and a random trip. Each list opens over
          the globe, as wide as its button (the whole row on phones, so names aren't cut off). */}
      <figcaption className="relative grid grid-cols-2 divide-x divide-line border-x border-b border-line sm:grid-cols-[1fr_1fr_auto]">
        <div className="flex min-w-0 sm:relative">
          <PlaceMenu
            above
            compact
            prefix="Show"
            label={current?.label ?? "Everything"}
            ariaLabel={`Show on the globe (now ${current?.label ?? "Everything"})`}
            value={section ?? ""}
            groups={[{ label: "Show", options: [{ value: "", label: "Everything" }, ...MAPPED.map((s) => ({ value: s.slug, label: s.label }))] }]}
            onSelect={(v) => setSection(v || null)}
            className={MENU}
          />
        </div>
        <div className="flex min-w-0 sm:relative">
          <PlaceMenu
            above
            compact
            prefix="Fly to"
            search="Type a city or country"
            label={chosen?.city ?? "Choose a city"}
            ariaLabel={`Fly to a city${chosen ? ` (now ${chosen.city})` : ""}`}
            value={chosen ? keyOf(chosen) : ""}
            groups={byCountry(shown)}
            onSelect={(v) => {
              const p = shown.find((x) => keyOf(x) === v);
              if (p) focus(p);
            }}
            className={MENU}
          />
        </div>
        {/* A row of its own on phones; the third cell from sm. */}
        <button type="button" onClick={surpriseMe} disabled={looking || shown.length === 0} className="group text-body-s col-span-2 flex cursor-pointer items-center justify-center gap-2 border-t border-line px-4 py-2.5 whitespace-nowrap text-ink transition-colors hover:bg-surface focus-visible:-outline-offset-2! disabled:cursor-wait sm:col-span-1 sm:border-t-0">
          <span aria-hidden className={`h-2 w-2 bg-accent transition-[rotate] duration-300 group-hover:rotate-45 motion-reduce:transition-none ${looking ? "animate-pulse motion-reduce:animate-none" : ""}`} />
          Surprise me
        </button>
      </figcaption>
    </figure>
  );
}

const MENU = "text-body-s flex flex-1 items-center px-3 py-2.5 text-left text-ink transition-colors hover:bg-surface focus-visible:-outline-offset-2! [&>span:last-child]:ml-auto [&>span:last-child]:pl-2";

/** The cities as menu groups: countries in order, each with its cities in order. */
function byCountry(points: MapPoint[]) {
  const sorted = [...points].sort((a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city));
  const groups = new Map<string, { value: string; label: string }[]>();
  for (const p of sorted) {
    const label = p.country || "Elsewhere";
    groups.set(label, [...(groups.get(label) ?? []), { value: keyOf(p), label: p.city }]);
  }
  return [...groups].map(([label, options]) => ({ label, options }));
}

const sum = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);
/** Keep the poles from flipping over. */
const clamp = (lat: number) => Math.max(-70, Math.min(70, lat));
