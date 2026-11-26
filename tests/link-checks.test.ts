import { describe, expect, it } from "vitest";
import { addressChecks, checkEntry, reachChecks, relatedTerms, siteOf, type Fetched } from "@/lib/link-checks";
import { isPrivateAddress, unfurl } from "@/lib/unfurl";

const page = (over: Partial<Extract<Fetched, { ok: true }>> = {}): Fetched => ({
  ok: true,
  url: "https://studio.example/",
  title: "Studio",
  description: "An interactive installation studio",
  text: "We make projection mapping and creative coding work. ".repeat(10),
  ...over,
});
const labels = (c: { label: string }[]) => c.map((x) => x.label);
const input = { url: "https://studio.example/", title: "Studio", summary: null };

describe("private address guard", () => {
  const hosts = (u: string) => new URL(u).hostname.replace(/^\[|\]$/g, "");
  it.each(["127.0.0.1", "10.0.0.1", "169.254.169.254", "[::1]", "[::]", "[::ffff:127.0.0.1]", "[::ffff:169.254.169.254]", "[fe90::1]", "[fd00::1]", "[64:ff9b::7f00:1]", "[2002:7f00:1::]"])("blocks %s", (h) => {
    expect(isPrivateAddress(hosts(`http://${h}/`))).toBe(true);
  });
  it.each(["93.184.216.34", "[2606:4700:4700::1111]"])("allows %s", (h) => {
    expect(isPrivateAddress(hosts(`http://${h}/`))).toBe(false);
  });
  it("refuses to fetch a disguised loopback address", async () => {
    await expect(unfurl("http://[::ffff:127.0.0.1]/")).rejects.toMatchObject({ kind: "refused" });
  });
});

describe("link checks", () => {
  it("passes a working, related page", () => {
    expect(labels(checkEntry({ ...input, page: page() }))).toEqual(["Link works", "Looks related"]);
  });
  it("tells a missing page apart from one that blocks automated visits", () => {
    expect(reachChecks(input.url, { ok: false, kind: "http", status: 404 })[0].level).toBe("bad");
    expect(reachChecks(input.url, { ok: false, kind: "http", status: 403 })[0].level).toBe("warn");
    expect(reachChecks(input.url, { ok: false, kind: "no_such_host" })[0].level).toBe("bad");
  });
  it("flags parked domains and redirects to another site, but not to www", () => {
    expect(labels(reachChecks(input.url, page({ title: "This domain is for sale" })))).toEqual(["Parked domain"]);
    expect(labels(reachChecks(input.url, page({ url: "https://other.example.net/" })))).toEqual(["Redirects elsewhere"]);
    expect(labels(reachChecks(input.url, page({ url: "https://www.studio.example/home" })))).toEqual(["Link works"]);
    expect(siteOf("www.studio.co.in")).toBe("studio.co.in");
  });
  it("reads warning signs in the address", () => {
    expect(labels(addressChecks("http://bit.ly/x"))).toEqual(["Shortened link", "Not encrypted"]);
    expect(labels(addressChecks("https://93.184.216.34/"))).toEqual(["Bare IP address"]);
    expect(labels(addressChecks("javascript:alert(1)"))).toEqual(["Not a web link"]);
    expect(addressChecks("https://studio.example/")).toEqual([]);
  });
  it("matches related terms as whole words", () => {
    expect(relatedTerms("Interactive installations with Arduino")).toEqual(["interactive", "installation", "arduino"]);
    expect(relatedTerms("A community opportunity to reinstall")).toEqual([]);
  });
  it("judges relevance from the page, not from what was typed", () => {
    const c = checkEntry({ ...input, title: "Creative coding interactive installation", page: page({ description: null, text: "Cheap garden furniture and sofas. ".repeat(10) }) });
    expect(labels(c)).toContain("Possibly off-topic");
  });
  it("checks the apply link too, and puts problems first", () => {
    const c = checkEntry({ ...input, page: page(), applyUrl: "http://bit.ly/x", applyPage: { ok: false, kind: "http", status: 404 } });
    expect(c[0].label).toBe("Apply link: Page not found");
    expect(labels(c)).toContain("Apply link: Shortened link");
  });
  it("flags spam wording, duplicates and floods", () => {
    const c = checkEntry({ ...input, summary: "Best online casino", page: page(), duplicateTitle: "Studio", addedByOwnerToday: 11, pendingSameSite: 3 });
    expect(labels(c)).toEqual(expect.arrayContaining(["Spam wording", "Already on the Map", "Many additions", "Many from one site"]));
  });
});
