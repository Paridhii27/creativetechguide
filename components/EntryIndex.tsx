import type { ReactNode } from "react";
import { daysUntil } from "@/lib/dates";
import { getEntriesByIds } from "@/lib/db/entries";
import { costLine } from "@/lib/cost";
import { entryPicture } from "@/lib/icon";
import { DEFAULT_BAND_LABELS, groupByDeadline, type BandLabels } from "@/lib/index-groups";
import type { FxTable } from "@/lib/money";
import { locationLabel } from "@/lib/places";
import { placeRelevance } from "@/lib/relevance";
import { entrySwatch, TYPE_SWATCH } from "@/lib/swatch";
import { humanize, isTool, KINDS, type Discipline, type Entry, type EntryType, type Lens } from "@/lib/types";
import { IndexGroup, IndexRow } from "@/components/ui/IndexRow";
import { DisciplineTag, LocationLabel, Tag } from "@/components/ui/primitives";
import { DeadlineMark, EligibilityTag } from "@/components/ui/status";
import { dateLabelFor } from "@/components/Badges";

const MAX_DISCIPLINES = 2;

/** Heading words per type: jobs close, events start, open calls and programmes have deadlines. */
const BAND_LABELS: Partial<Record<EntryType, BandLabels>> = {
  job: { ...DEFAULT_BAND_LABELS, undated: "No closing date", past: "Closed" },
  program: { ...DEFAULT_BAND_LABELS, undated: "Next deadline to be confirmed", past: "Deadline passed" },
  event: { week: "This week", month: "This month", later: "Upcoming", undated: "Dates to be announced", past: "Past events", ongoing: "On now" },
};

/** The linked organisation shown above the title: the institution for programmes, the organiser otherwise. */
const orgIdOf = (e: Entry) => (e.data.institution_id ?? e.data.organisation_id) as string | undefined;

/**
 * Time-based entries as an index table grouped by date band (knowledge-publication reference).
 * Each row's own type decides its colour, kind chip, date label and cost line, so mixed lists
 * (the home page's "Closing soon") work too; `type` only picks the heading words.
 */
export default async function EntryIndex({
  type,
  entries,
  lens,
  fx,
  disciplines,
  query,
  empty,
  byRelevance = true,
  savedIds,
}: {
  type?: EntryType;
  entries: Entry[];
  lens: Lens;
  fx: FxTable;
  disciplines?: Discipline[];
  query?: string;
  empty: ReactNode;
  /** false when the list isn't sorted by relevance first (home page) */
  byRelevance?: boolean;
  /** entries in the signed-in user's layer get a "Saved" tag */
  savedIds?: Set<string>;
}) {
  if (entries.length === 0) {
    return (
      <div className="border-y border-line py-16 text-center">
        <p className="text-body text-ink-muted">{empty}</p>
      </div>
    );
  }

  const orgs = await getEntriesByIds([...new Set(entries.map(orgIdOf).filter((x): x is string => !!x))]);
  const label = new Map((disciplines ?? []).map((d) => [d.slug, d.label]));
  const groups = groupByDeadline(entries, lens, { query, labels: (type && BAND_LABELS[type]) || DEFAULT_BAND_LABELS, byRelevance });
  const groupSwatch = type ? TYPE_SWATCH[type] : null;

  return (
    <div className="flex flex-col gap-14">
      {groups.map((g) => (
        <IndexGroup key={g.key} title={g.title} period={g.period} swatch={(g.key.endsWith("week") || g.key.endsWith("ongoing")) && groupSwatch ? groupSwatch : undefined}>
          {g.items.map((e) => {
            const title = e.title.replace(/^\[Demo\]\s*/, "");
            const isDemo = title !== e.title;
            const orgId = orgIdOf(e);
            const org = orgId ? orgs[orgId]?.title.replace(/^\[Demo\]\s*/, "") : undefined;
            const kindValue = e.data[KINDS[e.type].field];
            const kind = typeof kindValue === "string" ? humanize(kindValue) : null;
            const cost = costLine(e, lens, fx);
            const swatch = entrySwatch(e);
            const pic = entryPicture(e);
            const endDate = typeof e.data.end_date === "string" ? e.data.end_date : null;
            const over = e.type === "event" ? (endDate ?? e.key_date) : e.key_date;
            const past = !!over && daysUntil(over) < 0;
            const extra = e.disciplines.length - MAX_DISCIPLINES;
            return (
              <IndexRow
                key={e.id}
                date={e.key_date}
                href={`/entry/${e.id}?lens=${lens.slug}`}
                title={title}
                kicker={org}
                description={e.summary}
                swatch={swatch}
                image={pic.src}
                imageFit={pic.fit}
                muted={past}
                tags={
                  <>
                    {savedIds?.has(e.id) && <Tag tone="solid" title="In My Layer">Saved</Tag>}
                    {kind && (
                      <Tag tone="tint" swatch={swatch ?? 1}>
                        {kind}
                      </Tag>
                    )}
                    {e.disciplines.slice(0, MAX_DISCIPLINES).map((d) => (
                      <DisciplineTag key={d} name={d} label={label.get(d) ?? humanize(d)} />
                    ))}
                    {extra > 0 && (
                      <Tag tone="muted" title={e.disciplines.slice(MAX_DISCIPLINES).map((d) => label.get(d) ?? d).join(", ")}>
                        +{extra}
                      </Tag>
                    )}
                    {isDemo && <Tag tone="muted">Demo</Tag>}
                  </>
                }
                status={<DeadlineMark date={e.key_date} label={dateLabelFor(e.type) ?? "Date"} event={e.type === "event"} endDate={endDate} />}
                meta={
                  <>
                    {cost && <span className="text-body-s order-first basis-full pb-1 text-ink">{cost}</span>}
                    {lens.kind !== "global" && !isTool(e) && <EligibilityTag relevance={placeRelevance(e, lens)} place={lens.label} />}
                    {locationLabel(e) && (
                      <LocationLabel className="ml-1">
                        <span title={locationLabel(e, { all: true })}>{locationLabel(e)}</span>
                      </LocationLabel>
                    )}
                  </>
                }
              />
            );
          })}
        </IndexGroup>
      ))}
    </div>
  );
}
