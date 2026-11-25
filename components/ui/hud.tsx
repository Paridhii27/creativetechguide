import type { CSSProperties, ReactNode } from "react";
import { Barcode, BracketLabel } from "./primitives";
import { swatchVar, tintVar, type Swatch } from "@/lib/swatch";
import { HudClock } from "./HudClock";

/* ---------------------------------------------------------------------------
   Specimen / HUD pieces (visual-direction reference). Home hero, detail pages, map.
   ------------------------------------------------------------------------- */

/** Metadata box with corner ticks, a bracketed heading and label/value rows. */
export function AnnotationBox({
  title,
  rows,
  children,
  barcode,
  swatch,
  className = "",
  style,
}: {
  title?: string;
  /** palette mark beside the title (matches the specimen dot it points from) */
  swatch?: Swatch;
  rows?: { label: string; value: ReactNode }[];
  children?: ReactNode;
  barcode?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`ticks anim-fade-up border border-line bg-bg p-3 ${className}`} style={style}>
      {title && (
        <div className="mb-2 flex items-center justify-between gap-3">
          <BracketLabel accent mark={swatch}>{title}</BracketLabel>
          {barcode && <Barcode seed={barcode} width={36} height={8} />}
        </div>
      )}
      {rows && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-micro text-ink-muted">{r.label}</dt>
              <dd className="text-micro text-ink">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </div>
  );
}

type Pt = { x: number; y: number };

/** One straight horizontal or vertical leader segment from p to q (percent coordinates). */
function leader(p: Pt, q: Pt, delay: string): CSSProperties {
  const horizontal = Math.abs(p.y - q.y) < Math.abs(p.x - q.x);
  return horizontal
    ? {
        left: `${Math.min(p.x, q.x)}%`,
        top: `${p.y}%`,
        width: `${Math.abs(q.x - p.x)}%`,
        height: 1,
        background: "var(--ink)",
        transformOrigin: p.x < q.x ? "left" : "right",
        animation: `draw-x 450ms cubic-bezier(0.4,0,0.2,1) ${delay} both`,
      }
    : {
        left: `${p.x}%`,
        top: `${Math.min(p.y, q.y)}%`,
        width: 1,
        height: `${Math.abs(q.y - p.y)}%`,
        background: "var(--ink)",
        transformOrigin: p.y < q.y ? "top" : "bottom",
        animation: `draw-y 450ms cubic-bezier(0.4,0,0.2,1) ${delay} both`,
      };
}

export interface SpecimenAnnotation {
  id: string;
  /** point on the specimen, in % of the frame */
  anchor: { x: number; y: number };
  /** where the leader line meets the box, in % of the frame */
  to: { x: number; y: number };
  /** optional elbow point; defaults to a horizontal-then-vertical bend. Keep both legs horizontal or vertical. */
  via?: { x: number; y: number };
  /** top-left of the box, in % of the frame (desktop only; boxes stack below on small screens) */
  box: { x: number; y: number; w?: number };
  /** colour of the anchor dot; defaults to the accent */
  swatch?: Swatch;
  content: ReactNode;
}

/**
 * One central specimen (map, entry image…) with thin leader lines to annotation boxes,
 * a faint grid, corner coordinates and local time.
 */
export function Specimen({
  children,
  annotations = [],
  label,
  coords,
  timeZone,
  aspect = "16/9",
  className = "",
}: {
  children: ReactNode;
  annotations?: SpecimenAnnotation[];
  label?: string;
  coords?: string;
  /** IANA zone for the corner clock; omit to hide */
  timeZone?: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <figure className={`relative ${className}`}>
      <div className="bg-specimen-grid relative w-full border border-line" style={{ aspectRatio: aspect }}>
        <div className="absolute inset-0 grid place-items-center">{children}</div>

        {/* corner HUD */}
        {label && <BracketLabel className="absolute top-3 left-3">{label}</BracketLabel>}
        {timeZone && (
          <div className="text-micro absolute top-3 right-3 text-right text-ink-muted">
            Local time
            <br />
            <HudClock timeZone={timeZone} className="text-ink" />
          </div>
        )}
        {coords && <div className="text-micro absolute bottom-3 left-3 text-ink-muted">{coords}</div>}
        <Barcode seed={label ?? "specimen"} className="absolute right-3 bottom-3" />

        {/* leader lines (desktop): crisp 1px orthogonal segments that draw in */}
        {annotations.map((a, i) => {
          const via = a.via ?? { x: a.to.x, y: a.anchor.y };
          return [leader(a.anchor, via, `${200 + i * 120}ms`), leader(via, a.to, `${380 + i * 120}ms`)].map((seg, j) => (
            <span key={`${a.id}-${j}`} aria-hidden className="pointer-events-none absolute hidden md:block" style={seg} />
          ));
        })}
        {annotations.map((a) => (
          <span
            key={a.id}
            aria-hidden
            className="absolute hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bg md:block"
            style={{ left: `${a.anchor.x}%`, top: `${a.anchor.y}%`, background: a.swatch ? swatchVar(a.swatch) : "var(--accent)" }}
          />
        ))}
        {annotations.map((a, i) => (
          <div
            key={a.id}
            className="absolute hidden md:block"
            style={{ left: `${a.box.x}%`, top: `${a.box.y}%`, width: `${a.box.w ?? 22}%`, ["--delay" as string]: `${500 + i * 120}ms` }}
          >
            {a.content}
          </div>
        ))}
      </div>

      {/* small screens: boxes stack below */}
      {annotations.length > 0 && <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">{annotations.map((a) => <div key={a.id}>{a.content}</div>)}</div>}
    </figure>
  );
}

/**
 * Exploded / layered diagram: stacked planes, bottom to top, each with a leader line to its label.
 * Used to explain the Map (bottom) and My Layer (above).
 */
export function LayerStack({ layers }: { layers: { label: string; note?: ReactNode; active?: boolean; swatch?: Swatch }[] }) {
  const n = layers.length;
  return (
    <div className="bg-specimen-grid relative border border-line px-4 py-8 sm:px-8">
      <div className="mx-auto flex max-w-xl flex-col-reverse gap-3">
        {layers.map((l, i) => (
          <div key={l.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 anim-fade-up" style={{ ["--delay" as string]: `${(n - i) * 120}ms` }}>
            <div
              className={`h-14 border sm:h-16 ${l.active ? "border-accent" : "border-ink"}`}
              style={{
                transform: "perspective(600px) rotateX(58deg) skewX(-14deg)",
                transformOrigin: "center",
                background: l.active ? "var(--accent)" : l.swatch ? tintVar(l.swatch, 55) : "var(--bg)",
              }}
            />
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-px w-8 bg-ink sm:w-14" />
              <div>
                <div className={`text-micro ${l.active ? "text-accent-text" : "text-ink"}`}>
                  {String(i + 1).padStart(2, "0")} — {l.label}
                </div>
                {l.note && <div className="text-micro mt-0.5 max-w-[22ch] text-ink-muted">{l.note}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
