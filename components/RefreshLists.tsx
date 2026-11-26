"use client";
import { useState, useTransition } from "react";
import { refreshListsAction } from "@/app/actions/reference";

/** Admin only: apply edits to the shared lists without waiting for the hourly refresh. */
export default function RefreshLists() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = () =>
    start(async () => {
      setResult(null);
      try {
        const error = await refreshListsAction();
        setResult(error ? { ok: false, text: error } : { ok: true, text: "Lists refreshed." });
      } catch {
        setResult({ ok: false, text: "Couldn't refresh the lists. Try again." });
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={refresh}
        className="text-label inline-flex items-center rounded-full border border-ink px-3.5 py-1.5 text-ink transition-colors hover:bg-ink hover:text-bg disabled:opacity-50"
      >
        {pending ? "Refreshing…" : "Refresh lists"}
      </button>
      <p role="status" className={`text-body-s ${result && !result.ok ? "text-accent-text" : "text-ink-muted"}`}>
        {result?.text}
      </p>
    </div>
  );
}
