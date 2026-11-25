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
 * "Search the website" in the nav row: live matches drop down beneath it as a hairline index,
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
  const [focused, setFocused] = useState(false);
  // Compact in the nav row; widens over the links while in use.
  const expanded = focused || open || q.length > 0;

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
      input.current?.focus();
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
      if (open) setOpen(false);
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
      className={`relative w-full bg-bg lg:absolute lg:right-0 lg:bottom-0 lg:pl-4 lg:transition-[width] lg:duration-200 lg:ease-out motion-reduce:transition-none ${expanded ? "lg:w-96" : "lg:w-40"}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (term) go(allHref);
      }}
    >
      {lens && <input type="hidden" name="lens" value={lens} />}
      <SearchField
        ref={input}
        name="q"
        size="s"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        placeholder={expanded ? "Search the website" : "Search"}
        aria-label="Search the website"
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel && active >= 0 ? optionId(active) : undefined}
        kbd="/"
      />

      {showPanel && (
        <div className="absolute right-0 top-full z-50 mt-2 w-full border border-ink bg-bg lg:w-[28rem] lg:max-w-[calc(100vw-4rem)]">
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
    </form>
  );
}
