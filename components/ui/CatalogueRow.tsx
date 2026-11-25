import Link from "next/link";
import type { ReactNode } from "react";
import { Thumb } from "./Thumb";
import { Mark, ViewLink } from "./primitives";
import type { Swatch } from "@/lib/swatch";

/**
 * "Studios in Berlin": a category label and short description on the left, then a row of 3–4 cards.
 * Knowledge-publication reference.
 */
export function CatalogueRow({ title, description, href, swatch, children }: { title: string; description?: ReactNode; href?: string; /** type colour, shown as a mark beside the heading */ swatch?: Swatch | null; children: ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-6 border-t border-line pt-6 pb-10 md:grid-cols-12 md:gap-8">
      <div className="flex flex-col gap-3 md:col-span-3">
        {swatch !== undefined && <Mark swatch={swatch} size={10} />}
        <h2 className="text-heading text-ink">{title}</h2>
        {description && <p className="text-body-s max-w-[32ch] text-ink-muted">{description}</p>}
        {href && <ViewLink href={href} className="mt-auto">View all</ViewLink>}
      </div>
      <ul className="anim-stagger grid grid-cols-2 gap-3 sm:gap-4 md:col-span-9 lg:grid-cols-4">{children}</ul>
    </section>
  );
}

/** Cut-out image on a soft palette ground, caption in `micro`, small "View" link. */
export function CatalogueCard({ href, title, image, label, caption, swatch, fit = "contain" }: { href: string; title: string; image?: string | null; label?: ReactNode; caption?: ReactNode; /** ground colour; defaults to the plain surface */ swatch?: Swatch; fit?: "cover" | "contain" }) {
  return (
    <li className="group flex min-w-0 flex-col">
      <Link href={href} className="relative block" aria-label={title}>
        <Thumb src={image} title={title} fit={fit} swatch={swatch} className="aspect-[4/5] w-full" />
        {label && <span className={`text-micro absolute top-2 left-2 ${image ? "text-ink" : "text-on-swatch"}`}>{label}</span>}
      </Link>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={href} className="text-body-s block font-semibold leading-tight text-ink group-hover:underline">
            {title}
          </Link>
          {caption && <div className="text-micro mt-1 text-ink-muted">{caption}</div>}
        </div>
        <ViewLink href={href} className="shrink-0 pt-px">View</ViewLink>
      </div>
    </li>
  );
}
