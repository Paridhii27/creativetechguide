import Link from "next/link";
import type { CSSProperties } from "react";
import { DeadlineChip, EligibilityBadge, dateLabelFor, locationLabel } from "./Badges";
import { entryPicture } from "@/lib/icon";
import { costLine } from "@/lib/cost";
import type { FxTable } from "@/lib/money";
import { entrySwatch, tintVar } from "@/lib/swatch";
import { humanize, KINDS, sectionForEntry, type Entry, type Lens } from "@/lib/types";
import { Thumb } from "@/components/ui/Thumb";
import { LocationLabel, Mark, Tag } from "@/components/ui/primitives";

function kindLabel(e: Entry): string | null {
  const v = e.data[KINDS[e.type].field];
  return typeof v === "string" ? humanize(v) : null;
}

/**
 * One entry in a mixed list (search, My Layer, review queue, related entries): picture first,
 * then a type mark and kicker, title, summary, cost and actions, with date and eligibility at the end.
 */
export default function EntryCard({ entry: e, lens, fx, orgName, actions, saved }: { entry: Entry; lens: Lens; fx: FxTable; orgName?: string; actions?: React.ReactNode; saved?: boolean }) {
  const dateLabel = dateLabelFor(e.type);
  const kind = kindLabel(e);
  const cost = costLine(e, lens, fx);
  const isDemo = e.title.startsWith("[Demo]");
  const title = e.title.replace(/^\[Demo\]\s*/, "");
  // Programmes lead with the institution; the course, level and degree sit below.
  const byInstitution = e.type === "program" && !!orgName;
  const degree = typeof e.data.degree_name === "string" && e.data.degree_name !== e.title ? e.data.degree_name : null;
  const swatch = entrySwatch(e);
  const pic = entryPicture(e);
  const kicker = [sectionForEntry(e).singular, ...(byInstitution ? [kind, degree] : [orgName, kind])].filter(Boolean).join(" · ");
  const location = locationLabel(e);
  return (
    <li
      style={swatch ? ({ "--row-wash": tintVar(swatch, 10) } as CSSProperties) : undefined}
      className="group grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-line px-3 py-5 transition-colors hover:bg-[var(--row-wash,var(--surface))] sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:gap-x-6"
    >
      <Thumb src={pic.src} title={title} fit={pic.fit} swatch={swatch} className="aspect-square w-full" />
      <div className="min-w-0">
        <div className="text-micro mb-1.5 flex items-center gap-1.5 text-ink-muted">
          <Mark swatch={swatch} size={6} />
          {kicker}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link href={`/entry/${e.id}?lens=${lens.slug}`} className="text-body font-semibold leading-snug text-ink decoration-1 underline-offset-4 group-hover:underline">
            {byInstitution ? orgName : title}
          </Link>
          {saved && <Tag tone="solid" title="In My Layer">Saved</Tag>}
          {isDemo && <Tag tone="muted">Demo</Tag>}
        </div>
        {byInstitution && <p className="text-body-s mt-0.5 text-ink">{title}</p>}
        {e.summary && <p className="text-body-s mt-2 line-clamp-2 max-w-prose text-ink-muted">{e.summary}</p>}
        {cost && <p className="text-body-s mt-2 text-ink">{cost}</p>}
        {location && (
          <LocationLabel className="mt-2">
            <span title={locationLabel(e, { all: true })}>{location}</span>
          </LocationLabel>
        )}
        {actions && <div className="mt-3">{actions}</div>}
      </div>
      <div className="col-start-2 flex flex-wrap items-start gap-1.5 sm:col-start-auto sm:max-w-56 sm:flex-col sm:items-end">
        {dateLabel && <DeadlineChip date={e.key_date} label={dateLabel} event={e.type === "event"} endDate={typeof e.data.end_date === "string" ? e.data.end_date : null} />}
        <EligibilityBadge entry={e} lens={lens} />
      </div>
    </li>
  );
}
