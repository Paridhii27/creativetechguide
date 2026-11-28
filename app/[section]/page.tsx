import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Filters from "@/components/Filters";
import Pager from "@/components/Pager";
import EntryIndex from "@/components/EntryIndex";
import EntryCatalogue from "@/components/EntryCatalogue";
import { PageTitle } from "@/components/ui/layout";
import { BracketLabel } from "@/components/ui/primitives";
import { browseEntries, getDisciplines } from "@/lib/db/entries";
import { mySavedIds } from "@/lib/db/mylayer";
import { currentPage, parseFilters, type Params } from "@/lib/filters";
import { resolveLens } from "@/lib/lens-server";
import { SHARE_IMAGE } from "@/lib/seo";
import { kindsForSection, sectionForSlug } from "@/lib/types";

const INTRO: Record<string, string> = {
  studios: "The studios, companies, labs, collectives, institutions and funders making creative technology happen.",
  programmes: "Degrees, diplomas, short courses and summer schools for curious minds.",
  jobs: "Where creative technologists, interaction developers and experience designers can find their next role.",
  "open-calls": "Open calls, commissions, residencies, grants, fellowships and competitions waiting for your ideas.",
  resources: "Magazines, journals, books, talks, communities, archives and directories to get lost in.",
  tools: "The software and hardware people play and make with. Open one to find its libraries, tutorials and communities.",
  events: "Festivals, conferences, exhibitions, meetups and degree shows where the field comes together.",
};

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const s = sectionForSlug((await params).section);
  if (!s) return { title: "Not found", robots: { index: false } };
  // Filtered and lens views share one canonical URL, so search engines index the section once.
  // The tab shows just the section name, without the site suffix.
  return { title: { absolute: s.label }, description: INTRO[s.slug], alternates: { canonical: `/${s.slug}` }, openGraph: { title: s.label, description: INTRO[s.slug], url: `/${s.slug}`, images: [SHARE_IMAGE] }, twitter: { card: "summary_large_image", title: s.label, description: INTRO[s.slug], images: [SHARE_IMAGE] } };
}

export default async function SectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<Params> }) {
  const section = sectionForSlug((await params).section);
  if (!section) notFound();
  const sp = await searchParams;
  const lens = await resolveLens(sp.lens);
  const filters = { ...parseFilters(sp, section.type, lens), ...(section.kind ? { kind: section.kind, remote: undefined, relevance: undefined } : {}), excludeKind: section.excludeKind };
  const [{ entries, hasMore, total }, disciplines, savedIds] = await Promise.all([browseEntries({ ...filters, withTotal: true }), getDisciplines(), mySavedIds()]);
  const page = currentPage(sp);

  const q = typeof sp.q === "string" ? sp.q : undefined;
  // Dated types read as an index table; organisations and resources as a catalogue of cards (DESIGN.md).
  const catalogue = section.type === "organisation" || section.type === "resource";
  const empty = "Nothing here with these filters yet. Try loosening one or two.";

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
            <EntryIndex type={section.type} entries={entries} lens={lens} disciplines={disciplines} query={q} empty={empty} savedIds={savedIds} />
          )}
          <Pager path={`/${section.slug}`} params={sp} page={page} hasMore={hasMore} total={total} />
        </div>
      </div>
    </div>
  );
}
