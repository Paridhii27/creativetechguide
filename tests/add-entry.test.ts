import { describe, expect, it } from "vitest";
import { badLinkMessage, isPrivateAddress, normaliseUrl, parseHtml, UnfurlError, unreadableLinkMessage } from "@/lib/unfurl";
import { linkProblem, withScheme } from "@/lib/links";
import { EntryForm, buildData, formDataToObject } from "@/lib/entry-input";

describe("unfurl parser", () => {
  const html = `<!doctype html><html><head>
    <title>Fallback &amp; title</title>
    <meta property="og:title" content="Light &amp; Space Residency">
    <meta name="description" content="A residency for media artists.">
    <meta property="og:image" content="/img/cover.jpg">
    <link rel="icon" href="/favicon.png">
    <script>var x = "<p>not text</p>";</script><style>p{}</style>
    </head><body><h1>Apply now</h1><p>Deadline:&nbsp;15 Jan</p></body></html>`;
  const r = parseHtml(html, "https://example.org/calls/light");
  it("prefers Open Graph, resolves relative links, decodes entities", () => {
    expect(r.title).toBe("Light & Space Residency");
    expect(r.description).toBe("A residency for media artists.");
    expect(r.image_url).toBe("https://example.org/img/cover.jpg");
    expect(r.favicon_url).toBe("https://example.org/favicon.png");
  });
  it("extracts visible text only", () => {
    expect(r.text).toContain("Apply now Deadline: 15 Jan");
    expect(r.text).not.toContain("not text");
  });
  it("falls back to <title> and /favicon.ico", () => {
    const p = parseHtml("<title> Studio </title>", "https://a.b/x");
    expect(p.title).toBe("Studio");
    expect(p.favicon_url).toBe("https://a.b/favicon.ico");
  });
  it("ignores javascript: images", () => {
    expect(parseHtml(`<meta property="og:image" content="javascript:alert(1)">`, "https://a.b").image_url).toBeNull();
  });
});

describe("SSRF guard", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])("blocks %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });
  it.each(["8.8.8.8", "172.32.0.1", "2606:4700::1111"])("allows %s", (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe("normaliseUrl", () => {
  it("drops tracking params and the bare trailing slash, lowercases host", () => {
    expect(normaliseUrl("https://Example.COM/?utm_source=x")).toBe("https://example.com");
    expect(normaliseUrl("https://example.com/jobs/1?ref=hn&id=2")).toBe("https://example.com/jobs/1?id=2");
  });
});

describe("link checks", () => {
  it.each(["asdfgh", "hello world", "www", "foo..com", "example.123", "mailto:a@b.com", "javascript:alert(1)", "ftp://example.com", "http://", "localhost:3000"])("turns away %s", (raw) => {
    expect(linkProblem(withScheme(raw))).toBeTruthy();
  });
  it.each(["example.com", "https://sub.example.co.in/jobs?id=1#apply", "example.com:8080/x", "https://münchen.de", "http://example.museum."])("accepts %s", (raw) => {
    expect(linkProblem(withScheme(raw))).toBeNull();
  });
  it("blocks missing sites and pages, but not pages that merely wouldn't load", () => {
    expect(badLinkMessage(new UnfurlError("x", "no_such_host"))).toBeTruthy();
    expect(badLinkMessage(new UnfurlError("x", "http", 404))).toBeTruthy();
    expect(badLinkMessage(new UnfurlError("x", "lookup_failed"))).toBeTruthy();
    // PDFs and other files aren't web pages, but they can still be added.
    for (const e of [new UnfurlError("x", "not_html"), new UnfurlError("x", "http", 403), new UnfurlError("x", "http", 503), new TypeError("fetch failed")]) {
      expect(badLinkMessage(e)).toBeNull();
      expect(unreadableLinkMessage(e)).not.toMatch(/fetch|HTTP|\d{3}/);
    }
  });
});

describe("entry form", () => {
  const fd = (o: Record<string, string | string[]>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) for (const x of [v].flat()) f.append(k, x);
    return formDataToObject(f);
  };

  it("builds an open call without inventing unknowns", () => {
    const v = EntryForm.parse(fd({ type: "opportunity", title: "Light Residency", url: "https://x.org/call", kind: "residency", deadline: "2027-01-15", deadline_source_text: "Apply by 15 Jan 2027", suggest: "on", disciplines: ["installation", "ai"] }));
    expect(v.suggest).toBe(true);
    expect(v.disciplines).toEqual(["installation", "ai"]);
    const d = buildData(v, {});
    expect(d).toMatchObject({ opp_kind: "residency", deadline: "2027-01-15", deadline_source_text: "Apply by 15 Jan 2027", fee: "unknown", travel_covered: "unknown", apply_url: "https://x.org/call" });
    expect(d).not.toHaveProperty("open_worldwide");
  });

  it("builds a programme deadline round", () => {
    const v = EntryForm.parse(fd({ type: "program", title: "MA X", kind: "masters", deadline_date: "2027-02-01", deadline_round: "R1" }));
    const d = buildData(v, { organisationId: "org-1" });
    expect(d).toMatchObject({ program_kind: "masters", institution_id: "org-1" });
    expect(d.application_deadlines).toEqual([{ round: "R1", date: "2027-02-01", source_text: null }]);
  });

  it("rejects a kind from another type, bad dates and non-http links", () => {
    const r = EntryForm.safeParse(fd({ type: "job", title: "Dev", kind: "masters", closes_at: "15/01/2027", apply_url: "javascript:alert(1)" }));
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["kind", "closes_at", "apply_url"]));
  });

  it("requires a title", () => {
    expect(EntryForm.safeParse(fd({ type: "resource", title: " " })).success).toBe(false);
  });
});
