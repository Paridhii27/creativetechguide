import Link from "next/link";
import { BracketLabel } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="bg-specimen-grid ticks border border-line px-6 py-20 text-center">
      <BracketLabel accent>404</BracketLabel>
      <h1 className="text-display-l mt-6 text-ink">Not in the guide</h1>
      <p className="text-body-l mt-5 text-ink-muted">This page doesn&apos;t exist, or the entry is private.</p>
      <Link href="/" className="text-label mt-8 inline-flex rounded-full border border-ink px-4 py-2 text-ink transition-colors hover:bg-ink hover:text-bg">
        Back to the guide
      </Link>
    </div>
  );
}
