"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Narrows its box to the longest wrapped line of text inside it. CSS alone keeps a wrapped
 * paragraph as wide as its max-width, so a right-placed block leaves a ragged gap on the right;
 * this makes the longest line end exactly at the block's edge while the text stays left-aligned.
 * Without JS (or before it runs) it renders as an ordinary block.
 */
export function ShrinkToText({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const fit = () => {
      el.style.width = "";
      const text = el.querySelector("p") ?? el;
      const range = document.createRange();
      range.selectNodeContents(text);
      const rects = [...range.getClientRects()];
      if (rects.length === 0) return;
      const left = Math.min(...rects.map((r) => r.left));
      const right = Math.max(...rects.map((r) => r.right));
      // +1px absorbs sub-pixel rounding so the text doesn't rewrap onto an extra line.
      el.style.width = `${Math.ceil(right - left) + 1}px`;
    };
    fit();
    // The available width changes with the window; refit from the natural width each time.
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
