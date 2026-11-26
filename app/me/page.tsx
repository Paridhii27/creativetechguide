import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import EntryList from "@/components/EntryList";
import EntryActions from "@/components/EntryActions";
import LayerInsights from "@/components/LayerInsights";
import AddForm from "@/app/add/AddForm";
import Bookmarklet from "@/components/Bookmarklet";
import { Accent, PageTitle } from "@/components/ui/layout";
import { BracketLabel, Mark } from "@/components/ui/primitives";
import { getCountryNames, getDisciplines, getFxTable, getPlaces, getToolNames } from "@/lib/db/entries";
import { getCurrentUser } from "@/lib/db/profiles";
import { isAdmin, listMyEntries, pendingReviewCount } from "@/lib/db/mylayer";
import { layerInsights } from "@/lib/insights";
import { resolveLens } from "@/lib/lens-server";
import type { Swatch } from "@/lib/swatch";
import type { Entry } from "@/lib/types";

export const metadata: Metadata = { title: "My Layer", robots: { index: false } };

type ViewKey = "saved" | "private" | "pending" | "public";

/** The four parts of a layer, in the order they're listed. `own` views filter the user's own entries. */
const VIEWS: { key: ViewKey; label: string; note: string; empty: string; swatch: Swatch; own?: (e: Entry) => boolean }[] = [
  {
    key: "saved",
    label: "Saved",
    note: "Entries from the Map you saved, most recent first.",
    empty: "Nothing saved yet. Press “Save to My Layer” on any entry in the guide and it shows up here.",
    swatch: 1,
  },
  {
    key: "private",
    label: "Private",
    note: "Sources you added that only you can see. Suggest any of them to the Map.",
    empty: "No private entries. Paste a link above to add a studio, course, job or open call that isn’t on the Map yet.",
    swatch: 2,
    own: (e) => e.visibility === "private" && (e.status === "draft" || e.status === "rejected"),
  },
  {
    key: "pending",
    label: "Suggested",
    note: "Waiting for review. Only you and admins can see these until they’re approved.",
    empty: "Nothing waiting for review. Use “Suggest to the Map” on a private entry to send it in.",
    swatch: 4,
    own: (e) => e.status === "pending_review",
  },
  {
    key: "public",
    label: "On the Map",
    note: "Entries you added that are now public.",
    empty: "None of your entries are on the Map yet.",
    swatch: 3,
    own: (e) => e.visibility === "public" && e.status === "approved",
  },
];

const isViewKey = (v: unknown): v is ViewKey => VIEWS.some((x) => x.key === v);

export default async function MyLayerPage({ searchParams }: { searchParams: Promise<{ lens?: string; added?: string; view?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me");
  const sp = await searchParams;
  const lens = await resolveLens(sp.lens);
  const [{ own, saved }, fx, admin, reviewCount, places, countries, disciplines, tools] = await Promise.all([
    listMyEntries(),
    getFxTable(),
    isAdmin(),
    pendingReviewCount(),
    getPlaces(),
    getCountryNames(),
    getDisciplines(),
    getToolNames(),
  ]);

  const items: Record<ViewKey, Entry[]> = {
    saved,
    private: own.filter(VIEWS[1].own!),
    pending: own.filter(VIEWS[2].own!),
    public: own.filter(VIEWS[3].own!),
  };
  const added = sp.added ? own.find((e) => e.id === sp.added) : undefined;
  const addedView = added && VIEWS.find((v) => v.own?.(added))?.key;
  const insightsOpen = sp.view === "insights";
  const view: ViewKey = isViewKey(sp.view) ? sp.view : (addedView ?? VIEWS.find((v) => items[v.key].length > 0)?.key ?? "saved");
  const current = VIEWS.find((v) => v.key === view)!;
  const href = (k: ViewKey | "insights") => `/me?view=${k}${sp.lens ? `&lens=${lens.slug}` : ""}`;

  return (
    <div>
      <PageTitle
        title="My Layer"
        meta={<BracketLabel className="text-ink-muted">{saved.length + own.length} entries</BracketLabel>}
        aside={
          <p className="text-body-l max-w-md text-ink-muted">
            Your own layer on top of the Map: what you&apos;ve <Accent>saved</Accent>, sources you&apos;ve added, and what you&apos;ve suggested for everyone.
          </p>
        }
      />

      {added && (
        <p className="text-body-s mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 border border-accent px-4 py-3 text-ink">
          <Mark swatch={1} size={7} />
          Added &ldquo;<Link href={`/entry/${added.id}`} className="underline underline-offset-4">{added.title}</Link>&rdquo; to your layer.{" "}
          {added.status === "pending_review" ? "It's waiting for review." : added.visibility === "public" ? "It's live on the Map." : admin ? "It's private; publish it to the Map whenever you're ready." : "It's private; suggest it to the Map whenever you're ready."}
        </p>
      )}

      {/* ADD A SOURCE ------------------------------------------------------ */}
      <section aria-labelledby="add-source" className="mb-12 grid gap-x-10 gap-y-4 border border-ink p-5 sm:p-7 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-center lg:has-[fieldset]:items-start">
        <div>
          <h2 id="add-source" className="text-heading text-ink">Add a source</h2>
          <p className="text-body-s mt-2 text-ink-muted">
            Paste a link to a studio, course, job, open call, event or resource. We fill in the details; you check them and save. It stays private unless you suggest it to the Map.
          </p>
        </div>
        <div className="min-w-0">
          {/* Keyed on the last saved entry so the form clears once a save lands back here. */}
          <AddForm key={sp.added ?? "new"} inline initialUrl="" places={places} countries={countries} disciplines={disciplines} tools={tools} isAdmin={admin} />
          <p className="text-body-s mt-3 text-ink-muted">
            Or paste or drop a link anywhere on the site, press <kbd className="text-tag border border-line px-1.5 py-0.5 text-ink">N</kbd>, or drag <Bookmarklet /> to your bookmarks bar.
          </p>
        </div>
      </section>

      {/* VIEWS + LIST ------------------------------------------------------ */}
      <div className="grid gap-y-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-28 xl:gap-x-36">
        <nav aria-label="My Layer" className="lg:sticky lg:top-8 lg:self-start">
          <ul className="grid grid-cols-2 border-t border-line sm:grid-cols-4 lg:grid-cols-1">
            {VIEWS.map((v) => {
              const active = !insightsOpen && v.key === view;
              return (
                <li key={v.key} className="border-b border-line">
                  <Link
                    href={href(v.key)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-end justify-between gap-3 border-l-2 py-3 pr-2 pl-3 transition-colors ${active ? "border-accent bg-surface" : "border-transparent hover:bg-surface"}`}
                  >
                    <span className={`text-label flex items-center gap-2 ${active ? "text-ink" : "text-ink-muted"}`}>
                      <Mark swatch={v.swatch} size={7} />
                      {v.label}
                    </span>
                    <span className="text-numeral text-ink">{items[v.key].length}</span>
                  </Link>
                </li>
              );
            })}
            <li className="col-span-2 border-b border-line sm:col-span-4 lg:col-span-1">
              <Link
                href={href("insights")}
                aria-current={insightsOpen ? "page" : undefined}
                className={`flex items-end justify-between gap-3 border-l-2 py-3 pr-2 pl-3 transition-colors ${insightsOpen ? "border-accent bg-surface" : "border-transparent hover:bg-surface"}`}
              >
                <span className={`text-label flex items-center gap-2 ${insightsOpen ? "text-ink" : "text-ink-muted"}`}>
                  <Mark swatch={5} size={7} />
                  Insights
                </span>
                {/* Not a count, so a little bar chart takes the numeral's place and keeps the rows the same height. */}
                <span aria-hidden className="text-numeral flex h-[1em] items-center text-ink">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-[0.75em] w-[0.75em]">
                    <path d="M0 11h5v9H0zM7.5 0h5v20h-5zM15 6h5v14h-5z" />
                  </svg>
                </span>
              </Link>
            </li>
            {/* Only the admin reviews suggestions, so the queue lives here rather than in everyone's navbar. */}
            {admin && (
              <li className="col-span-2 border-b border-line sm:col-span-4 lg:col-span-1 lg:mt-6 lg:border-t">
                <Link
                  href="/admin/review"
                  title="Suggestions waiting for you to approve or reject"
                  className="flex items-end justify-between gap-3 border-l-2 border-transparent py-3 pr-2 pl-3 transition-colors hover:bg-surface"
                >
                  <span className="text-label flex items-center gap-2 text-ink">
                    Review queue <span aria-hidden>→</span>
                  </span>
                  <span className={`text-numeral ${reviewCount > 0 ? "text-accent-text" : "text-ink-muted"}`}>{reviewCount}</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {insightsOpen ? (
          <section className="min-w-0" aria-labelledby="view-title">
            <header className="mb-5">
              <h2 id="view-title" className="text-heading flex items-center gap-2 text-ink">
                <Mark swatch={5} size={9} />
                Insights
              </h2>
              <p className="text-body-s mt-2 text-ink-muted">What&apos;s in your layer: what you&apos;ve saved and what you&apos;ve added. Only you see this.</p>
            </header>
            <LayerInsights insights={layerInsights([...own, ...saved], lens)} added={own.length} lens={lens} disciplines={disciplines} />
          </section>
        ) : (
          <section className="min-w-0" aria-labelledby="view-title">
            <header className="mb-5">
              <h2 id="view-title" className="text-heading flex items-center gap-2 text-ink">
                <Mark swatch={current.swatch} size={9} />
                {current.label}
              </h2>
              <p className="text-body-s mt-2 text-ink-muted">{current.note}</p>
            </header>
            <EntryList
              entries={items[view]}
              lens={lens}
              fx={fx}
              empty={current.empty}
              actionsFor={(e) => (
                <EntryActions
                  compact={view !== "saved"}
                  inLayer
                  entryId={e.id}
                  signedIn
                  saved
                  isOwner={e.owner_id === user.id}
                  isAdmin={admin}
                  status={e.status}
                  visibility={e.visibility}
                />
              )}
            />
          </section>
        )}
      </div>
    </div>
  );
}
