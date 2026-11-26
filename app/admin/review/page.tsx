import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EntryList from "@/components/EntryList";
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
      <PageTitle kicker="Admin" title="Review queue" aside={<p className="text-body-l max-w-md text-ink-muted">Entries suggested to the Map. Open one to check it, then approve or reject it.</p>} />
      <div className="max-w-[46rem]">
        <EntryList entries={pending} lens={GLOBAL_LENS} fx={fx} empty={<>Nothing waiting. <Link href="/" className="text-ink underline underline-offset-4">Back to the guide</Link></>} />
      </div>
    </div>
  );
}
