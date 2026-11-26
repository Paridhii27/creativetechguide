"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** How long typing has to pause before the keyword is applied. */
const TYPING_PAUSE = 500;

/**
 * GET filter form with no submit button: a select or checkbox applies as soon as it changes, typed text after a
 * short pause (or Enter). Keeps URLs clean (no empty params).
 */
export default function AutoSubmit({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const typing = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <form
      ref={ref}
      className={className}
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
        if (typing.current) router.replace(href, { scroll: false });
        else router.push(href);
        typing.current = false;
      }}
    >
      {children}
    </form>
  );
}
