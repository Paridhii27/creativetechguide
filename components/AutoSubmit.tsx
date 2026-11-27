"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

/** How long typing has to pause before the keyword is applied. */
const TYPING_PAUSE = 300;

/**
 * GET filter form with no submit button: a select or checkbox applies as soon as it changes (FilterSelect submits itself), typed text after a
 * short pause (or Enter). Keeps URLs clean (no empty params).
 *
 * While the new results load, the form carries `data-pending` so the page can show it's working. A link marked
 * `data-clear` empties the fields in place instead of reloading the whole page (it stays a plain link without JS).
 */
export default function AutoSubmit({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const typing = useRef(false);
  const [pending, start] = useTransition();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <form
      ref={ref}
      className={className}
      data-pending={pending || undefined}
      onClick={(ev) => {
        // Leave modified clicks alone, so "open in new tab" still works.
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || !(ev.target as Element).closest("[data-clear]")) return;
        ev.preventDefault();
        for (const field of ev.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement>("select, input:not([type=hidden]), input[data-filter]")) {
          field.value = "";
          field.dispatchEvent(new Event("filter-clear"));
        }
        typing.current = false;
        ev.currentTarget.requestSubmit();
      }}
      onChange={(ev) => {
        const t = ev.target as unknown as HTMLInputElement;
        clearTimeout(timer.current);
        if (t.tagName === "SELECT" || t.type === "checkbox") ref.current?.requestSubmit();
        else
          timer.current = setTimeout(() => {
            typing.current = true;
            ref.current?.requestSubmit();
          }, TYPING_PAUSE);
      }}
      onSubmit={(ev) => {
        ev.preventDefault();
        clearTimeout(timer.current);
        const qs = new URLSearchParams();
        new FormData(ev.currentTarget).forEach((v, k) => typeof v === "string" && v !== "" && qs.append(k, v));
        const href = `${pathname}${qs.size ? `?${qs}` : ""}`;
        // While typing, don't add a history entry per pause or jump back to the top.
        const replace = typing.current;
        typing.current = false;
        start(() => {
          if (replace) router.replace(href, { scroll: false });
          else router.push(href);
        });
      }}
    >
      {children}
    </form>
  );
}
