"use client";
import { useEffect, useState } from "react";
import { isViewMode, nextViewMode, VIEW_MODE_KEY, type ViewMode } from "@/lib/theme";

/** "CHANGE VIEW": cycles Paper → Night → Blueprint. The pre-paint script in the layout sets the first mode. */
export function ChangeView({ className = "", variant = "pill" }: { className?: string; variant?: "pill" | "text" }) {
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

  function cycle() {
    const next = nextViewMode(mode ?? "paper");
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(VIEW_MODE_KEY, next);
    } catch {
      /* private mode etc.: the choice just won't persist */
    }
    setMode(next);
  }

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={cycle}
        className={`text-micro inline-flex items-center gap-1.5 text-ink-muted transition-colors hover:text-ink ${className}`}
        aria-label={mode ? `Change view (current: ${mode})` : "Change view"}
      >
        Change view <span aria-hidden>—</span> <span className="w-[7ch] text-left text-ink" aria-live="polite">{mode ?? ""}</span>
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={cycle}
        className="text-tag rounded-full border border-ink px-3 py-1 text-ink transition-colors hover:bg-ink hover:text-bg"
        aria-label={mode ? `Change view (current: ${mode})` : "Change view"}
      >
        Change view
      </button>
      <span className="text-micro w-[7ch] text-ink-muted" aria-live="polite">
        {mode ?? ""}
      </span>
    </div>
  );
}
