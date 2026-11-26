import "server-only";
import { getDisciplines } from "./db/entries";
import { findEntryByUrl, submissionSignals } from "./db/mylayer";
import { checkEntry, siteOf, type Check, type Fetched } from "./link-checks";
import { normaliseUrl, unfurl, UnfurlError } from "./unfurl";
import type { Entry } from "./types";

async function fetchLink(url: string): Promise<Fetched> {
  try {
    const p = await unfurl(url);
    return { ok: true, url: p.url, title: p.title, description: p.description, text: p.text };
  } catch (e) {
    return e instanceof UnfurlError ? { ok: false, kind: e.kind, status: e.status } : { ok: false, kind: "failed" };
  }
}

const hostOf = (url: string) => {
  try {
    return siteOf(new URL(url).hostname);
  } catch {
    return null;
  }
};

/** Fetch a suggestion's links now and run every check on them. For the admin's review only. */
export async function runLinkChecks(e: Entry): Promise<Check[]> {
  const apply = typeof e.data.apply_url === "string" && e.data.apply_url !== e.url ? e.data.apply_url : null;
  let normalised: string | null = null;
  try {
    normalised = e.url ? normaliseUrl(e.url) : null;
  } catch {
    /* not a URL: the address check reports it */
  }
  const [page, applyPage, duplicate, signals, disciplines] = await Promise.all([
    e.url ? fetchLink(e.url) : null,
    apply ? fetchLink(apply) : null,
    normalised ? findEntryByUrl(normalised) : null,
    submissionSignals(e.id, e.owner_id, e.url ? hostOf(e.url) : null),
    getDisciplines(),
  ]);
  return checkEntry({
    url: e.url,
    page,
    applyUrl: apply,
    applyPage,
    title: e.title,
    summary: e.summary,
    disciplineLabels: disciplines.map((d) => d.label),
    duplicateTitle: duplicate && duplicate.id !== e.id ? duplicate.title : null,
    ...signals,
  });
}
