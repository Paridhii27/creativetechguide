import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Thumb } from "./Thumb";
import { Mark } from "./primitives";
import { tintVar, type Swatch } from "@/lib/swatch";

/** Splits an ISO date into the index column: "28.06" over "2026". */
function dateParts(iso: string | null): { dm: string; year: string } {
  if (!iso) return { dm: "", year: "" };
  const [y, m, d] = iso.slice(0, 10).split("-");
  return { dm: `${d}.${m}`, year: y };
}

/**
 * A group of index rows under a large section heading, with a big period label right-aligned
 * ("Closing this month" … "2026"). Knowledge-publication reference.
 */
export function IndexGroup({ title, period, swatch, children, className = "" }: { title: ReactNode; period?: ReactNode; /** optional mark before the title */ swatch?: Swatch | null; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <header className="flex items-end justify-between gap-4 border-b border-ink pb-2">
        <h2 className="text-label inline-flex items-center gap-2 text-ink">
          {swatch !== undefined && <Mark swatch={swatch} size={8} />}
          {title}
        </h2>
        {period != null && period !== "" && <span className="text-display-m text-ink">{period}</span>}
      </header>
      <ul className="anim-stagger">{children}</ul>
    </section>
  );
}

/**
 * One time-based item (open call, event, job, deadline): thumbnail (or palette letter block) first,
 * then kicker, title, tags, description and meta, with the date column at the end — so undated
 * ("TBC") rows don't lead with a blank. Rows are separated by hairlines.
 */
export function IndexRow({
  date,
  href,
  title,
  kicker,
  description,
  tags,
  meta,
  status,
  image,
  imageFit = "cover",
  swatch,
  muted = false,
}: {
  /** ISO date shown in the end column */
  date: string | null;
  href: string;
  title: string;
  /** small line above the title, e.g. the organisation */
  kicker?: ReactNode;
  description?: string | null;
  /** discipline / kind chips */
  tags?: ReactNode;
  /** location, eligibility, cost… */
  meta?: ReactNode;
  /** deadline mark */
  status?: ReactNode;
  image?: string | null;
  imageFit?: "cover" | "contain" | "icon";
  /** palette colour for the entry's type (TYPE_SWATCH): mark, date rule, image ground, hover wash. null = outlined mark */
  swatch?: Swatch | null;
  /** past items */
  muted?: boolean;
}) {
  const { dm, year } = dateParts(date);
  return (
    <li
      data-lean-area
      style={swatch ? ({ "--row-wash": tintVar(swatch, 10) } as CSSProperties) : undefined}
      className={`group relative grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-4 border-b border-line px-3 py-5 transition-colors hover:bg-[var(--row-wash,var(--surface))] sm:grid-cols-[4.5rem_minmax(0,1fr)_6.5rem] sm:gap-x-6 ${muted ? "opacity-60" : ""}`}
    >
      <Thumb src={image} title={title} fit={imageFit} swatch={swatch} className="aspect-square w-full" />

      <div className="min-w-0">
        {kicker && <div className="text-micro mb-1.5 text-ink-muted">{kicker}</div>}
        {/* The title link stretches over the whole row (its ::after), so a click anywhere opens the entry. */}
        <Link href={href} className="text-body font-semibold leading-snug text-ink decoration-1 underline-offset-4 group-hover:underline after:absolute after:inset-0">
          {title}
        </Link>
        {tags && <div className="mt-2.5 flex flex-wrap gap-1.5">{tags}</div>}
        {description && <p className="text-body-s mt-3 line-clamp-2 max-w-prose text-ink-muted">{description}</p>}
        {(meta || status) && <div className="mt-3 flex flex-wrap items-center gap-1.5">{status}{meta}</div>}
      </div>

      {/* phones: the date closes the row beneath the content; sm+: its own right-hand column */}
      <div className="col-start-2 mt-3 flex items-baseline gap-3 sm:col-start-auto sm:mt-0 sm:block sm:text-right">
        {/* Only a real date gets the big numeral; undated rows carry a quiet micro label instead. */}
        {date && <div className="text-numeral text-ink">{dm}</div>}
        <div className={`flex items-center gap-2 sm:justify-end ${date ? "sm:mt-1.5" : "sm:pt-1"}`}>
          {swatch !== undefined && <Mark swatch={swatch} size={7} />}
          <span className="text-micro whitespace-nowrap text-ink-muted">{date ? year : "No date yet"}</span>
        </div>
      </div>
    </li>
  );
}
