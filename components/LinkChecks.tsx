import { Tag } from "@/components/ui/primitives";
import { runLinkChecks } from "@/lib/link-checks-run";
import type { Level } from "@/lib/link-checks";
import type { Entry } from "@/lib/types";

const TONE: Record<Level, { word: string; tone: "solid" | "accent" | "muted" }> = {
  bad: { word: "Problem", tone: "solid" },
  warn: { word: "Check", tone: "accent" },
  ok: { word: "OK", tone: "muted" },
};

export function LinkChecksFrame({ children }: { children: React.ReactNode }) {
  return (
    <section aria-label="Link checks" className="ticks mb-8 border border-line p-4">
      <h2 className="text-micro text-ink-muted">Link checks · only you see this</h2>
      {children}
    </section>
  );
}

/** Admin only: what to look at before approving a suggestion. Renders no links, since these are unreviewed. */
export default async function LinkChecks({ entry }: { entry: Entry }) {
  const checks = await runLinkChecks(entry);
  return (
    <LinkChecksFrame>
      <ul className="mt-3 space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="text-body-s flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Tag tone={TONE[c.level].tone} className="w-20 justify-center">{TONE[c.level].word}</Tag>
            <strong className="text-ink">{c.label}</strong>
            <span className="min-w-0 break-words text-ink-muted">{c.detail}</span>
          </li>
        ))}
      </ul>
      <p className="text-body-s mt-3 text-ink-muted">Automatic checks can miss things. Open the link yourself before approving.</p>
    </LinkChecksFrame>
  );
}
