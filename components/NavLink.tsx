"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * From lg, hovering draws the underline in from the left: a line over the (transparent) bottom border, scaled
 * rather than resized so nothing shifts. The phone menu keeps its plain left rule.
 */
const GROW =
  "lg:after:absolute lg:after:inset-x-0 lg:after:-bottom-0.5 lg:after:h-0.5 lg:after:origin-left lg:after:scale-x-0 lg:after:bg-line lg:after:transition-[scale] lg:after:duration-200 lg:after:ease-out lg:hover:after:scale-x-100 lg:focus-visible:after:scale-x-100 motion-reduce:after:transition-none";

/** Section link that keeps the current ?lens= and marks itself active. */
export default function NavLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const lens = useSearchParams().get("lens");
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={lens ? `${href}?lens=${lens}` : href}
      aria-current={active ? "page" : undefined}
      className={`text-nav-s relative whitespace-nowrap border-b-2 pb-5 text-ink transition-colors max-lg:border-b-0 max-lg:border-l-2 max-lg:py-3 max-lg:pl-3 ${active ? "border-accent" : `border-transparent max-lg:hover:border-line ${GROW}`} ${className}`}
    >
      {children}
    </Link>
  );
}
