"use client";
import { addressChecks } from "@/lib/link-checks";

/**
 * A link nobody has approved yet, as someone reviewing it sees it, always with its website and full address.
 * An ordinary-looking address opens in one click, to keep reviewing quick. One with warning signs asks first,
 * and is deliberately not an anchor, so a stray click, middle click or tap can't follow it.
 */
export default function UnreviewedLink({ url, label }: { url: string; label: string }) {
  let safe: URL | null = null;
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") safe = u;
  } catch {
    /* not a URL: shown as text only */
  }
  // The parsed form spells out lookalike (non-Latin) domains as xn--…, so show that rather than what was typed.
  const address = safe?.href ?? url;
  const warnings = addressChecks(url);
  if (safe && warnings.length === 0)
    return (
      <span className="block w-full">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a href={address} target="_blank" rel="noopener noreferrer" className="text-label rounded-full border border-ink px-3.5 py-1.5 text-ink transition-colors hover:bg-ink hover:text-bg">
            Open {label.toLowerCase()} ↗
          </a>
          <strong className="text-body-s min-w-0 break-all text-ink">{safe.hostname}</strong>
        </span>
        <span className="text-body-s mt-1 block break-all text-ink-muted select-all">{address}</span>
      </span>
    );
  return (
    <span className="block w-full border border-dashed border-accent p-3">
      <span className="text-micro block text-ink-muted">{label} · not reviewed</span>
      {safe && (
        <span className="text-body-s mt-1 block break-all text-ink">
          Website: <strong>{safe.hostname}</strong>
        </span>
      )}
      <span className="text-body-s mt-1 block break-all text-ink-muted select-all">{address}</span>
      {safe && <span className="text-body-s mt-1 block text-accent-text">{warnings.map((w) => w.label).join(" · ")}</span>}
      {safe ? (
        <button
          type="button"
          className="text-label mt-2 rounded-full border border-ink px-3.5 py-1.5 text-ink transition-colors hover:bg-ink hover:text-bg"
          onClick={() => {
            if (confirm(`This link has warning signs: ${warnings.map((w) => w.label).join(", ")}.\n\nWebsite: ${safe.hostname}\nFull address: ${address}\n\nOpen it in a new tab?`)) window.open(address, "_blank", "noopener,noreferrer");
          }}
        >
          Open anyway ↗
        </button>
      ) : (
        <span className="text-body-s mt-2 block text-accent-text">This isn&apos;t a web link, so it can&apos;t be opened.</span>
      )}
    </span>
  );
}
