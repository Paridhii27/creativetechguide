"use client";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChangeView } from "./ChangeView";
import { Wordmark } from "./primitives";

/** One line of the menu icon. */
const BAR = "absolute inset-0 m-auto h-[1.75px] w-3.5 rounded-full bg-current transition-[translate,rotate,opacity] duration-300 ease-out motion-reduce:transition-none";

/**
 * Top bar. From lg up: the wordmark beside a two-line control column, with the section row beneath.
 * On phones and tablets: wordmark, search and a menu button in one row, with the lens beneath them on
 * phones and in that row from sm. Search and the menu (sections, My Layer, view mode, account) both slide
 * open under the title row, one at a time.
 *
 * The menu is its own block so it can slide as one piece; it repeats the section links, actions, view
 * switch and account link, which are hidden in their desktop places. The lens and search, which have
 * their own state and key listeners, are rendered once: below lg the desktop wrappers become
 * `contents` and the pieces are placed with `order`.
 */
export function NavBar({
  nav,
  lens,
  actions,
  utility,
  search,
}: {
  /** section links (lens-preserving NavLinks) */
  nav: ReactNode;
  /** main row, right: the geographic lens */
  lens: ReactNode;
  /** beside the lens: your own things (My Layer, add) */
  actions?: ReactNode;
  /** small account links in the top line (Sign in/out) */
  utility?: ReactNode;
  /** sits at the end of the section row, in its own slot so it never covers the links */
  search?: ReactNode;
}) {
  const pathname = usePathname();
  const menuId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div
      className="relative flex flex-wrap items-center border-b border-line sm:max-lg:pb-5 lg:block"
      // Following any link closes the menu (including a link to the page you're already on), and so does
      // turning to search.
      onClick={(e) => (e.target as HTMLElement).closest("a, [role=search]") && setOpen(false)}
      onKeyDown={(e) => {
        // Controls inside (search, place list) use Escape themselves and mark it handled.
        if (e.key !== "Escape" || e.defaultPrevented || !open) return;
        setOpen(false);
        toggle.current?.focus();
      }}
    >
      {/* One masthead row: the two-line wordmark on the left, every control in a single right-hand column.
          The column's top line is the quiet settings corner (view mode, account); the line beneath holds the
          lens and your own things. Both lines end flush right, so the controls read as one block. */}
      <div className="contents lg:flex lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-10 lg:gap-y-8 lg:pt-10 lg:pb-11">
        <div className="order-1 flex min-w-0 flex-1 pt-5 lg:order-none lg:flex-none lg:pt-0">
          <Wordmark stacked />
        </div>
        <button
          ref={toggle}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={open}
          aria-controls={menuId}
          className={`order-4 mt-5 ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 lg:hidden ${open ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-ink"}`}
        >
          {/* Three bars: the outer two meet in the middle and turn into a cross as the middle one fades. */}
          <span aria-hidden className="relative block h-4 w-4">
            <span className={`${BAR} ${open ? "rotate-45" : "-translate-y-[4.5px]"}`} />
            <span className={`${BAR} ${open ? "opacity-0" : ""}`} />
            <span className={`${BAR} ${open ? "-rotate-45" : "translate-y-[4.5px]"}`} />
          </span>
        </button>
        {/* Phones and tablets. Slides open by growing its grid row, as the search panel does. */}
        <div
          id={menuId}
          className={`order-6 grid w-full duration-300 ease-out motion-reduce:transition-none lg:hidden ${
            open ? "grid-rows-[1fr] transition-[grid-template-rows,opacity]" : "invisible grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity,visibility]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="mt-4 border-t border-line">
              <nav aria-label="Sections" className="flex flex-col py-2 sm:grid sm:grid-cols-2 sm:gap-x-4 md:grid-cols-3">
                {nav}
              </nav>
              <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center">
                {actions && <div className="flex items-center gap-2 sm:mr-auto">{actions}</div>}
                <ChangeView />
                {utility && <div className="flex items-center text-ink-muted">{utility}</div>}
              </div>
            </div>
          </div>
        </div>
        {/* From sm up the two lines share two columns, so each control lines up with the one under it. */}
        <div className="contents lg:grid lg:min-w-0 lg:max-w-full lg:grid-cols-[auto_auto] lg:gap-3">
          <div className="hidden lg:col-span-2 lg:grid lg:grid-cols-subgrid lg:items-stretch lg:gap-x-3">
            <ChangeView />
            {utility && <div className="flex items-center text-ink-muted">{utility}</div>}
          </div>
          <div className="contents lg:col-span-2 lg:grid lg:grid-cols-subgrid lg:items-stretch lg:gap-x-3 lg:gap-y-2">
            <div className="order-7 flex w-full min-w-0 py-4 *:flex-1 sm:order-2 sm:mt-5 sm:mr-2 sm:ml-4 sm:w-72 sm:py-0 min-[820px]:w-80 lg:order-none lg:m-0 lg:w-auto">{lens}</div>
            {actions && <div className="hidden items-center gap-2 lg:flex">{actions}</div>}
          </div>
        </div>
      </div>
      {/* Section row: links wrap onto a second line rather than scroll; search keeps its own slot at the end. */}
      <div className="contents lg:flex lg:items-end lg:justify-between lg:gap-x-6">
        <nav aria-label="Sections" className="-mb-px hidden min-w-0 flex-1 flex-wrap gap-x-4 gap-y-2 lg:flex xl:gap-x-6 min-[1400px]:gap-x-8">
          {nav}
        </nav>
        {/* From sm up: a box as tall as one line of link text, lifted by the links' bottom padding and underline
            (less the nav's -1px), so whatever height the search is, it centres on the text. Below lg the search button
            and panel become items of the header: the button in the title row, the panel a row of its own beneath it. */}
        {search && <div className="contents lg:relative lg:z-10 lg:mb-[21px] lg:flex lg:h-[1.05rem] lg:shrink-0 lg:items-center">{search}</div>}
      </div>
    </div>
  );
}
