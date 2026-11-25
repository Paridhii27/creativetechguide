"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteEntryAction, reviewAction, suggestAction, toggleSavedAction } from "@/app/actions/entries";
import type { Status, Visibility } from "@/lib/types";

interface Props {
  entryId: string;
  signedIn: boolean;
  saved: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  status: Status;
  visibility: Visibility;
  /** My Layer rows: hide the Save toggle (your own entries are always in your layer). */
  compact?: boolean;
  /** shown on My Layer itself: no "In My Layer" link */
  inLayer?: boolean;
}

export default function EntryActions({ entryId, signedIn, saved: initialSaved, isOwner, isAdmin, status, visibility, compact, inLayer }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<string | null | undefined | void>) =>
    start(async () => {
      setError(null);
      const err = await fn();
      if (err) setError(err);
    });

  if (!signedIn)
    return (
      <a href={`/login?next=/entry/${entryId}`} className="text-label text-ink underline underline-offset-4">
        Sign in to save this
      </a>
    );

  // Pill buttons (DESIGN.md): outlined; solid ink when on; accent outline for destructive.
  const pillBase = `inline-flex items-center rounded-full border border-ink transition-colors disabled:opacity-50 ${compact ? "text-tag px-2.5 py-1" : "text-label px-3.5 py-1.5"}`;
  // Two separate recipes so the outlined and solid states never carry conflicting text/bg classes.
  const btn = `${pillBase} text-ink hover:bg-ink hover:text-bg`;
  const solid = `${pillBase} bg-ink text-bg hover:bg-transparent hover:text-ink`;
  const danger = `inline-flex items-center rounded-full border border-accent text-accent-text transition-colors hover:bg-accent hover:text-on-accent disabled:opacity-50 ${compact ? "text-tag px-2.5 py-1" : "text-label px-3.5 py-1.5"}`;
  return (
    <div className="space-y-2">
      <div className={`flex flex-wrap gap-2 ${pending ? "opacity-60" : ""}`}>
        {(isAdmin || (isOwner && visibility === "private")) && (
          <a href={`/entry/${entryId}/edit`} className={btn}>Edit</a>
        )}
        {!compact && <button
          disabled={pending}
          className={saved ? solid : btn}
          onClick={() =>
            run(async () => {
              const err = await toggleSavedAction(entryId, !saved);
              if (!err) setSaved(!saved);
              return err;
            })
          }
        >
          {saved ? "Saved ✓" : "Save to My Layer"}
        </button>}
        {!compact && saved && !inLayer && (
          <Link href="/me?view=saved" className="text-label inline-flex items-center px-1 text-ink-muted underline underline-offset-4 hover:text-ink">
            In My Layer →
          </Link>
        )}
        {/* Users suggest; the admin publishes directly (below), so never sees Suggest. */}
        {!isAdmin && isOwner && visibility === "private" && (status === "draft" || status === "rejected") && (
          <button disabled={pending} className={btn} onClick={() => run(() => suggestAction(entryId))}>
            {status === "rejected" ? "Suggest again" : "Suggest to the Map"}
          </button>
        )}
        {!isAdmin && isOwner && status === "pending_review" && (
          <span
            title="The admin will approve or reject it. It stays private until then."
            className={`inline-flex items-center rounded-full border border-dashed border-line text-ink-muted ${compact ? "text-tag px-2.5 py-1" : "text-label px-3.5 py-1.5"}`}
          >
            Waiting for review
          </span>
        )}
        {isOwner && visibility === "private" && (
          <button
            disabled={pending}
            className={danger}
            onClick={() => confirm("Delete this private entry? This can't be undone.") && run(() => deleteEntryAction(entryId))}
          >
            Delete
          </button>
        )}
        {isAdmin && status !== "approved" && (
          <button disabled={pending} className={solid} onClick={() => run(() => reviewAction(entryId, "approved"))}>
            {status === "pending_review" ? <>Approve &amp; publish</> : "Publish to the Map"}
          </button>
        )}
        {isAdmin && status === "pending_review" && (
          <button disabled={pending} className={btn} onClick={() => run(() => reviewAction(entryId, "rejected"))}>Reject</button>
        )}
        {isAdmin && status === "approved" && (
          <button disabled={pending} className={btn} onClick={() => confirm("Archive this entry? It will be hidden from the Map.") && run(() => reviewAction(entryId, "archived"))}>Archive</button>
        )}
      </div>
      {error && <p className="text-body-s text-accent-text">{error}</p>}
    </div>
  );
}
