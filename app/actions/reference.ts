"use server";
import { revalidatePath } from "next/cache";
import { expireReferenceData } from "@/lib/db/entries";
import { isAdmin } from "@/lib/db/mylayer";

/** Re-read countries, regions and disciplines now instead of waiting for the hourly refresh. */
export async function refreshListsAction(): Promise<string | null> {
  // A server action can be called directly, so hiding the button isn't enough.
  if (!(await isAdmin())) return "Only admins can refresh the lists.";
  expireReferenceData();
  revalidatePath("/", "layout");
  return null;
}
