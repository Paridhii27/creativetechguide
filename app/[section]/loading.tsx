/** Shown the moment a section is clicked, while its listing is prepared, so the click visibly does something. */
export default function Loading() {
  return (
    <div role="status" className="animate-pulse motion-reduce:animate-none">
      <p className="text-micro text-ink-muted">Loading the list…</p>
      <div aria-hidden>
        <div className="mt-6 mb-10 h-12 w-64 max-w-full bg-surface" />
        <div className="grid gap-8 border-t border-line pt-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-28">
          <div className="hidden space-y-5 lg:block">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 bg-surface" />)}
          </div>
          <div className="space-y-4">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-surface" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
