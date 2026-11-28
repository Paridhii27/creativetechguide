import Link from "next/link";
import DoodleGrid from "@/components/DoodleGrid";
import { BracketLabel } from "@/components/ui/primitives";
import HiddenSquare from "@/components/ui/HiddenSquare";
import { WHIMSY } from "@/lib/whimsy";

export default function NotFound() {
  return (
    <DoodleGrid className="border border-line px-6 pt-20 pb-8 text-center">
      <BracketLabel accent>404</BracketLabel>
      <h1 className="text-display-l mt-6 text-ink">Off the map</h1>
      <p className="text-body-l relative mt-5 text-ink-muted">
        {/* On its own ground, so it stays readable over a doodle. */}
        <span className="box-decoration-clone bg-bg px-1">We couldn&apos;t find this one. It may have wandered off, or it&apos;s tucked away in someone&apos;s private layer.</span>{" "}
        <HiddenSquare phrases={WHIMSY.lost} start={4} />
      </p>
      <Link href="/" className="text-label mt-8 inline-flex rounded-full border border-ink bg-bg px-4 py-2 text-ink transition-colors hover:bg-ink hover:text-bg">
        Take me home
      </Link>
    </DoodleGrid>
  );
}
