"use client";
import { useEffect, useState } from "react";
import { isViewMode, VIEW_MODE_KEY, VIEW_MODE_LABELS, VIEW_MODES, type ViewMode } from "@/lib/theme";

/**
 * Each mode's own paper and ink, fixed (not tokens), so every option previews itself
 * whichever mode is active. Values from DESIGN.md.
 */
const PREVIEW: Record<ViewMode, { bg: string; ink: string; accent: string; hint: string }> = {
  paper: { bg: "#FCFCFC", ink: "#1E1E1E", accent: "#F04A30", hint: "Black on white, like a printed guide" },
  night: { bg: "#050505", ink: "#F2F2F2", accent: "#EAFD57", hint: "Dark instrument panel with chartreuse details" },
  blueprint: { bg: "#FCFCFC", ink: "#3449B2", accent: "#3449B2", hint: "All one blue, like a technical drawing" },
};

/** A tiny page in that mode: its paper, a line of ink and an accent dot. */
function ModeChip({ mode }: { mode: ViewMode }) {
  const p = PREVIEW[mode];
  return (
    <svg aria-hidden viewBox="0 0 14 14" className="hidden h-3.5 w-3.5 shrink-0 sm:block">
      <rect x="0.5" y="0.5" width="13" height="13" rx="3" fill={p.bg} stroke="currentColor" strokeOpacity="0.35" />
      <rect x="3" y="4" width="8" height="1.6" fill={p.ink} />
      <rect x="3" y="7" width="5" height="1.6" fill={p.ink} />
      <circle cx="10" cy="10" r="1.6" fill={p.accent} />
    </svg>
  );
}

/**
 * Colour view switch (DESIGN.md "Switching modes"): all three modes side by side, each with a small preview,
 * the current one filled. The pre-paint script in the layout applies the saved mode before first paint.
 */
export function ChangeView({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<ViewMode | null>(null);

  useEffect(() => {
    let m = document.documentElement.dataset.theme;
    // Some client re-renders of <html> (e.g. the 404 page) drop the attribute the pre-paint script set: restore it.
    if (!isViewMode(m)) {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(VIEW_MODE_KEY);
      } catch {
        /* storage blocked */
      }
      m = isViewMode(saved) ? saved : matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "paper";
      document.documentElement.dataset.theme = m;
    }
    setMode(m as ViewMode);
  }, []);

  function choose(next: ViewMode) {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(VIEW_MODE_KEY, next);
    } catch {
      /* private mode etc.: the choice just won't persist */
    }
    setMode(next);
  }

  // Arrow keys move between options, as in any radio group.
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const i = VIEW_MODES.indexOf(mode ?? "paper");
    const next = VIEW_MODES[(i + (e.key === "ArrowLeft" || e.key === "ArrowUp" ? VIEW_MODES.length - 1 : 1)) % VIEW_MODES.length];
    choose(next);
    (e.currentTarget.querySelector(`[data-mode="${next}"]`) as HTMLElement | null)?.focus();
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span id="view-mode-label" className="text-micro hidden text-ink-muted sm:inline">
        View
      </span>
      <div role="radiogroup" aria-labelledby="view-mode-label" onKeyDown={onKeyDown} className="inline-flex rounded-full border border-line p-0.5">
        {VIEW_MODES.map((m) => {
          const on = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              data-mode={m}
              tabIndex={on || (!mode && m === "paper") ? 0 : -1}
              title={PREVIEW[m].hint}
              onClick={() => choose(m)}
              className={`text-tag inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors sm:px-2.5 ${on ? "bg-ink text-bg" : "text-ink-muted hover:text-ink"}`}
            >
              <ModeChip mode={m} />
              {VIEW_MODE_LABELS[m]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
