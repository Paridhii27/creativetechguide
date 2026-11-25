import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChangeView } from "./ChangeView";
import { Wordmark } from "./primitives";

/* ---------------------------------------------------------------------------
   Page-level pieces: nav bar, titles, segmented toggles, bento.
   ------------------------------------------------------------------------- */

/** Accent phrase inside a display headline: serif italic, sentence case, 8% larger. */
export function Accent({ children }: { children: ReactNode }) {
  return <span className="text-accent-display">{children}</span>;
}

/** Page title: optional serif kicker, display-m title, micro meta line, right-hand slot. */
export function PageTitle({ kicker, title, meta, aside }: { kicker?: ReactNode; title: ReactNode; meta?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 pb-8">
      <div>
        {kicker && <p className="text-accent-m mb-2 text-ink-muted">{kicker}</p>}
        <h1 className="text-display-m text-ink">{title}</h1>
        {meta && <p className="text-micro mt-3 text-ink-muted">{meta}</p>}
      </div>
      {aside}
    </header>
  );
}

/* Segmented pill toggle (lens toggle, bento toggles). Active option is a solid accent fill. */

export function segmentClass(active: boolean) {
  return `text-label rounded-full px-3 py-1.5 transition-colors ${active ? "bg-accent text-on-accent" : "text-ink-muted hover:text-ink"}`;
}

export function Segmented({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={label} className={`inline-flex items-center rounded-full border border-line p-0.5 ${className}`}>
      {children}
    </div>
  );
}

export function Segment({ active, className = "", ...rest }: ComponentProps<"button"> & { active: boolean }) {
  return <button type="button" aria-pressed={active} className={`${segmentClass(active)} ${className}`} {...rest} />;
}

/** Top bar: wordmark, centred CHANGE VIEW, right slot (lens toggle, drop URL); nav row beneath. */
export function NavBar({
  items = [],
  nav,
  right,
  utility,
  lensLabel,
  search,
}: {
  items?: { href: string; label: string; active?: boolean }[];
  /** real nav links (e.g. lens-preserving NavLinks); replaces `items` */
  nav?: ReactNode;
  /** main row, right: the lens and the primary action */
  right?: ReactNode;
  /** small account links in the top strip (My Layer, Review, Sign in/out) */
  utility?: ReactNode;
  /** e.g. "INDIA" → "LENS — INDIA" */
  lensLabel?: string;
  /** sits at the end of the section row, outside the scrolling nav so its dropdown isn't clipped */
  search?: ReactNode;
}) {
  return (
    <div className="border-b border-line">
      {/* Top strip: view mode on the left, account links on the right, all quiet. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line py-2">
        <ChangeView variant="text" />
        {utility && <div className="text-micro flex flex-wrap items-center gap-x-5 gap-y-1 text-ink-muted">{utility}</div>}
      </div>
      {/* Main row: wordmark, then the lens (the page's main control) and the primary action. */}
      <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-4 py-5">
        <Wordmark />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {lensLabel && <span className="text-micro text-ink-muted">Lens — {lensLabel}</span>}
          {right}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-y-4 lg:flex-row lg:items-end lg:gap-x-8">
      <nav aria-label="Sections" className="-mb-px flex min-w-0 flex-1 gap-x-8 overflow-x-auto">
        {nav}
        {!nav && items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={i.active ? "page" : undefined}
            className={`text-nav whitespace-nowrap border-b-2 pb-3 transition-colors ${i.active ? "border-accent text-ink" : "border-transparent text-ink hover:border-line"}`}
          >
            {i.label}
          </Link>
        ))}
      </nav>
      {search && (
        // On lg+ this slot reserves the compact width; the field widens leftwards over the nav while in use.
        <div className="relative z-10 shrink-0 lg:mb-2 lg:h-9 lg:w-40">{search}</div>
      )}
      </div>
    </div>
  );
}

/* Bento (Insights and My Layer home only). */

export function BentoGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid auto-rows-[minmax(9rem,auto)] grid-cols-2 gap-3 md:grid-cols-4 ${className}`}>{children}</div>;
}

/** Bento tile. `swatch` tones fill with a palette colour as a soft gradient (glass-like in Night, flat paper in Paper). */
export function BentoCard({
  children,
  className = "",
  tone = "surface",
  swatch = 1,
}: {
  children: ReactNode;
  className?: string;
  tone?: "surface" | "glass" | "ink" | "swatch";
  swatch?: 1 | 2 | 3 | 4 | 5;
}) {
  const t = {
    surface: "bg-surface text-ink",
    glass:
      "text-ink border border-line bg-surface bg-[radial-gradient(90%_70%_at_15%_10%,color-mix(in_srgb,var(--swatch-4)_45%,transparent),transparent_65%),radial-gradient(80%_70%_at_95%_95%,color-mix(in_srgb,var(--swatch-1)_50%,transparent),transparent_70%),radial-gradient(60%_50%_at_70%_30%,color-mix(in_srgb,var(--swatch-3)_35%,transparent),transparent_70%)]",
    ink: "bg-ink text-bg",
    swatch: "text-on-swatch",
  }[tone];
  const style =
    tone === "swatch"
      ? { background: `radial-gradient(120% 100% at 85% 100%, color-mix(in srgb, var(--swatch-${swatch}) 70%, var(--bg)), var(--swatch-${swatch}) 70%)` }
      : undefined;
  return (
    <div className={`flex flex-col rounded-3xl p-5 ${t} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function BigStat({ value, label, note }: { value: ReactNode; label: string; note?: ReactNode }) {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <span className="text-micro opacity-70">{label}</span>
      <div>
        <div className="text-display-l">{value}</div>
        {note && <div className="text-body-s mt-1 opacity-70">{note}</div>}
      </div>
    </div>
  );
}
