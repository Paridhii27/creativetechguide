"use client";
import { useState, type CSSProperties } from "react";
import { swatchFor, swatchVar, tintVar, type Swatch } from "@/lib/swatch";

/**
 * Tightly cropped image, following the view mode (dimmed in Night, blue duotone in Blueprint,
 * original on hover). The ground is a soft wash of `swatch` (or plain surface without one); Monitor mode makes it transparent.
 * With no image, it becomes a solid palette block with the title's first letter — so lists
 * without pictures still read as the "paper squares", not grey boxes.
 */
export function Thumb({
  src,
  title,
  fit = "cover",
  swatch,
  className = "",
}: {
  src?: string | null;
  title: string;
  /** cover: photos/OG images · contain: cut-out objects · icon: small favicons, kept small and centred */
  fit?: "cover" | "contain" | "icon";
  /** palette colour for the image ground (usually the type colour); fallback blocks take a stable colour from the title */
  swatch?: Swatch | null;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const letter = title.replace(/^\[Demo\]\s*/, "").trim().charAt(0).toUpperCase() || "?";
  const hasImage = !!src && failed !== src;
  // Fallback blocks vary by title, so a list of one type still reads as scattered paper squares.
  const fill = swatchFor(title);
  return (
    <div
      className={`relative overflow-hidden [container-type:size] ${hasImage ? (swatch ? "thumb-ground" : "bg-surface") : ""} ${className}`}
      style={hasImage ? (swatch ? ({ "--thumb-tint": tintVar(swatch) } as CSSProperties) : undefined) : { background: swatchVar(fill) }}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          loading="lazy"
          onError={() => setFailed(src!)}
          className={`mode-img absolute inset-0 ${fit === "contain" ? "h-full w-full object-contain p-[12%]" : fit === "icon" ? "m-auto aspect-square h-[36%] max-h-14 object-contain" : "h-full w-full object-cover"}`}
        />
      ) : (
        <span aria-hidden className="absolute inset-0 grid place-items-center font-[family-name:var(--font-display)] text-[clamp(18px,42cqh,64px)] leading-none text-on-swatch">
          {letter}
        </span>
      )}
    </div>
  );
}
