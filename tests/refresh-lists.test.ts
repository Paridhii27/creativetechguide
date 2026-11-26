import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ isAdmin: vi.fn(), expireReferenceData: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/lib/db/entries", () => ({ expireReferenceData: m.expireReferenceData }));
vi.mock("@/lib/db/mylayer", () => ({ isAdmin: m.isAdmin }));

import { refreshListsAction } from "@/app/actions/reference";

describe("refreshListsAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing for anyone but an admin", async () => {
    m.isAdmin.mockResolvedValue(false);
    expect(await refreshListsAction()).toBe("Only admins can refresh the lists.");
    expect(m.expireReferenceData).not.toHaveBeenCalled();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("drops the cached lists for an admin", async () => {
    m.isAdmin.mockResolvedValue(true);
    expect(await refreshListsAction()).toBeNull();
    expect(m.expireReferenceData).toHaveBeenCalledOnce();
    expect(m.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
