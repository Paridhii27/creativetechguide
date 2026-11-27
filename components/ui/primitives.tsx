import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { swatchFor, swatchVar, tintVar, type Swatch } from "@/lib/swatch";

/* ---------------------------------------------------------------------------
   Small building blocks. Tokens only: no raw sizes or colours.
   ------------------------------------------------------------------------- */

/**
 * Small square in a palette colour (the "paper squares"): type marks, discipline marks, legend keys.
 * `null` draws an outlined square (used for types without a colour, e.g. resources).
 */
export function Mark({ swatch, size = 7, className = "" }: { swatch: Swatch | null; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 ${swatch ? "" : "border border-ink"} ${className}`}
      style={{ width: size, height: size, background: swatch ? swatchVar(swatch) : undefined }}
    />
  );
}

type TagTone = "outline" | "accent" | "solid" | "muted" | "tint";

const tagTone: Record<TagTone, string> = {
  outline: "border-line text-ink",
  accent: "border-accent text-accent-text",
  solid: "border-accent bg-accent text-on-accent",
  muted: "border-line text-ink-muted",
  tint: "border-transparent text-ink",
};

/**
 * Small chip in `tag` style. `mark` adds a palette square before the text (disciplines, kinds);
 * tone "tint" fills the chip with a soft wash of `swatch`.
 */
export function Tag({
  children,
  tone = "outline",
  mark,
  swatch,
  className = "",
  title,
}: {
  children: ReactNode;
  tone?: TagTone;
  mark?: Swatch | null;
  swatch?: Swatch;
  className?: string;
  title?: string;
}) {
  const style = tone === "tint" && swatch ? { background: tintVar(swatch, 28) } : undefined;
  return (
    <span title={title} style={style} className={`text-tag inline-flex items-center gap-1.5 whitespace-nowrap border px-1.5 py-[3px] ${tagTone[tone]} ${className}`}>
      {mark !== undefined && <Mark swatch={mark} size={6} />}
      {children}
    </span>
  );
}

/** A discipline/skill chip: outlined, with its stable palette mark. */
export function DisciplineTag({ name, label }: { name: string; label?: ReactNode }) {
  return <Tag mark={swatchFor(name)}>{label ?? name.replace(/-/g, " ")}</Tag>;
}

type PillVariant = "outline" | "primary" | "ghost";
type PillSize = "nav" | "label";

function pillClass(variant: PillVariant, size: PillSize, className: string) {
  const v = {
    outline: "border border-ink text-ink hover:bg-ink hover:text-bg",
    primary: "border border-ink bg-ink text-bg hover:bg-transparent hover:text-ink",
    ghost: "border border-transparent text-ink-muted hover:text-ink",
  }[variant];
  const s = size === "nav" ? "text-nav px-5 py-2.5" : "text-label px-3.5 py-1.5";
  return `inline-flex items-center justify-center gap-2 rounded-full transition-colors disabled:opacity-50 ${v} ${s} ${className}`;
}

/** Pill-shaped button: outlined, or solid ink for primary. */
export function PillButton({ variant = "outline", size = "label", className = "", ...rest }: ComponentProps<"button"> & { variant?: PillVariant; size?: PillSize }) {
  return <button type="button" className={pillClass(variant, size, className)} {...rest} />;
}

/** Same look as PillButton, as a link. */
export function PillLink({ variant = "outline", size = "label", className = "", ...rest }: ComponentProps<typeof Link> & { variant?: PillVariant; size?: PillSize }) {
  return <Link className={pillClass(variant, size, className)} {...rest} />;
}

/** `[ CORE DISCIPLINES ]` */
export function BracketLabel({ children, className = "", accent = false, mark }: { children: ReactNode; className?: string; accent?: boolean; mark?: Swatch | null }) {
  return (
    <span className={`text-micro inline-flex items-center gap-1.5 whitespace-nowrap ${accent ? "text-accent-text" : "text-ink"} ${className}`}>
      {mark !== undefined && <Mark swatch={mark} size={6} />}
      <span>[&nbsp;{children}&nbsp;]</span>
    </span>
  );
}

/** Small "View →" link in `label` style. */
export function ViewLink({ href, children = "View", className = "" }: { href: string; children?: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`text-label inline-flex items-center gap-1 text-ink underline-offset-4 hover:underline ${className}`}>
      {children}
      <span aria-hidden className="nudge">→</span>
    </Link>
  );
}

/** Small uppercase location label, e.g. "BENGALURU, IN" or "REMOTE". */
export function LocationLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`text-micro inline-flex items-center gap-1 text-ink-muted ${className}`}>
      <svg aria-hidden width="7" height="7" viewBox="0 0 7 7" className="shrink-0">
        <circle cx="3.5" cy="3.5" r="2.75" fill="none" stroke="currentColor" />
        <circle cx="3.5" cy="3.5" r="1" fill="currentColor" />
      </svg>
      {children}
    </span>
  );
}

/**
 * Wordmark, set like the home headline: serif italic lead-in, then the subject in display capitals.
 * `stacked` (the navbar) sets it on three lines whose ink is exactly as tall as the controls beside it:
 * 40px (the search and menu buttons) below lg, 76px (the two-line control column) from lg. The block is
 * 2.69em tall, from the top of the "A" to the baseline of the last line; the margins on the first two lines
 * come from the two fonts' metrics, so recheck them if either typeface changes.
 */
export function Wordmark({ href = "/", stacked = false }: { href?: string; stacked?: boolean }) {
  return (
    <Link
      href={href}
      className={`text-wordmark inline-flex text-ink ${stacked ? "h-[2.69em] flex-col text-[length:calc(40px/2.69)] leading-[0.95] lg:text-[length:calc(76px/2.69)]" : "flex-wrap items-baseline gap-x-2"}`}
    >
      <span className={`text-accent-display ${stacked ? "-mt-[0.085em] ml-[0.07em]" : ""}`}>A map of</span>{" "}
      {stacked ? (
        <>
          <span className="mt-[0.04em]">Creative</span> <span>Technology</span>
        </>
      ) : (
        <span>Creative Technology</span>
      )}
    </Link>
  );
}

/** "+" registration / grid mark. */
export function GridMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden width="9" height="9" viewBox="0 0 9 9" className={`text-ink-muted ${className}`}>
      <path d="M4.5 0v9M0 4.5h9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
