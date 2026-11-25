import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AddForm from "./AddForm";
import { BracketLabel } from "@/components/ui/primitives";
import { getDisciplines, getPlaces, getToolNames } from "@/lib/db/entries";
import { getCurrentUser } from "@/lib/db/profiles";
import { isAdmin } from "@/lib/db/mylayer";

export const metadata: Metadata = { title: "Add an entry" };

export default async function AddPage({ searchParams }: { searchParams: Promise<{ url?: string; tool?: string }> }) {
  const { url, tool } = await searchParams;
  if (!(await getCurrentUser())) redirect(`/login?next=${encodeURIComponent(`/add${url ? `?url=${encodeURIComponent(url)}` : ""}`)}`);
  const [places, disciplines, admin, tools] = await Promise.all([getPlaces(), getDisciplines(), isAdmin(), getToolNames()]);
  return (
    <div className="max-w-3xl">
      <BracketLabel accent>Drop URL</BracketLabel>
      <h1 className="text-display-m mt-4 text-ink">Add an entry</h1>
      <p className="text-body mt-4 text-ink-muted">
        Paste a link and we&apos;ll fill in what we can. It&apos;s saved privately to your layer; turn on &ldquo;Suggest to the Map&rdquo; to send it for review.
      </p>
      <div className="mt-8">
        <AddForm initialUrl={url ?? ""} places={places} disciplines={disciplines} tools={tools} initialTool={tool && tools.includes(tool) ? tool : undefined} isAdmin={admin} />
      </div>
    </div>
  );
}
