import { describe, expect, it } from "vitest";
import { findImages } from "@/lib/images";

describe("images on a page", () => {
  const html = `<head>
    <link rel="icon" sizes="32x32" href="/icon-32.png">
    <link rel="apple-touch-icon" href="/touch.png">
    <meta property="og:image" content="/cover.jpg">
    <!-- <img src="/commented.png"> --></head><body>
    <img class="site-logo" src="/brand.svg">
    <img src="/small.jpg" srcset="/w400.jpg 400w, /w1200.jpg 1200w">
    <img src="/pixel.gif" width="1" height="1">
    <img src="data:image/png;base64,AAAA">
    <img data-src="/lazy.jpg" src="data:image/gif;base64,AAAA">
    <img src="/cover.jpg"></body>`;
  const found = findImages(html, "https://example.org/about");
  const paths = (slot: string) => found.filter((i) => i.slot === slot).map((i) => i.url.replace("https://example.org", ""));

  it("lists named logos, then icons largest first", () => {
    expect(paths("logo")).toEqual(["/brand.svg", "/touch.png", "/icon-32.png", "/apple-touch-icon.png"]);
  });
  it("lists photos with the widest source, without pixels, inline data, comments or repeats", () => {
    expect(paths("photo")).toEqual(["/cover.jpg", "/w1200.jpg", "/lazy.jpg"]);
  });
  it("refuses other protocols", () => {
    expect(findImages('<img src="javascript:alert(1)"><img src="file:///etc/passwd">', "https://a.b/").map((i) => i.url)).toEqual(["https://a.b/apple-touch-icon.png"]);
  });
});
