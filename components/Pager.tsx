import Link from "next/link";
import { withParams, type Params } from "@/lib/filters";

const pill = "text-label rounded-full border border-ink px-3.5 py-1.5 text-ink transition-colors hover:bg-ink hover:text-bg";

export default function Pager({ path, params, page, hasMore }: { path: string; params: Params; page: number; hasMore: boolean }) {
  if (page === 1 && !hasMore) return null;
  return (
    <nav className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-5" aria-label="Pagination">
      {page > 1 ? <Link href={withParams(path, params, { page: page === 2 ? null : String(page - 1) })} className={pill}>← Previous</Link> : <span />}
      <span className="text-micro text-ink-muted">Page {String(page).padStart(2, "0")}</span>
      {hasMore ? <Link href={withParams(path, params, { page: String(page + 1) })} className={pill}>Next →</Link> : <span />}
    </nav>
  );
}
