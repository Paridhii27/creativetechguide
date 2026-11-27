"use client";
import { useLinkStatus } from "next/link";

/**
 * A pager link's arrow. While the clicked page is on its way it becomes a pulsing square of the same width,
 * so the pill doesn't change size. Must sit inside the <Link> it reports on.
 */
export default function PagerArrow({ back = false }: { back?: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span className="relative inline-block">
      <span aria-hidden className={`nudge ${back ? "nudge-back" : ""} ${pending ? "invisible" : ""}`}>{back ? "←" : "→"}</span>
      {pending && (
        <span role="status" className="absolute inset-0 m-auto h-2 w-2 animate-pulse bg-current motion-reduce:animate-none">
          <span className="sr-only">Loading page…</span>
        </span>
      )}
    </span>
  );
}
