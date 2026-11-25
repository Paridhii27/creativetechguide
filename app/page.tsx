import Link from "next/link";
import EntryIndex from "@/components/EntryIndex";
import { AnnotationBox, Specimen } from "@/components/ui/hud";
import { Globe } from "@/components/ui/Globe";
import { Accent } from "@/components/ui/layout";
import { BracketLabel, Mark } from "@/components/ui/primitives";
import { browseEntries, countBySection, getFxTable } from "@/lib/db/entries";
import { mySavedIds } from "@/lib/db/mylayer";
import { addDays, daysUntil } from "@/lib/dates";
import { resolveLens } from "@/lib/lens-server";
import { TYPE_SWATCH } from "@/lib/swatch";
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

/** Home: specimen hero (visual-direction reference), section index, and the next 60 days of deadlines. */
export default async function Home({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const lens = await resolveLens((await searchParams).lens);
  const [counts, fx, savedIds, deadlines] = await Promise.all([
    countBySection(),
    getFxTable(),
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
        <div>
          <BracketLabel className="text-ink-muted">Lens — {lens.label}</BracketLabel>
          <h1 className="text-display-l mt-5 text-ink">
            A field guide to <Accent>creative technology</Accent>
          </h1>
          <p className="text-body-l mt-6 max-w-xl text-ink-muted">
            Studios, programmes, jobs, open calls, publications and events in experience design and design technology. Pick a country or
            region in the lens to see what&apos;s based there or open to applicants from there.
          </p>
        </div>
        <Specimen
          label="The field"
          aspect="1/1"
          coords={lens.kind === "global" ? "All regions" : `Lens · ${lens.label}`}
          annotations={[
            {
              id: "map",
              swatch: 5,
              anchor: { x: 40, y: 34 },
              to: { x: 24, y: 16 },
              via: { x: 24, y: 34 },
              box: { x: 4, y: 8, w: 40 },
              content: <AnnotationBox title="On the Map" swatch={5} rows={[{ label: "Entries", value: total.toLocaleString("en") }, { label: "Sections", value: SECTIONS.length }]} />,
            },
            {
              id: "week",
              swatch: 1,
              anchor: { x: 62, y: 60 },
              to: { x: 78, y: 76 },
              via: { x: 78, y: 60 },
              box: { x: 56, y: 76, w: 40 },
              content: (
                <AnnotationBox title="Closing" swatch={1} rows={[{ label: "This week", value: thisWeek }, { label: "60 days", value: upcoming.length }]} />
              ),
            },
          ]}
        >
          <Globe />
        </Specimen>
      </section>

      {/* SECTIONS --------------------------------------------------------- */}
      <section>
        <header className="flex items-end justify-between gap-4 border-b border-ink pb-2">
          <h2 className="text-label text-ink">Sections</h2>
          <span className="text-micro text-ink-muted">{SECTIONS.length} indexes</span>
        </header>
        <ul className="anim-stagger grid grid-cols-2 border-l border-line md:grid-cols-4">
          {SECTIONS.map((s) => {
            const sw = s.kind ? null : TYPE_SWATCH[s.type];
            return (
              <li key={s.slug} className="border-r border-b border-line">
                <Link href={`/${s.slug}?lens=${lens.slug}`} className="group flex h-full flex-col gap-6 p-5 transition-colors hover:bg-surface">
                  <span className="text-micro flex items-center gap-1.5 text-ink-muted">
                    <Mark swatch={sw} size={7} />
                    {BLURB[s.slug]}
                  </span>
                  <span className="mt-auto flex items-end justify-between gap-3">
                    <span className="text-body font-semibold leading-tight text-ink group-hover:underline">{s.label}</span>
                    <span className="text-numeral text-ink">{counts[s.slug]}</span>
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
        <EntryIndex entries={upcoming} lens={lens} fx={fx} byRelevance={false} savedIds={savedIds} empty="No dated deadlines in the next 60 days." />
      </section>
    </div>
  );
}
