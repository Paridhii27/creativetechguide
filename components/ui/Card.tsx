import Link from "next/link";
import type { ReactNode } from "react";
import { Thumb } from "./Thumb";
import { LocationLabel, Mark } from "./primitives";
import type { Swatch } from "@/lib/swatch";

/**
 * Compact entry card (search results, My Layer lists, related entries).
 * Square corners, hairline border, no shadow.
 */
export function Card({
  href,
  title,
  kicker,
  description,
  image,
  imageFit = "cover",
  location,
  status,
  eligibility,
  tags,
  footer,
  swatch,
}: {
  href: string;
  title: string;
  kicker?: ReactNode;
  description?: string | null;
  image?: string | null;
  imageFit?: "cover" | "contain" | "icon";
  location?: ReactNode;
  status?: ReactNode;
  eligibility?: ReactNode;
  tags?: ReactNode;
  footer?: ReactNode;
  /** type colour (TYPE_SWATCH): mark beside the kicker, image ground. null = outlined mark */
  swatch?: Swatch | null;
}) {
  return (
    <article data-lean-area className="group relative flex flex-col border border-line bg-bg transition-colors hover:border-ink">
      <Thumb src={image} title={title} fit={imageFit} swatch={swatch} className={`w-full ${image && imageFit === "cover" ? "aspect-[16/10]" : "aspect-[5/2]"}`} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          {location ? <LocationLabel>{location}</LocationLabel> : <span />}
          {kicker && (
            <span className="text-micro inline-flex items-center gap-1.5 text-ink-muted">
              {swatch !== undefined && <Mark swatch={swatch} size={6} />}
              {kicker}
            </span>
          )}
        </div>
        <Link href={href} className="text-wordmark text-ink group-hover:underline decoration-1 underline-offset-4 after:absolute after:inset-0">
          {title}
        </Link>
        {description && <p className="text-body-s line-clamp-3 text-ink-muted">{description}</p>}
        {tags && <div className="flex flex-wrap gap-1.5">{tags}</div>}
        {(status || eligibility) && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {status}
            {eligibility}
          </div>
        )}
        {footer && <div className="relative z-10">{footer}</div>}
      </div>
    </article>
  );
}
