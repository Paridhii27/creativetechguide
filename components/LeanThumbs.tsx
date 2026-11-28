"use client";
import { useEffect } from "react";

/** The most a picture turns, in degrees. Kept small, so it's felt more than seen. */
const MAX = 5;

/**
 * Thumbnails lean gently towards the cursor while it's over their card or row (marked `data-lean-area`;
 * the picture is `data-lean`, see Thumb). One listener for the whole page, so lists stay server-rendered.
 * Only with a mouse or trackpad, and not for people who prefer reduced motion.
 */
export default function LeanThumbs() {
  useEffect(() => {
    const allowed = window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)");
    let leaning: HTMLElement | null = null;
    const rest = () => {
      leaning?.removeAttribute("data-leaning");
      leaning = null;
    };
    const onMove = (e: PointerEvent) => {
      if (!allowed.matches || e.pointerType === "touch") return rest();
      const area = e.target instanceof Element ? e.target.closest("[data-lean-area]") : null;
      const thumb = area?.querySelector<HTMLElement>("[data-lean]");
      if (!area || !thumb) return rest();
      if (thumb !== leaning) rest();
      leaning = thumb;
      const t = thumb.getBoundingClientRect();
      const a = area.getBoundingClientRect();
      const toward = (from: number, size: number) => Math.max(-1, Math.min(1, from / (size / 2)));
      const x = toward(e.clientX - (t.left + t.width / 2), a.width);
      const y = toward(e.clientY - (t.top + t.height / 2), a.height);
      thumb.style.setProperty("--lean-x", `${(-y * MAX).toFixed(2)}deg`);
      thumb.style.setProperty("--lean-y", `${(x * MAX).toFixed(2)}deg`);
      thumb.setAttribute("data-leaning", "");
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", rest);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", rest);
      rest();
    };
  }, []);
  return null;
}
