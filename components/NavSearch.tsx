"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
 * icon button that opens the same field in a panel under the row; below lg it slides open beneath the title
 * row and pushes the page down. Closed, it never covers the section links.
 * Live matches drop down beneath it as a hairline index,
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

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const toggle = useRef<HTMLButtonElement>(null);
  // Below xl the field is hidden until opened. Render it first, then focus within the same tap:
  // iOS only brings up the keyboard for a focus made directly by a user gesture.
  const openAndFocus = () => {
    flushSync(() => {
      setOpen(true);
      setQ("");
    });
    input.current?.focus();
  };

  // A search is over once you've gone somewhere with it or dismissed it: the field starts empty next time.
  const finish = () => setOpen(false);
  // Emptied only after the sliding panel has finished sliding shut.
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setQ(""), 300);
    return () => clearTimeout(t);
  }, [open]);

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

  // Finish on navigation and on clicks outside.
  useEffect(finish, [pathname, params]);
  useEffect(() => {
    // pointerdown, not mousedown: iOS doesn't send mouse events for taps on non-clickable areas.
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) finish();
    };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      e.preventDefault();
      openAndFocus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const showPanel = open && term.length >= 2;
  // Options: each result, then "See all results".
  const count = results.length + 1;
  const go = (href: string) => {
    finish();
    input.current?.blur();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      // Stop the browser's own "clear the search field" on Escape: its input event would reopen the panel.
      e.preventDefault();
      finish();
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
      // Below lg the button and panel are laid out by the header itself (see NavBar).
      className="max-lg:contents lg:relative"
      // Tabbing out closes it. A null target is a tap
      // on something unfocusable (or the keyboard being dismissed), which leaves it open.
      onBlur={(e) => e.relatedTarget && !e.currentTarget.contains(e.relatedTarget) && finish()}
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
        onClick={() => (open ? finish() : openAndFocus())}
        aria-label="Search the website"
        aria-expanded={open}
        title="Search (press /)"
        className={`flex h-10 w-10 items-center max-lg:order-3 max-lg:mt-5 max-lg:ml-3 justify-center rounded-full border transition-colors lg:h-9 lg:w-9 xl:hidden ${open ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-ink"}`}
      >
        <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="h-4 w-4">
          <circle cx="8.5" cy="8.5" r="5.75" />
          <path d="m13 13 4.25 4.25" />
        </svg>
      </button>

      {/* The field: inline from xl; below that only while open, as a panel under the row. Below lg it's a row of
          the header, under the title row, which slides open by growing its grid row. Visibility only
          transitions on the way out, so the field can take focus the moment it opens. */}
      <div
        className={`max-lg:order-5 max-lg:grid max-lg:w-full max-lg:duration-300 max-lg:ease-out motion-reduce:transition-none lg:absolute lg:top-full lg:right-0 lg:z-50 lg:mt-3 lg:w-[min(28rem,calc(100vw-2rem))] lg:border lg:border-ink lg:bg-bg xl:static xl:mt-0 xl:block xl:w-48 xl:border-0 xl:bg-transparent min-[1400px]:w-60 ${
          open
            ? "max-lg:grid-rows-[1fr] max-lg:transition-[grid-template-rows,opacity] lg:block"
            : "max-lg:invisible max-lg:grid-rows-[0fr] max-lg:opacity-0 max-lg:transition-[grid-template-rows,opacity,visibility] lg:hidden"
        }`}
      >
        <div className="max-lg:min-h-0 max-lg:overflow-hidden">
          <div className="p-3 max-lg:px-1 max-lg:pt-4 max-lg:pb-1 xl:p-0">
            <SearchField
              ref={input}
              name="q"
              size="s"
              // 16px text on phones and tablets: anything smaller makes iOS zoom the page when the field is focused.
              className="max-lg:[&_input]:py-2.5 max-lg:[&_input]:text-body max-lg:[&_kbd]:hidden"
              enterKeyHint="search"
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
            <p className="text-micro border-t border-line px-4 py-2.5 text-ink-muted max-lg:border-0 max-lg:px-1 max-lg:pt-2 max-lg:pb-0 xl:hidden">Studios, programmes, jobs, open calls, tools, cities…</p>
          )}

          {/* Stays rendered while that panel slides shut, so it doesn't empty first. */}
          {term.length >= 2 && (
            <div className={`${open ? "" : "lg:hidden"} border-t border-line max-lg:mt-3 max-lg:border max-lg:border-ink xl:absolute xl:top-full xl:right-0 xl:mt-2 xl:w-[28rem] xl:border xl:border-ink xl:bg-bg`}>
              <div className="text-micro flex items-center justify-between border-b border-line px-4 py-2 text-ink-muted">
                <span>[ {loading ? "Searching…" : results.length ? `Matches — ${results.length}${hasMore ? "+" : ""}` : "No matches"} ]</span>
                <span className="hidden lg:inline">↑↓ to move · ↵ to open</span>
              </div>
              <ul id={listId} role="listbox" aria-label="Search results" className="divide-y divide-line">
                {results.map((r, i) => (
                  <li key={r.id} id={optionId(i)} role="option" aria-selected={active === i}>
                    <Link href={`/entry/${r.id}`} className={row(i)} onMouseEnter={() => setActive(i)} onClick={finish}>
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
                    onClick={finish}
                  >
                    <span className="truncate">See all results for &ldquo;{term}&rdquo;</span>
                    <span aria-hidden>→</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
