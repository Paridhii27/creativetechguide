import { describe, expect, it } from "vitest";
import { canEditEntry } from "@/lib/permissions";

const mine = (status: "draft" | "pending_review" | "rejected" | "approved", visibility: "private" | "public" = "private") => ({ owner_id: "me", status, visibility });

describe("canEditEntry", () => {
  it("lets owners edit their own private drafts and rejected entries", () => {
    expect(canEditEntry(mine("draft"), "me", false)).toBe(true);
    expect(canEditEntry(mine("rejected"), "me", false)).toBe(true);
  });
  it("locks an entry for its owner while it waits for review", () => {
    expect(canEditEntry(mine("pending_review"), "me", false)).toBe(false);
  });
  it("keeps public entries and other people's entries closed", () => {
    expect(canEditEntry(mine("approved", "public"), "me", false)).toBe(false);
    expect(canEditEntry(mine("draft"), "someone-else", false)).toBe(false);
    expect(canEditEntry({ owner_id: null, status: "draft", visibility: "private" }, null, false)).toBe(false);
  });
  it("lets admins edit anything, including pending entries", () => {
    expect(canEditEntry(mine("pending_review"), "admin", true)).toBe(true);
  });
});
