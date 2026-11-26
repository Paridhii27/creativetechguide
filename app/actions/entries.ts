"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EntryForm, formDataToObject, type EntryFormValues } from "@/lib/entry-input";
import { createEntry, deleteOwnEntry, reviewEntry, setSaved, suggestEntry, updateEntry } from "@/lib/db/mylayer";
import { getEntry } from "@/lib/db/entries";
import { getCurrentUser } from "@/lib/db/profiles";
import { websiteProblem } from "@/lib/unfurl";

export type SaveState =
  | null
  | { error: string; fieldErrors?: Record<string, string> }
  | { duplicate: { id: string; title: string } };

const LINK_FIELDS = ["url", "apply_url", "careers_url", "scholarship_url"] as const;

/** Links whose website doesn't exist. Links in `unchanged` were already saved, so an old dead one can't block an edit. */
async function deadLinks(v: EntryFormValues, unchanged = new Set<unknown>()): Promise<SaveState> {
  if (!(await getCurrentUser())) return null; // saving refuses signed-out users itself
  const found = await Promise.all(
    LINK_FIELDS.map(async (f) => {
      const url = v[f];
      const problem = url && !unchanged.has(url) ? await websiteProblem(url) : null;
      return problem ? [f, problem] : null;
    }),
  );
  const fieldErrors = Object.fromEntries(found.filter((x) => x !== null));
  return Object.keys(fieldErrors).length ? { error: "Check the highlighted fields.", fieldErrors } : null;
}

export async function saveEntryAction(_prev: SaveState, fd: FormData): Promise<SaveState> {
  const parsed = EntryForm.safeParse(formDataToObject(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { error: "Check the highlighted fields.", fieldErrors };
  }
  const dead = await deadLinks(parsed.data);
  if (dead) return dead;
  const res = await createEntry(parsed.data);
  if ("error" in res) return { error: res.error };
  if ("duplicate" in res) return { duplicate: res.duplicate };
  revalidatePath("/", "layout");
  redirect(`/me?added=${res.id}`);
}

const ID = /^[0-9a-f-]{36}$/i;

/** Bound with the entry id: `updateEntryAction.bind(null, id)`. */
export async function updateEntryAction(entryId: string, _prev: SaveState, fd: FormData): Promise<SaveState> {
  if (!ID.test(entryId)) return { error: "Bad id" };
  const parsed = EntryForm.safeParse(formDataToObject(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { error: "Check the highlighted fields.", fieldErrors };
  }
  const old = await getEntry(entryId);
  const data = old?.data ?? {};
  const scholarships = Array.isArray(data.scholarships) ? (data.scholarships as { url?: string }[]) : [];
  const dead = await deadLinks(parsed.data, new Set([old?.url, data.apply_url, data.careers_url, scholarships[0]?.url]));
  if (dead) return dead;
  const res = await updateEntry(entryId, parsed.data);
  if ("error" in res) return { error: res.error };
  revalidatePath("/", "layout");
  redirect(`/entry/${entryId}?edited=1`);
}

export async function toggleSavedAction(entryId: string, saved: boolean) {
  if (!ID.test(entryId)) return "Bad id";
  const err = await setSaved(entryId, saved);
  revalidatePath(`/entry/${entryId}`);
  revalidatePath("/me");
  return err;
}

export async function suggestAction(entryId: string) {
  if (!ID.test(entryId)) return "Bad id";
  const err = await suggestEntry(entryId);
  revalidatePath(`/entry/${entryId}`);
  revalidatePath("/me");
  return err;
}

export async function reviewAction(entryId: string, decision: "approved" | "rejected" | "archived", seenUpdatedAt: string) {
  if (!ID.test(entryId) || !["approved", "rejected", "archived"].includes(decision) || typeof seenUpdatedAt !== "string" || !seenUpdatedAt) return "Bad request";
  const err = await reviewEntry(entryId, decision, seenUpdatedAt);
  revalidatePath("/", "layout");
  return err;
}

export async function deleteEntryAction(entryId: string) {
  if (!ID.test(entryId)) return "Bad id";
  const err = await deleteOwnEntry(entryId);
  if (err) return err;
  revalidatePath("/me");
  redirect("/me");
}
