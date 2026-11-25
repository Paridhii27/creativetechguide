"use client";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";

/** GET filter form that submits as soon as a select changes and keeps URLs clean (no empty params). */
export default function AutoSubmit({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  return (
    <form
      ref={ref}
      className={className}
      onChange={(ev) => {
        const t = ev.target as unknown as HTMLInputElement;
        if (t.tagName === "SELECT" || t.type === "checkbox") ref.current?.requestSubmit();
      }}
      onSubmit={(ev) => {
        ev.preventDefault();
        const qs = new URLSearchParams();
        new FormData(ev.currentTarget).forEach((v, k) => typeof v === "string" && v !== "" && qs.append(k, v));
        router.push(`${pathname}${qs.size ? `?${qs}` : ""}`);
      }}
    >
      {children}
    </form>
  );
}
