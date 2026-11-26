"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Section link that keeps the current ?lens= and marks itself active. */
export default function NavLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const lens = useSearchParams().get("lens");
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={lens ? `${href}?lens=${lens}` : href}
      aria-current={active ? "page" : undefined}
      className={`text-nav-s whitespace-nowrap border-b-2 pb-5 text-ink transition-colors ${active ? "border-accent" : "border-transparent hover:border-line"} ${className}`}
    >
      {children}
    </Link>
  );
}
