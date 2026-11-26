import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EntryList from "@/components/EntryList";
import RefreshLists from "@/components/RefreshLists";
import { PageTitle } from "@/components/ui/layout";
import { GLOBAL_LENS } from "@/lib/lens";
import { getFxTable } from "@/lib/db/entries";
import { getCurrentUser } from "@/lib/db/profiles";
import { isAdmin, listPendingReview } from "@/lib/db/mylayer";

export const metadata: Metadata = { title: "Review queue", robots: { index: false } };

export default async function ReviewPage() {
  if (!(await getCurrentUser())) redirect("/login?next=/admin/review");
  if (!(await isAdmin())) notFound();
  const [pending, fx] = await Promise.all([listPendingReview(), getFxTable()]);
  return (
    <div>
      <PageTitle kicker="Admin" title="Review queue" aside={<p className="text-body-l max-w-md text-ink-muted">Entries suggested to the Map. Open one to see its link checks, then approve or reject it.</p>} />
      <section aria-labelledby="shared-lists" className="mb-10 max-w-[46rem] border border-line p-5">
        <h2 id="shared-lists" className="text-label text-ink">Shared lists</h2>
        <p className="text-body-s mt-2 mb-4 text-ink-muted">
          Countries, regions, disciplines and exchange rates update about once an hour. If you&apos;ve just edited them in the database, refresh to show the changes now.
        </p>
        <RefreshLists />
      </section>
      <div className="max-w-[46rem]">
        <EntryList entries={pending} lens={GLOBAL_LENS} fx={fx} empty={<>Nothing waiting. <Link href="/" className="text-ink underline underline-offset-4">Back to the guide</Link></>} />
      </div>
    </div>
  );
}
