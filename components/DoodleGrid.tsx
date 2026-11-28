"use client";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { swatchVar, type Swatch } from "@/lib/swatch";

/** The size of a cell in `bg-specimen-grid`. */
const CELL = 24;
/** Oldest squares make way once there are this many. */
const MOST = 400;
const COLOURS: Swatch[] = [1, 2, 3, 4, 5, 6, 7];

type Cell = { x: number; y: number };

/**
 * A specimen-grid panel you can doodle on: click and drag (or tap) to fill squares in the view mode's
 * swatches, a new colour each stroke. Purely for play, so nothing depends on it.
 */
export default function DoodleGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [squares, setSquares] = useState<Map<string, Swatch>>(() => new Map());
  const strokes = useRef(0);
  const last = useRef<Cell | null>(null);

  const cellAt = (e: PointerEvent<HTMLDivElement>): Cell => {
    const box = e.currentTarget.getBoundingClientRect();
    // The grid starts inside the border.
    return { x: Math.floor((e.clientX - box.left - e.currentTarget.clientLeft) / CELL), y: Math.floor((e.clientY - box.top - e.currentTarget.clientTop) / CELL) };
  };

  /** Fills every cell from `from` to `to`, so a quick drag leaves no gaps. */
  const paint = (from: Cell, to: Cell) => {
    const colour = COLOURS[strokes.current % COLOURS.length];
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1);
    setSquares((old) => {
      const next = new Map(old);
      for (let i = 0; i <= steps; i++) {
        const key = `${Math.round(from.x + ((to.x - from.x) * i) / steps)},${Math.round(from.y + ((to.y - from.y) * i) / steps)}`;
        next.delete(key);
        next.set(key, colour);
      }
      for (const key of next.keys()) {
        if (next.size <= MOST) break;
        next.delete(key);
      }
      return next;
    });
  };

  const onControl = (e: PointerEvent) => !!(e.target as Element).closest("a, button");

  return (
    <div
      className={`bg-specimen-grid ticks cursor-crosshair select-none overflow-hidden ${className}`}
      onPointerDown={(e) => {
        if (e.button !== 0 || onControl(e)) return;
        strokes.current += 1;
        const at = cellAt(e);
        last.current = e.pointerType === "touch" ? null : at;
        paint(at, at);
      }}
      onPointerMove={(e) => {
        // Held down with a mouse or pen. A finger drag is left alone, so the page still scrolls.
        if (!last.current || !(e.buttons & 1)) return;
        const at = cellAt(e);
        if (at.x === last.current.x && at.y === last.current.y) return;
        paint(last.current, at);
        last.current = at;
      }}
      onPointerUp={() => (last.current = null)}
      onPointerLeave={() => (last.current = null)}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity: "var(--doodle-opacity, 0.6)" }}>
        {[...squares].map(([key, colour]) => {
          const [x, y] = key.split(",").map(Number);
          return <span key={key} className="anim-fade-up absolute" style={{ left: x * CELL + 1, top: y * CELL + 1, width: CELL - 1, height: CELL - 1, background: swatchVar(colour) }} />;
        })}
      </div>
      <div className="relative">{children}</div>
      <div className="relative mt-8 flex min-h-6 items-center justify-center gap-4">
        <span aria-hidden className="text-micro bg-bg px-1 text-ink-muted">
          <span className="pointer-coarse:hidden">Click and drag to doodle</span>
          <span className="hidden pointer-coarse:inline">Tap to doodle</span>
        </span>
        {squares.size > 0 && (
          <button type="button" onClick={() => setSquares(new Map())} className="text-micro cursor-pointer bg-bg px-1 py-1 text-ink underline">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
