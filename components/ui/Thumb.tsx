"use client";
import { useCallback, useState, type CSSProperties } from "react";
import { useLostOnBlack } from "./useLostOnBlack";
import { swatchFor, swatchVar, tintVar, type Swatch } from "@/lib/swatch";

/**
 * Tightly cropped image, following the view mode (dimmed in Night, blue duotone in Blueprint,
 * original on hover). The ground is a soft wash of `swatch` (or plain surface without one); Monitor mode makes it transparent.
 * A picture that would vanish on Monitor mode's black is replaced there by the letter block.
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
  /** cover: photos/OG images · contain: cut-out objects · icon: logos and favicons, centred with room around them (capped, as many are small files) */
  fit?: "cover" | "contain" | "icon";
  /** palette colour for the image ground (usually the type colour); fallback blocks take a stable colour from the title */
  swatch?: Swatch | null;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  // An image can finish or fail before React is listening (a server-rendered page), so onLoad and onError alone
  // would miss it: check any that has already finished.
  const check = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img?.complete) return;
      if (img.naturalWidth) setLoaded(src ?? null);
      else img.decode().catch(() => setFailed(src ?? null));
    },
    [src],
  );
  const letter = title.replace(/^\[Demo\]\s*/, "").trim().charAt(0).toUpperCase() || "?";
  // Asked only once the picture has loaded, so off-screen (lazy) pictures cost nothing.
  const lost = useLostOnBlack(src && loaded === src ? src : null);
  const hasImage = !!src && failed !== src && !lost;
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
          ref={check}
          src={src!}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(src!)}
          onError={() => setFailed(src!)}
          className={`mode-img absolute inset-0 ${fit === "contain" ? "h-full w-full object-contain p-[12%]" : fit === "icon" ? "m-auto aspect-square h-[84%] max-h-44 object-contain" : "h-full w-full object-cover"}`}
        />
      ) : (
        <span aria-hidden className="absolute inset-0 grid place-items-center font-[family-name:var(--font-display)] text-[clamp(18px,42cqh,64px)] leading-none text-on-swatch">
          {letter}
        </span>
      )}
    </div>
  );
}
