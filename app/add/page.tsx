import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AddForm from "./AddForm";
import HiddenSquare from "@/components/ui/HiddenSquare";
import { WHIMSY } from "@/lib/whimsy";
import { BracketLabel } from "@/components/ui/primitives";
import { PageTitle, SIDEBAR_GRID } from "@/components/ui/layout";
import { getCountryNames, getDisciplines, getPlaces, getToolNames } from "@/lib/db/entries";
import { getCurrentUser } from "@/lib/db/profiles";
import { isAdmin } from "@/lib/db/mylayer";

export const metadata: Metadata = { title: "Add an entry", robots: { index: false } };

export default async function AddPage({ searchParams }: { searchParams: Promise<{ url?: string; tool?: string }> }) {
  const { url, tool } = await searchParams;
  if (!(await getCurrentUser())) redirect(`/login?next=${encodeURIComponent(`/add${url ? `?url=${encodeURIComponent(url)}` : ""}`)}`);
  const [places, countries, disciplines, admin, tools] = await Promise.all([getPlaces(), getCountryNames(), getDisciplines(), isAdmin(), getToolNames()]);
  return (
    <div>
      <PageTitle title="Add an entry" eyebrow={<BracketLabel accent>Drop URL</BracketLabel>} />
      <div className="mb-6 border-t border-line sm:mb-10" />
      <div className={SIDEBAR_GRID}>
        <aside className="text-body-s space-y-4 text-ink-muted lg:sticky lg:top-8 lg:self-start">
          <p className="relative">Studios, courses, jobs, open calls, events and good reads related to creative technology are all welcome. Paste a link and we&apos;ll fill in what we can. <HiddenSquare phrases={WHIMSY.add} start={2} /></p>
          <p>It&apos;s saved privately to your layer; turn on &ldquo;Suggest to the Map&rdquo; to send it for review.</p>
        </aside>
        <div className="min-w-0">
          <AddForm initialUrl={url ?? ""} places={places} countries={countries} disciplines={disciplines} tools={tools} initialTool={tool && tools.includes(tool) ? tool : undefined} isAdmin={admin} />
        </div>
      </div>
    </div>
  );
}
