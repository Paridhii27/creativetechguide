import Link from "next/link";
import type { CSSProperties } from "react";
import EntryIndex from "@/components/EntryIndex";
import Meanings from "@/components/Meanings";
import FieldGlobe from "@/components/FieldGlobe";
import { Accent } from "@/components/ui/layout";
import { BracketLabel, Mark } from "@/components/ui/primitives";
import { browseEntries, countBySection, getMapPoints } from "@/lib/db/entries";
import { mySavedIds } from "@/lib/db/mylayer";
import { addDays, daysUntil } from "@/lib/dates";
import { resolveLens } from "@/lib/lens-server";
import { isPlaceLens } from "@/lib/lens";
import { sectionSwatch, swatchVar } from "@/lib/swatch";
import { SECTIONS } from "@/lib/types";

const BLURB: Record<string, string> = {
  studios: "Who makes the work",
  programmes: "Where to study it",
  jobs: "Who's hiring",
  "open-calls": "Calls, grants, residencies",
  resources: "What to read and watch",
  tools: "What to make it with",
  events: "Where the field meets",
};

/** The rotating "It can mean" examples under the headline: hidden until there's a better version. */
const SHOW_MEANINGS: boolean = false;

/** Home: specimen hero (visual-direction reference), section index, and the next 60 days of deadlines. */
export default async function Home({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const lens = await resolveLens((await searchParams).lens);
  const [counts, points, savedIds, deadlines] = await Promise.all([
    countBySection(),
    getMapPoints(),
    mySavedIds(),
    Promise.all(
      (["opportunity", "job", "program"] as const).map((type) => browseEntries({ type, lens: lens.slug, dateFrom: addDays(0), dateTo: addDays(60), limit: 6 })),
    ),
  ]);
  const upcoming = deadlines
    .flatMap((d) => d.entries)
    .sort((a, b) => (a.key_date ?? "").localeCompare(b.key_date ?? ""))
    .slice(0, 8);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const thisWeek = upcoming.filter((e) => e.key_date && daysUntil(e.key_date) < 7).length;

  return (
    <div className="flex flex-col gap-20">
      {/* HERO ------------------------------------------------------------- */}
      <section className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
        <div className="@container">
          <BracketLabel className="text-ink-muted">Lens — {lens.label}</BracketLabel>
          {/* Also capped to the column's width, so "Technology" never runs into the globe. */}
          <h1 className="text-display-l mt-5 text-ink [font-size:min(clamp(48px,31.1px+4.51vw,96px),14cqw)]">
            <Accent>A map of</Accent> <span className="block text-accent-text">Creative technology</span>
          </h1>
          {SHOW_MEANINGS && <Meanings lens={lens.slug} />}
          <p className="text-body-l mt-6 max-w-xl text-ink-muted">
            Studios, programmes, jobs, open calls, publications and events in experience design and design technology. Pick a country or
            region in the lens to see what&apos;s based there or open to applicants from there.
          </p>
          <p className="text-body-l mt-4 max-w-xl text-ink-muted">
            Found something that&apos;s missing? Sign in and paste or drop any link (a studio, course, job, open call or event) to add it to{" "}
            <Link href="/me" className="text-ink underline decoration-1 underline-offset-4 hover:decoration-2">your own layer</Link>. It stays private
            until you suggest it to the Map.
          </p>
        </div>
        <FieldGlobe
          key={lens.slug}
          points={points}
          total={total}
          closing={{ week: thisWeek, sixtyDays: upcoming.length }}
          lens={lens.slug}
          lensLabel={lens.kind === "global" ? "All regions" : `Lens · ${lens.label}`}
          home={isPlaceLens(lens) ? lens.homeCountries : []}
        />
      </section>

      {/* SECTIONS --------------------------------------------------------- */}
      <section>
        <header className="flex items-end justify-between gap-4 border-b border-ink pb-2">
          <h2 className="text-label text-ink">Sections</h2>
          <span className="text-micro text-ink-muted">{SECTIONS.length} indexes</span>
        </header>
        <ul className="anim-stagger grid grid-cols-2 border-l border-line md:grid-cols-4">
          {SECTIONS.map((s) => {
            const sw = sectionSwatch(s);
            return (
              <li key={s.slug} className="@container min-w-0 border-r border-b border-line">
                <Link href={`/${s.slug}?lens=${lens.slug}`} className="group flex h-full flex-col gap-6 p-4 sm:p-5 transition-colors hover:bg-surface">
                  <span className="text-micro flex items-center gap-1.5 text-ink-muted">
                    <Mark swatch={sw} size={7} />
                    {BLURB[s.slug]}
                  </span>
                  {/* Name left, count right on one baseline; narrow tiles all stack the count under the name. */}
                  <span className="mt-auto flex flex-col items-start gap-x-3 gap-y-1 @[13.75rem]:flex-row @[13.75rem]:items-baseline-last @[13.75rem]:justify-between">
                    <span className="text-body min-w-0 break-words font-semibold leading-tight text-ink group-hover:underline">
                      {/* Always two lines: this name is too long to sit beside its count on one. */}
                      {s.slug === "resources" ? (
                        <>
                          Publications <br />
                          &amp;&nbsp;Resources
                        </>
                      ) : (
                        s.label
                      )}
                    </span>
                    {/* Takes the colour of the section's square above (darkened in Document: see globals.css). */}
                    <span className="section-count text-numeral shrink-0" style={sw ? ({ "--count": swatchVar(sw) } as CSSProperties) : undefined}>{counts[s.slug]}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* CLOSING SOON ----------------------------------------------------- */}
      <section className="grid gap-y-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-28 xl:gap-x-36">
        <div>
          <h2 className="text-heading text-ink">Closing soon</h2>
          <p className="text-body-s mt-3 text-ink-muted">Open calls, job closing dates and programme application rounds in the next 60 days.</p>
        </div>
        <EntryIndex entries={upcoming} lens={lens} byRelevance={false} savedIds={savedIds} empty="No dated deadlines in the next 60 days." />
      </section>
    </div>
  );
}
