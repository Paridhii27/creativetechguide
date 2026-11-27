import { describe, expect, it, vi } from "vitest";

const lookup = vi.fn();
vi.mock("node:dns/promises", () => ({ lookup: (...a: unknown[]) => lookup(...a) }));
const { websiteProblem } = await import("@/lib/unfurl");

describe("websiteProblem", () => {
  it.each(["ENOTFOUND", "EBUSY", "EAI_AGAIN"])("turns away a domain whose lookup fails with %s", async (code) => {
    lookup.mockRejectedValueOnce(Object.assign(new Error(code), { code }));
    expect(await websiteProblem("https://no-such-site.com")).toBeTruthy();
  });
  it("allows a PDF on a domain that resolves", async () => {
    lookup.mockResolvedValueOnce([{ address: "93.184.215.14", family: 4 }]);
    expect(await websiteProblem("https://example.com/call.pdf")).toBeNull();
  });
});
