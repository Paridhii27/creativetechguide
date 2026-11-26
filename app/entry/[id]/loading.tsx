/** Shown the moment an entry is clicked, while its page is prepared, so the click visibly does something. */
export default function Loading() {
  return (
    <div role="status" className="max-w-[46rem] animate-pulse motion-reduce:animate-none">
      <p className="text-micro text-ink-muted">Opening entry…</p>
      <div aria-hidden className="mt-8 space-y-4">
        <div className="h-3 w-32 bg-surface" />
        <div className="h-12 w-3/4 bg-surface" />
        <div className="h-24 w-full bg-surface" />
        <div className="h-10 w-48 rounded-full bg-surface" />
      </div>
    </div>
  );
}
