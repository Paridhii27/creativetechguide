"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import SearchField from "./ui/SearchField";
import { Mark } from "./ui/primitives";
import type { Swatch } from "@/lib/swatch";

interface Result {
  id: string;
  title: string;
  kind: string;
  swatch: Swatch | null;
  location: string;
}

/**
 * "Search the website" at the end of the nav row. From xl up it's a fixed-width field; below that it's an
 * icon button that opens the same field in a panel under the row. Either way it never covers the section links.
 * Live matches drop down beneath it as a hairline index: live matches drop down beneath it as a hairline index,
 * Enter (with nothing highlighted) opens the full results page. Press / anywhere to focus it.
 */
export default function NavSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const lens = params.get("lens");
  const listId = useId();
  const root = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState(pathname === "/search" ? (params.get("q") ?? "") : "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const toggle = useRef<HTMLButtonElement>(null);
  // Below xl the field lives in a panel that the icon button opens; focus once it's visible.
  const openAndFocus = () => {
    setOpen(true);
    requestAnimationFrame(() => input.current?.focus());
  };

  const term = q.trim();
  const allHref = `/search?q=${encodeURIComponent(term)}${lens ? `&lens=${lens}` : ""}`;

  // Debounced lookup; a newer keystroke aborts the older request.
  useEffect(() => {
    if (term.length < 2) {
      setResults([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}${lens ? `&lens=${lens}` : ""}`, { signal: ctrl.signal });
        const body = (await res.json()) as { results: Result[]; hasMore: boolean };
        setResults(body.results ?? []);
        setHasMore(!!body.hasMore);
        setActive(-1);
      } catch {
        if (!ctrl.signal.aborted) setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term, lens]);

  // Close on navigation and on clicks outside.
  useEffect(() => setOpen(false), [pathname, params]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      e.preventDefault();
      openAndFocus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const showPanel = open && term.length >= 2;
  // Options: each result, then "See all results".
  const count = results.length + 1;
  const go = (href: string) => {
    setOpen(false);
    input.current?.blur();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      // Stop the browser's own "clear the search field" on Escape: its input event would reopen the panel.
      e.preventDefault();
      setOpen(false);
      // Below xl the field is about to hide: hand focus back to the button that opened it.
      if (toggle.current && getComputedStyle(toggle.current).display !== "none") toggle.current.focus();
      else input.current?.blur();
      return;
    }
    if (!showPanel) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? count - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0 && active < results.length) {
      e.preventDefault();
      go(`/entry/${results[active].id}`);
    }
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;
  const row = (i: number) => `flex items-start gap-3 px-4 py-2.5 transition-colors ${active === i ? "bg-surface" : "hover:bg-surface"}`;

  return (
    <form
      ref={root}
      role="search"
      action="/search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        if (term) go(allHref);
      }}
    >
      {lens && <input type="hidden" name="lens" value={lens} />}

      {/* Below xl: a round icon button in the nav row. */}
      <button
        ref={toggle}
        type="button"
        onClick={() => (open ? setOpen(false) : openAndFocus())}
        aria-label="Search the website"
        aria-expanded={open}
        title="Search (press /)"
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors xl:hidden ${open ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-ink"}`}
      >
        <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="h-4 w-4">
          <circle cx="8.5" cy="8.5" r="5.75" />
          <path d="m13 13 4.25 4.25" />
        </svg>
      </button>

      {/* The field: inline from xl, otherwise in a panel under the row while open. */}
      <div
        className={`${open ? "block" : "hidden"} absolute top-full right-0 z-50 mt-3 w-[min(28rem,calc(100vw-2rem))] border border-ink bg-bg xl:static xl:mt-0 xl:block xl:w-60 xl:border-0 xl:bg-transparent`}
      >
        <div className="p-3 xl:p-0">
          <SearchField
            ref={input}
            name="q"
            size="s"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search the website"
            aria-label="Search the website"
            autoComplete="off"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showPanel && active >= 0 ? optionId(active) : undefined}
            kbd="/"
          />
        </div>
        {open && term.length < 2 && (
          <p className="text-micro border-t border-line px-4 py-2.5 text-ink-muted xl:hidden">Studios, programmes, jobs, open calls, tools, cities…</p>
        )}

        {showPanel && (
          <div className="border-t border-line xl:absolute xl:top-full xl:right-0 xl:mt-2 xl:w-[28rem] xl:border xl:border-ink xl:bg-bg">
            <div className="text-micro flex items-center justify-between border-b border-line px-4 py-2 text-ink-muted">
              <span>[ {loading ? "Searching…" : results.length ? `Matches — ${results.length}${hasMore ? "+" : ""}` : "No matches"} ]</span>
              <span className="hidden sm:inline">↑↓ to move · ↵ to open</span>
            </div>
            <ul id={listId} role="listbox" aria-label="Search results" className="divide-y divide-line">
              {results.map((r, i) => (
                <li key={r.id} id={optionId(i)} role="option" aria-selected={active === i}>
                  <Link href={`/entry/${r.id}`} className={row(i)} onMouseEnter={() => setActive(i)} onClick={() => setOpen(false)}>
                    <Mark swatch={r.swatch} size={8} className="mt-1.5" />
                    <span className="min-w-0">
                      <span className="text-body-s block truncate font-semibold text-ink">{r.title}</span>
                      <span className="text-micro block truncate text-ink-muted">
                        {r.kind}
                        {r.location && <> · {r.location}</>}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {!loading && results.length === 0 && (
                <li className="text-body-s px-4 py-3 text-ink-muted">Nothing on the Map matches &ldquo;{term}&rdquo; yet.</li>
              )}
              <li id={optionId(results.length)} role="option" aria-selected={active === results.length}>
                <Link
                  href={allHref}
                  className={`text-label flex items-center justify-between gap-3 px-4 py-3 text-ink ${active === results.length ? "bg-surface" : "hover:bg-surface"}`}
                  onMouseEnter={() => setActive(results.length)}
                  onClick={() => setOpen(false)}
                >
                  <span className="truncate">See all results for &ldquo;{term}&rdquo;</span>
                  <span aria-hidden>→</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </form>
  );
}
