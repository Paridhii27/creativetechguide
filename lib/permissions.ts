import type { Entry } from "./types";

/**
 * Who may change an entry's details. Admins can edit anything; everyone else only their own private entries, and
 * not while one is waiting for review, so what was suggested is what gets reviewed. The database enforces the same
 * rule (RLS); this keeps the buttons and messages in step with it.
 */
export function canEditEntry(entry: Pick<Entry, "owner_id" | "visibility" | "status">, userId: string | null | undefined, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return !!userId && entry.owner_id === userId && entry.visibility === "private" && entry.status !== "pending_review";
}
