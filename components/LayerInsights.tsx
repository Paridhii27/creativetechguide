import Link from "next/link";
import type { ReactNode } from "react";
import { BentoCard, BentoGrid, BigStat } from "@/components/ui/layout";
import { DeadlineMark } from "@/components/ui/status";
import type { LayerInsights as Insights } from "@/lib/insights";
import { sectionSwatch, swatchFor, swatchVar, type Swatch } from "@/lib/swatch";
import { humanize, RELEVANCE, type Discipline, type Lens, type Relevance } from "@/lib/types";

const TOP = 6;

interface Row {
  key: string;
  label: string;
  count: number;
  swatch: Swatch | null;
  href?: string;
}

/** A labelled horizontal bar per row: the name and number are text, the swatch bar only shows size. */
function Bars({ rows }: { rows: Row[] }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="mt-4 space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="text-body-s flex items-baseline justify-between gap-3">
            {r.href ? (
              <Link href={r.href} className="min-w-0 truncate hover:underline">{r.label}</Link>
            ) : (
              <span className="min-w-0 truncate">{r.label}</span>
            )}
            <span className="tabular-nums">{r.count}</span>
          </div>
          <div
            aria-hidden
            className="mt-1 h-1.5 rounded-r-sm"
            style={{ width: `${(r.count / max) * 100}%`, background: r.swatch ? swatchVar(r.swatch) : "var(--ink)" }}
          />
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, note, empty, children, wide }: { title: string; note?: string; empty?: string; children?: ReactNode; wide?: boolean }) {
  return (
    <BentoCard className={wide ? "col-span-2 md:col-span-4" : "col-span-2"}>
      <h3 className="text-micro text-ink-muted">{title}</h3>
      {empty ? <p className="text-body-s mt-4 text-ink-muted">{empty}</p> : children}
      {note && !empty && <p className="text-body-s mt-4 text-ink-muted">{note}</p>}
    </BentoCard>
  );
}

const RELEVANCE_LABEL: Record<Relevance, (place: string) => string> = {
  based_in: (p) => `Based in ${p}`,
  open_to: (p) => `Open to ${p}`,
  unknown: () => "Eligibility unclear",
  not_open: (p) => `Not open to ${p}`,
};

/** Insights over the signed-in user's own layer. */
export default function LayerInsights({ insights: i, added, lens, disciplines }: { insights: Insights; added: number; lens: Lens; disciplines: Discipline[] }) {
  if (i.total === 0) return <p className="text-body ticks border border-line p-5 text-ink-muted">Save or add a few entries and your insights show up here.</p>;
  const label = new Map(disciplines.map((d) => [d.slug, d.label]));
  const next = i.upcoming.slice(0, TOP);

  return (
    <BentoGrid>
      <BentoCard><BigStat label="In your layer" value={i.total} /></BentoCard>
      <BentoCard><BigStat label="Added by you" value={added} /></BentoCard>
      <BentoCard tone="swatch" swatch={1}><BigStat label="Deadlines in 30 days" value={i.deadlinesIn30} /></BentoCard>
      <BentoCard tone="swatch" swatch={4}><BigStat label="Events in 30 days" value={i.eventsIn30} /></BentoCard>

      <Panel title="Coming up" wide empty={next.length ? undefined : "Nothing in your layer has a date ahead."}>
        <ul className="mt-3 divide-y divide-line">
          {next.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
              <Link href={`/entry/${e.id}`} className="text-body-s min-w-0 truncate font-semibold hover:underline">{e.title}</Link>
              <DeadlineMark date={e.key_date} label={e.type === "event" ? "Starts" : "Deadline"} event={e.type === "event"} />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="What you collect">
        <Bars rows={i.bySection.map(({ section, count }) => ({ key: section.slug, label: section.label, count, swatch: sectionSwatch(section), href: `/${section.slug}?lens=${lens.slug}` }))} />
      </Panel>

      <Panel title="Your disciplines" empty={i.disciplines.length ? undefined : "No disciplines tagged yet."}>
        <Bars rows={i.disciplines.slice(0, TOP).map((d) => ({ key: d.key, label: label.get(d.key) ?? humanize(d.key), count: d.count, swatch: swatchFor(d.key) }))} />
      </Panel>

      <Panel title="Where it is" empty={i.countries.length || i.remote ? undefined : "No places recorded yet."} note={i.remote ? `${i.remote} remote or online.` : undefined}>
        <Bars rows={i.countries.slice(0, TOP).map((c) => ({ key: c.key, label: c.key, count: c.count, swatch: null }))} />
      </Panel>

      <Panel title="Skills in your jobs" empty={i.skills.length ? undefined : "Save jobs that list skills to see which come up most."}>
        <Bars rows={i.skills.slice(0, TOP).map((s) => ({ key: s.key, label: s.key, count: s.count, swatch: swatchFor(s.key) }))} />
      </Panel>

      {i.relevance && (
        <Panel title={`For ${lens.label}`} wide>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {RELEVANCE.map((r) => (
              <div key={r}>
                <dt className="text-body-s text-ink-muted">{RELEVANCE_LABEL[r](lens.label)}</dt>
                <dd className="text-numeral mt-1">{i.relevance![r]}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}
    </BentoGrid>
  );
}
