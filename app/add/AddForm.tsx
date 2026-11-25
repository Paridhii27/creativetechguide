"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { saveEntryAction, toggleSavedAction } from "@/app/actions/entries";
import EntryEditor, { type FormValues } from "@/components/EntryEditor";
import { guessType, suggestionsToFormValues, type Suggested } from "@/lib/extract";
import type { Discipline, Place } from "@/lib/types";

interface Page {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  favicon_url: string | null;
  site_name: string | null;
  suggested?: Suggested;
}
interface UnfurlResult {
  page: Page | null;
  existing: { id: string; title: string } | null;
  warning?: string;
  error?: string;
}

export default function AddForm({ initialUrl, places, countries, disciplines, tools, initialTool, isAdmin }: { initialUrl: string; places: Place[]; countries: string[]; disciplines: Discipline[]; tools: string[]; initialTool?: string; isAdmin: boolean }) {
  const [url, setUrl] = useState(initialUrl);
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<UnfurlResult | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [savedDup, setSavedDup] = useState<string | null>(null);
  const autoFetched = useRef(false);

  async function fetchUrl(target = url) {
    if (!target.trim()) return;
    let u = target.trim();
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    setUrl(u);
    setFetching(true);
    setResult(null);
    try {
      const res = await fetch("/api/unfurl", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: u }) });
      const json = (await res.json()) as UnfurlResult;
      setResult(res.ok ? json : { page: null, existing: null, error: json.error ?? "Couldn't fetch that link." });
      if (res.ok) {
        setShowForm(!json.existing);
      }
    } catch {
      setResult({ page: null, existing: null, warning: "Couldn't reach that page. You can still add it by hand." });
      setShowForm(true);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (initialUrl && !autoFetched.current) {
      autoFetched.current = true;
      void fetchUrl(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  const page = result?.page ?? null;
  const duplicate = result?.existing ?? null;
  const suggested = suggestionsToFormValues(page?.suggested ?? {});
  const found = Object.keys(suggested).filter((k) => k !== "type").length;
  const initial: FormValues = {
    type: page ? (page.suggested?.type ?? guessType(`${page.url} ${page.title ?? ""} ${page.description ?? ""}`)) : "organisation",
    title: page?.title ?? "",
    summary: page?.description ?? "",
    url: page ? undefined : /^https?:\/\//.test(url) ? url : "",
    ...suggested,
  };
  // Came from a tool's page: this is a resource *for* that tool, not a tool itself.
  if (initialTool) {
    initial.type = "resource";
    initial.tool_name = initialTool;
    if (!initial.kind || initial.kind === "tool") initial.kind = "library";
  }

  return (
    <div className="space-y-8">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void fetchUrl();
        }}
      >
        <input
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://… a studio, programme, job, open call, event or article"
          aria-label="Link"
          autoFocus={!initialUrl}
          className="field text-body"
        />
        <div className="flex gap-2">
          <button disabled={fetching || !url.trim()} className="text-label whitespace-nowrap rounded-full border border-ink bg-ink px-4 py-2 text-bg transition-colors hover:bg-transparent hover:text-ink disabled:opacity-50">
            {fetching ? "Fetching…" : "Fetch details"}
          </button>
          {!showForm && (
            <button type="button" onClick={() => setShowForm(true)} className="text-label whitespace-nowrap rounded-full border border-ink px-4 py-2 text-ink transition-colors hover:bg-ink hover:text-bg">
              Add by hand
            </button>
          )}
        </div>
      </form>

      {result?.error && <p className="text-body-s text-accent-text">{result.error}</p>}
      {result?.warning && <p className="text-body-s text-ink-muted">{result.warning} Fill in the details below.</p>}

      {duplicate && (
        <div className="ticks text-body-s border border-line bg-surface p-4 text-ink">
          <p>
            <strong>Already on the Map:</strong>{" "}
            <Link href={`/entry/${duplicate.id}`} className="underline">{duplicate.title}</Link>
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {savedDup === duplicate.id ? (
              <span className="chip">Saved to your layer</span>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const err = await toggleSavedAction(duplicate.id, true);
                  if (!err) setSavedDup(duplicate.id);
                }}
                className="text-label whitespace-nowrap rounded-full border border-ink bg-ink px-4 py-2 text-bg transition-colors hover:bg-transparent hover:text-ink disabled:opacity-50"
              >
                Save it to My Layer
              </button>
            )}
            <Link href={`/entry/${duplicate.id}`} className="py-1.5 underline">Open entry</Link>
          </div>
        </div>
      )}

      {page && (
        <div className="ticks flex gap-4 border border-line p-4">
          {page.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={page.image_url} alt="" className="mode-img h-20 w-32 shrink-0 object-cover" />
          )}
          <div className="min-w-0 text-body-s">
            <p className="label truncate">{page.site_name ?? new URL(page.url).hostname}</p>
            <p className="text-body mt-1 font-semibold leading-snug text-ink">{page.title ?? "Untitled page"}</p>
            {page.description && <p className="mt-1 line-clamp-2 text-ink-muted">{page.description}</p>}
          </div>
        </div>
      )}

      {showForm && (
        <EntryEditor
          key={page?.url ?? "manual"}
          mode="add"
          initial={initial}
          hidden={{ ...(page ? { url: page.url } : {}), image_url: page?.image_url ?? "", favicon_url: page?.favicon_url ?? "" }}
          editableUrl={!page}
          action={saveEntryAction}
          places={places}
          countries={countries}
          disciplines={disciplines}
          tools={tools}
          favicon={page?.favicon_url}
          image={page?.image_url}
          isAdmin={isAdmin}
          note={page ? (found > 0 ? `Filled in ${found} detail${found === 1 ? "" : "s"} from the page. Change anything that's off; everything stays editable after saving.` : "Guessed from the page. Change anything that's off; everything stays editable after saving.") : undefined}
        />
      )}
    </div>
  );
}
