import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EntryList from "@/components/EntryList";
import RefreshLists from "@/components/RefreshLists";
import { PageTitle, SIDEBAR_GRID } from "@/components/ui/layout";
import { GLOBAL_LENS } from "@/lib/lens";
import { countAccounts, getCurrentUser } from "@/lib/db/profiles";
import { isAdmin, listPendingReview } from "@/lib/db/mylayer";

export const metadata: Metadata = { title: "Review queue", robots: { index: false } };

export default async function ReviewPage() {
  if (!(await getCurrentUser())) redirect("/login?next=/admin/review");
  if (!(await isAdmin())) notFound();
  const [pending, accounts] = await Promise.all([listPendingReview(), countAccounts()]);
  return (
    <div>
      <PageTitle kicker="Admin" title="Review queue" aside={<p className="text-body-l max-w-md text-ink-muted">Entries suggested to the Map. Open one to see its link checks, then approve or reject it.</p>} />
      <div className="mb-10 border-t border-line" />
      <div className={SIDEBAR_GRID}>
        <aside className="space-y-8 lg:sticky lg:top-8 lg:self-start">
          <section aria-labelledby="accounts">
            <h2 id="accounts" className="text-label text-ink">Accounts</h2>
            <p className="text-numeral mt-3 text-ink">{accounts ?? "—"}</p>
            <p className="text-body-s mt-2 text-ink-muted">People who have signed up. Visitors who browse without signing in aren&apos;t counted.</p>
          </section>
          <section aria-labelledby="shared-lists" className="border-t border-line pt-8">
            <h2 id="shared-lists" className="text-label text-ink">Shared lists</h2>
            <p className="text-body-s mt-2 mb-4 text-ink-muted">
              Countries, regions and disciplines update about once an hour. If you&apos;ve just edited them in the database, refresh to show the changes now.
            </p>
            <RefreshLists />
          </section>
        </aside>
        <div className="min-w-0">
          <EntryList from="review" entries={pending} lens={GLOBAL_LENS} empty={<>Nothing waiting. <Link href="/" className="text-ink underline underline-offset-4">Back to the guide</Link></>} />
        </div>
      </div>
    </div>
  );
}
