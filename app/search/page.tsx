import SearchField from "@/components/ui/SearchField";
import type { Metadata } from "next";
import EntryList from "@/components/EntryList";
import Pager from "@/components/Pager";
import { browseEntries, getFxTable } from "@/lib/db/entries";
import { mySavedIds } from "@/lib/db/mylayer";
import { currentPage, parseFilters, type Params } from "@/lib/filters";
import { resolveLens } from "@/lib/lens-server";
import { ENTRY_TYPES, SECTIONS, type EntryType } from "@/lib/types";
import Link from "next/link";
import { PageTitle } from "@/components/ui/layout";
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
  const [{ entries, hasMore, total }, fx, savedIds] = q ? await Promise.all([browseEntries({ ...filters, withTotal: true }), getFxTable(), mySavedIds()]) : [{ entries: [], hasMore: false, total: 0 }, {}, new Set<string>()];

  const pill = (on: boolean) =>
    `text-label rounded-full border px-3.5 py-1.5 transition-colors ${on ? "border-ink bg-ink text-bg" : "border-line text-ink-muted hover:border-ink hover:text-ink"}`;

  return (
    <div>
      <PageTitle title="Search" eyebrow={<BracketLabel className="text-ink-muted">Lens — {lens.label}</BracketLabel>} />
      <div className="max-w-3xl">
        <form className="flex gap-2" action="/search">
          <input type="hidden" name="lens" value={lens.slug} />
          <SearchField key={q} name="q" size="l" className="min-w-0 flex-1" defaultValue={q} autoFocus placeholder="Studios, programmes, tools, cities…" aria-label="Search" />
          <button className="text-label shrink-0 rounded-full border border-ink bg-ink px-5 text-bg transition-colors hover:bg-transparent hover:text-ink">Search</button>
        </form>
        {q && (
          <nav className="mt-5 flex flex-wrap gap-2" aria-label="Filter by section">
            <Link href={`/search?q=${encodeURIComponent(q)}&lens=${lens.slug}`} className={pill(!section)} aria-current={!section ? "page" : undefined}>
              All types
            </Link>
            {SECTIONS.map((s) => (
              <Link
                key={s.slug}
                href={`/search?q=${encodeURIComponent(q)}&lens=${lens.slug}&in=${s.slug}`}
                className={pill(section?.slug === s.slug)}
                aria-current={section?.slug === s.slug ? "page" : undefined}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="mt-10">
          {q ? (
            <>
              <EntryList entries={entries} lens={lens} fx={fx} savedIds={savedIds} empty={<>No results for &ldquo;{q}&rdquo;.</>} />
              <Pager path="/search" params={sp} page={currentPage(sp)} hasMore={hasMore} total={total} />
            </>
          ) : (
            <p className="text-body-l text-ink-muted">Search across every studio, programme, job, open call, resource and event.</p>
          )}
        </div>
      </div>
    </div>
  );
}
