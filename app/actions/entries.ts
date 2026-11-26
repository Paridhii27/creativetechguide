"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EntryForm, formDataToObject } from "@/lib/entry-input";
import { createEntry, deleteOwnEntry, reviewEntry, setSaved, suggestEntry, updateEntry } from "@/lib/db/mylayer";

export type SaveState =
  | null
  | { error: string; fieldErrors?: Record<string, string> }
  | { duplicate: { id: string; title: string } };

export async function saveEntryAction(_prev: SaveState, fd: FormData): Promise<SaveState> {
  const parsed = EntryForm.safeParse(formDataToObject(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    return { error: "Check the highlighted fields.", fieldErrors };
  }
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
