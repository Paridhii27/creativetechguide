import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Filters from "@/components/Filters";
import Pager from "@/components/Pager";
import EntryIndex from "@/components/EntryIndex";
import EntryCatalogue from "@/components/EntryCatalogue";
import { PageTitle } from "@/components/ui/layout";
import { BracketLabel } from "@/components/ui/primitives";
import { browseEntries, getDisciplines, getFxTable } from "@/lib/db/entries";
import { mySavedIds } from "@/lib/db/mylayer";
import { currentPage, parseFilters, type Params } from "@/lib/filters";
import { resolveLens } from "@/lib/lens-server";
import { kindsForSection, sectionForSlug } from "@/lib/types";

const INTRO: Record<string, string> = {
  studios: "Studios, companies, labs, collectives, institutions and funders working in creative technology.",
  programmes: "Degrees, diplomas, short courses and summer schools.",
  jobs: "Roles for creative technologists, interaction developers and experience designers.",
  "open-calls": "Open calls, commissions, residencies, grants, fellowships and competitions.",
  resources: "Magazines, journals, books, talks, communities, archives and directories.",
  tools: "Software and hardware people make the work with. Open one to see its libraries, tutorials and communities.",
  events: "Festivals, conferences, exhibitions, meetups and degree shows.",
};

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const s = sectionForSlug((await params).section);
  if (!s) return { title: "Not found", robots: { index: false } };
  // Filtered and lens views share one canonical URL, so search engines index the section once.
  // The tab shows just the section name, without the site suffix.
  return { title: { absolute: s.label }, description: INTRO[s.slug], alternates: { canonical: `/${s.slug}` }, openGraph: { title: s.label, description: INTRO[s.slug], url: `/${s.slug}` } };
}

export default async function SectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<Params> }) {
  const section = sectionForSlug((await params).section);
  if (!section) notFound();
  const sp = await searchParams;
  const lens = await resolveLens(sp.lens);
  const filters = { ...parseFilters(sp, section.type, lens), ...(section.kind ? { kind: section.kind, remote: undefined, relevance: undefined } : {}), excludeKind: section.excludeKind };
  const [{ entries, hasMore, total }, disciplines, fx, savedIds] = await Promise.all([browseEntries({ ...filters, withTotal: true }), getDisciplines(), getFxTable(), mySavedIds()]);
  const page = currentPage(sp);

  const q = typeof sp.q === "string" ? sp.q : undefined;
  // Dated types read as an index table; organisations and resources as a catalogue of cards (DESIGN.md).
  const catalogue = section.type === "organisation" || section.type === "resource";
  const empty = "No entries match these filters.";

  return (
    <div>
      <PageTitle
        title={section.label}
        eyebrow={section.kind ? undefined : <BracketLabel className="text-ink-muted">Lens — {lens.label}</BracketLabel>}
        aside={<p className="text-body-l max-w-md text-ink-muted">{INTRO[section.slug]}</p>}
      />
      <div className="mb-10 border-t border-line" />
      <div className={`group/browse grid gap-y-8 ${catalogue ? "lg:grid-cols-[13rem_minmax(0,64rem)] lg:gap-x-16 xl:gap-x-20" : "lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-28 xl:gap-x-36"}`}>
        <aside>
          <details className="group lg:hidden">
            <summary className="text-label flex cursor-pointer list-none items-center justify-between border-y border-line py-3 text-ink">
              Filters <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="pt-5 pb-2">
              <Filters type={section.type} kinds={kindsForSection(section)} params={sp} lens={lens} disciplines={disciplines} placeless={!!section.kind} />
            </div>
          </details>
          <div className="hidden lg:sticky lg:top-8 lg:block">
            <Filters type={section.type} kinds={kindsForSection(section)} params={sp} lens={lens} disciplines={disciplines} placeless={!!section.kind} />
          </div>
        </aside>
        {/* Dimmed while a filter change is loading (AutoSubmit marks its form). */}
        <div className="min-w-0 transition-opacity group-has-data-pending/browse:opacity-50">
          {catalogue ? (
            <EntryCatalogue entries={entries} lens={lens} disciplines={disciplines} query={q} empty={empty} savedIds={savedIds} placeless={!!section.kind} />
          ) : (
            <EntryIndex type={section.type} entries={entries} lens={lens} fx={fx} disciplines={disciplines} query={q} empty={empty} savedIds={savedIds} />
          )}
          <Pager path={`/${section.slug}`} params={sp} page={page} hasMore={hasMore} total={total} />
        </div>
      </div>
    </div>
  );
}
