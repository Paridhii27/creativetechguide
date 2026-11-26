"use client";
import { useEffect, useId, useRef, useState } from "react";

export interface PlaceGroup {
  label: string;
  options: { value: string; label: string }[];
}

/**
 * The place half of the lens toggle: a pill that opens a hairline index in the site's own style
 * (like the search matches), in place of the browser's native select list.
 * Arrows, Home/End and first letters move through it; Escape or a click outside closes it.
 * The panel is positioned against the nearest `relative` ancestor and is exactly as wide as it.
 */
export default function PlaceMenu({
  label,
  value,
  groups,
  onSelect,
  other,
  disabled = false,
  className = "",
}: {
  label: string;
  /** the selected option's value, or "" when the selection isn't in the list */
  value: string;
  groups: PlaceGroup[];
  onSelect: (value: string) => void;
  /** a last row below the list, for a place that isn't in it */
  other?: { label: string; onSelect: () => void };
  /** won't open; the pill stays focusable so keyboard users don't lose their place */
  disabled?: boolean;
  /** classes for the pill */
  className?: string;
}) {
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const items = () => Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("button[data-option]") ?? []);

  function close(refocus = true) {
    setOpen(false);
    if (refocus) toggle.current?.focus();
  }

  // Opening starts on the current place, scrolled into view inside the list.
  useEffect(() => {
    if (!open) return;
    const all = items();
    (all.find((b) => b.getAttribute("aria-current")) ?? all[0])?.focus();
    // pointerdown, not mousedown: iOS doesn't send mouse events for taps on non-clickable areas.
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" && !disabled) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      return close();
    }
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    let next: HTMLButtonElement | undefined;
    if (e.key === "ArrowDown") next = all[(at + 1) % all.length];
    else if (e.key === "ArrowUp") next = all[at <= 0 ? all.length - 1 : at - 1];
    else if (e.key === "Home") next = all[0];
    else if (e.key === "End") next = all[all.length - 1];
    else if (e.key.length === 1 && e.key !== " " && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const rest = [...all.slice(at + 1), ...all.slice(0, at + 1)];
      next = rest.find((b) => b.textContent?.toLowerCase().startsWith(e.key.toLowerCase()));
    } else return;
    e.preventDefault();
    next?.focus();
  }

  const row = "text-body-s flex w-full items-center gap-3 px-4 py-2 text-left text-ink transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:-outline-offset-2!";

  return (
    // No positioning here, so the panel lines up with the whole toggle rather than this half of it.
    <div
      ref={root}
      onKeyDown={onKeyDown}
      // Tabbing out closes it. A null target is a click on something unfocusable, which pointerdown handles.
      onBlur={(e) => e.relatedTarget && !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
      className="contents"
    >
      <button
        ref={toggle}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-disabled={disabled}
        aria-controls={open ? panelId : undefined}
        aria-label={`Lens: choose a country or region${value ? ` (now ${label})` : ""}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`min-w-0 cursor-pointer gap-1 ${className}`}
      >
        <span className="truncate">{label}</span>
        <span aria-hidden className="text-body-s leading-none opacity-70">▾</span>
      </button>

      {open && (
        <div
          ref={panel}
          id={panelId}
          className="absolute inset-x-0 top-full z-50 mt-2 border border-ink bg-bg"
        >
          <div className="max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain">
            {groups.map((g) => (
              <div key={g.label} role="group" aria-label={g.label}>
                <p aria-hidden className="text-micro sticky top-0 border-b border-line bg-bg px-4 py-2 text-ink-muted">[ {g.label} ]</p>
                <ul className="divide-y divide-line border-b border-line">
                  {g.options.map((o) => {
                    const on = o.value === value;
                    return (
                      <li key={o.value}>
                        {/* scroll-mt keeps a focused row clear of the sticky group heading */}
                        <button
                          type="button"
                          data-option
                          aria-current={on || undefined}
                          onClick={() => {
                            close();
                            onSelect(o.value);
                          }}
                          className={`${row} scroll-mt-8 ${on ? "bg-surface font-semibold" : ""}`}
                        >
                          <span className="min-w-0 flex-1 truncate">{o.label}</span>
                          {on && <span aria-hidden className="h-2 w-2 shrink-0 bg-accent" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          {other && (
            <button
              type="button"
              data-option
              onClick={() => {
                close(false);
                other.onSelect();
              }}
              className={`${row} text-label! justify-between border-t border-line py-3`}
            >
              <span>{other.label}</span>
              <span aria-hidden>→</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
