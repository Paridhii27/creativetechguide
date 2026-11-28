import SearchField from "@/components/ui/SearchField";
import type { Metadata } from "next";
import EntryList from "@/components/EntryList";
import Pager from "@/components/Pager";
import { browseEntries } from "@/lib/db/entries";
import { mySavedIds } from "@/lib/db/mylayer";
import { currentPage, parseFilters, type Params } from "@/lib/filters";
import { resolveLens } from "@/lib/lens-server";
import { ENTRY_TYPES, SECTIONS, type EntryType } from "@/lib/types";
import Link from "next/link";
import { PageTitle, SIDEBAR_GRID } from "@/components/ui/layout";
import { BracketLabel } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const lens = await resolveLens(sp.lens);
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const typeParam = Array.isArray(sp.type) ? sp.type[0] : sp.type;
  const inParam = Array.isArray(sp.in) ? sp.in[0] : sp.in;
  // `in` names a section (so Tools and Publications can be searched apart); plain `type` still works.
  const section = SECTIONS.find((s) => s.slug === inParam) ?? (!typeParam ? undefined : SECTIONS.find((s) => s.type === typeParam && !s.kind));
  const type: EntryType | undefined = section?.type ?? ((ENTRY_TYPES as readonly string[]).includes(typeParam ?? "") ? (typeParam as EntryType) : undefined);
  const filters = { ...parseFilters(sp, type, lens), ...(section?.kind ? { kind: section.kind } : {}), ...(section?.excludeKind ? { excludeKind: section.excludeKind } : {}) };
  const [{ entries, hasMore, total }, savedIds] = q ? await Promise.all([browseEntries({ ...filters, withTotal: true }), mySavedIds()]) : [{ entries: [], hasMore: false, total: 0 }, new Set<string>()];

  // A wrapping row of pills on small screens; a hairline list in the left column from lg up.
  const item = (on: boolean) =>
    `text-label block rounded-full border px-3.5 py-1.5 transition-colors lg:rounded-none lg:border-0 lg:border-b lg:border-l-2 lg:border-b-line lg:py-3 ${
      on ? "border-ink bg-ink text-bg lg:border-l-accent lg:bg-surface lg:text-ink" : "border-line text-ink-muted hover:border-ink hover:text-ink lg:border-l-transparent lg:hover:border-b-line lg:hover:bg-surface"
    }`;
  const options = [{ slug: undefined, label: "All types" }, ...SECTIONS];

  return (
    <div>
      <PageTitle title="Search" eyebrow={<BracketLabel className="text-ink-muted">Lens — {lens.label}</BracketLabel>} />
      <div className="mb-10 border-t border-line" />
      <div className={`${SIDEBAR_GRID} lg:grid-rows-[auto_1fr]`}>
        <form className="flex gap-2 lg:col-start-2 lg:row-start-1" action="/search">
          <input type="hidden" name="lens" value={lens.slug} />
          <SearchField key={q} name="q" size="l" className="min-w-0 flex-1" defaultValue={q} autoFocus placeholder="Studios, programmes, tools, cities…" aria-label="Search" />
          <button className="text-label shrink-0 rounded-full border border-ink bg-ink px-5 text-bg transition-colors hover:bg-transparent hover:text-ink">Search</button>
        </form>
        <aside className={`lg:sticky lg:top-8 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start ${q ? "" : "max-lg:order-first"}`}>
          {q ? (
            <nav aria-label="Filter by section">
              <ul className="flex flex-wrap gap-2 lg:block lg:border-t lg:border-line">
                {options.map((s) => {
                  const on = section?.slug === s.slug;
                  return (
                    <li key={s.label}>
                      <Link href={`/search?q=${encodeURIComponent(q)}&lens=${lens.slug}${s.slug ? `&in=${s.slug}` : ""}`} className={item(on)} aria-current={on ? "page" : undefined}>
                        {s.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : (
            <p className="text-body-s text-ink-muted">Rummage through every studio, programme, job, open call, resource and event.</p>
          )}
        </aside>
        {q && (
          <div className="min-w-0 lg:col-start-2 lg:row-start-2">
            <EntryList entries={entries} lens={lens} savedIds={savedIds} empty={<>Nothing for &ldquo;{q}&rdquo; yet. Try another word?</>} />
            <Pager path="/search" params={sp} page={currentPage(sp)} hasMore={hasMore} total={total} />
          </div>
        )}
      </div>
    </div>
  );
}
