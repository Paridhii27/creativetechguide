"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export interface PlaceGroup {
  label: string;
  options: { value: string; label: string }[];
}

/**
 * A button that opens a hairline index in the site's own style (like the search matches), in place of
 * the browser's native select list. Used by the lens toggle, under the home globe and in the section filters.
 * Arrows, Home/End and first letters move through it; Escape or a click outside closes it.
 * With `search`, a field filters the list as you type instead.
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
  prefix,
  ariaLabel,
  above = false,
  autoPlace = false,
  compact = false,
  search,
}: {
  /** adds a field that narrows the list as you type; the string is its placeholder */
  search?: string;
  /** a shorter list with tighter rows */
  compact?: boolean;
  /** a small caption inside the button, before the label */
  prefix?: string;
  /** what the button is called to screen readers; defaults to the lens wording */
  ariaLabel?: string;
  /** open the panel over what's above the button rather than below it */
  above?: boolean;
  /** open upwards when there isn't room below the button but there is above it */
  autoPlace?: boolean;
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
  const field = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  // Each opening starts from the whole list.
  if (!open && query) setQuery("");
  const shown = search ? matching(groups, query) : groups;

  const items = () => Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("button[data-option]") ?? []);

  function close(refocus = true) {
    setOpen(false);
    if (refocus) toggle.current?.focus();
  }

  // Moved before focus lands in the list, so focusing never scrolls the page to a panel that's about to move.
  useLayoutEffect(() => {
    const p = panel.current;
    const b = toggle.current?.getBoundingClientRect();
    if (!open || !autoPlace || !p || !b) return;
    const need = p.offsetHeight + 16;
    const flip = window.innerHeight - b.bottom < need && b.top >= need;
    for (const c of ["top-full", "mt-2"]) p.classList.toggle(c, !flip);
    for (const c of ["bottom-full", "mb-2"]) p.classList.toggle(c, flip);
  }, [open, autoPlace]);

  // Opening starts on the current place, scrolled into view inside the list.
  useEffect(() => {
    if (!open) return;
    const all = items();
    const current = all.find((b) => b.getAttribute("aria-current"));
    // On touch screens the field waits for a tap, so the keyboard doesn't cover the list unasked.
    if (field.current && !window.matchMedia("(pointer: coarse)").matches) {
      current?.scrollIntoView({ block: "nearest" });
      field.current.focus({ preventScroll: true });
    } else (current ?? all[0])?.focus();
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
    const typing = e.target === field.current;
    // Enter in the field takes the first match.
    if (typing && e.key === "Enter") {
      e.preventDefault();
      if (query.trim()) all[0]?.click();
      return;
    }
    if (typing && (e.key === "Home" || e.key === "End")) return; // these move the caret
    if (e.key === "ArrowDown") next = all[(at + 1) % all.length];
    else if (e.key === "ArrowUp") next = all[at <= 0 ? all.length - 1 : at - 1];
    else if (e.key === "Home") next = all[0];
    else if (e.key === "End") next = all[all.length - 1];
    else if (e.key.length === 1 && e.key !== " " && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // Typing from a row carries on in the field, which receives this same keystroke.
      if (field.current) return field.current.focus();
      const rest = [...all.slice(at + 1), ...all.slice(0, at + 1)];
      next = rest.find((b) => b.textContent?.toLowerCase().startsWith(e.key.toLowerCase()));
    } else return;
    e.preventDefault();
    next?.focus();
  }

  const pad = compact ? "px-3" : "px-4";
  const row = "text-body-s flex w-full items-center gap-3 text-left text-ink transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:-outline-offset-2! " + (compact ? "px-3 py-1 pointer-coarse:py-2" : "px-4 py-2");

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
        aria-label={ariaLabel ?? `Lens: choose a country or region${value ? ` (now ${label})` : ""}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`min-w-0 cursor-pointer gap-1 ${className}`}
      >
        {prefix && <span aria-hidden className="text-micro mr-1 shrink-0 text-ink-muted">{prefix}</span>}
        <span className="truncate">{label}</span>
        <span aria-hidden className="text-body-s leading-none opacity-70">▾</span>
      </button>

      {open && (
        <div
          ref={panel}
          id={panelId}
          className={`absolute inset-x-0 z-50 flex flex-col border border-ink bg-bg ${above ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          <div className={`overflow-y-auto overscroll-contain ${compact ? "max-h-[min(13rem,45vh)]" : "max-h-[min(24rem,60vh)]"}`}>
            {search && shown.length === 0 && <p role="status" className={`text-body-s py-2 text-ink-muted ${pad}`}>No matches</p>}
            {shown.map((g) => (
              <div key={g.label} role="group" aria-label={g.label}>
                <p aria-hidden className={`text-micro sticky top-0 border-b border-line bg-bg text-ink-muted ${pad} ${compact ? "py-1" : "py-2"}`}>[ {g.label} ]</p>
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
                          className={`${row} ${compact ? "scroll-mt-6" : "scroll-mt-8"} ${on ? "bg-surface font-semibold" : ""}`}
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
          {search && (
            // Beside the button, so it stays put while the list above or below it shrinks.
            <input
              ref={field}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                e.target.previousElementSibling?.scrollTo(0, 0);
              }}
              placeholder={search}
              aria-label={search}
              autoComplete="off"
              spellCheck={false}
              className={`text-body-s w-full bg-bg py-2 text-ink placeholder:text-ink-muted focus-visible:-outline-offset-2! pointer-coarse:text-base! ${pad} ${above ? "border-t border-line" : "order-first border-b border-line"}`}
            />
          )}
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
              <span aria-hidden className="nudge">→</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Lower case without accents, so "sao" finds "São Paulo". */
const plain = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** The options with a word starting with what's typed; a matching group name keeps its whole group. */
function matching(groups: PlaceGroup[], query: string): PlaceGroup[] {
  const q = plain(query.trim());
  if (!q) return groups;
  const hit = (text: string) => ` ${plain(text)}`.includes(` ${q}`);
  return groups.map((g) => (hit(g.label) ? g : { ...g, options: g.options.filter((o) => hit(o.label)) })).filter((g) => g.options.length > 0);
}
