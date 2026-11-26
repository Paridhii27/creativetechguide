/** Checks on links people type, with messages in plain language. Safe to use in the browser and on the server. */

export const NOT_A_LINK = "That doesn't look like a web address. Paste a full link, such as https://example.com.";

/** Add https:// to a link typed without it ("example.com/jobs"). */
export const withScheme = (raw: string) => (/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);

/** What's wrong with a full http(s) link, or null if it's well formed. Doesn't check that the site exists. */
export function linkProblem(url: string): string | null {
  if (!/^https?:\/\/\S+$/i.test(url)) return NOT_A_LINK;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return NOT_A_LINK;
  }
  if (u.username || u.password) return "Links with a username or password in them can't be added.";
  // A public website has a name ending in a domain such as .com or .in ("asdfgh" doesn't).
  const labels = u.hostname.replace(/\.$/, "").split(".");
  const ending = labels.at(-1) ?? "";
  if (labels.length < 2 || labels.some((l) => !l) || !/^([a-z]{2,}|xn--[a-z0-9-]+)$/.test(ending)) return NOT_A_LINK;
  return null;
}
