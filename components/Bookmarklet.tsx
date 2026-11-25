"use client";
import { useEffect, useRef } from "react";

/** React 19 blocks javascript: hrefs in JSX, so the bookmarklet link is set on the DOM after mount. */
export default function Bookmarklet() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("href", `javascript:location.href='${location.origin}/add?url='+encodeURIComponent(location.href)`);
  }, []);
  return (
    <a ref={ref} onClick={(e) => e.preventDefault()} className="text-tag inline-flex cursor-grab rounded-full border border-ink px-2.5 py-1 text-ink no-underline" title="Drag me to your bookmarks bar">
      + Field Guide
    </a>
  );
}
