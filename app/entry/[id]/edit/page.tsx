import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import EntryEditor from "@/components/EntryEditor";
import { updateEntryAction } from "@/app/actions/entries";
import { getCountryNames, getDisciplines, getEntriesByIds, getEntry, getPlaces, getToolNames } from "@/lib/db/entries";
import { getCurrentUser } from "@/lib/db/profiles";
import { isAdmin } from "@/lib/db/mylayer";
import { entryToFormValues } from "@/lib/entry-input";
import { canEditEntry } from "@/lib/permissions";

export const metadata: Metadata = { title: "Edit entry", robots: { index: false } };

export default async function EditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/entry/${id}/edit`)}`);
  const [e, admin, places, countries, disciplines, tools] = await Promise.all([getEntry(id), isAdmin(), getPlaces(), getCountryNames(), getDisciplines(), getToolNames()]);
  if (!e) notFound();
  if (!canEditEntry(e, user.id, admin)) redirect(`/entry/${id}`);

  const orgId = [e.data.organisation_id, e.data.institution_id].find((x): x is string => typeof x === "string");
  const toolId = typeof e.data.tool_id === "string" ? e.data.tool_id : undefined;
  const linked = await getEntriesByIds([orgId, toolId].filter((x): x is string => !!x));
  const initial = entryToFormValues(e, orgId ? linked[orgId]?.title : undefined, toolId ? linked[toolId]?.title : undefined);

  return (
    <div className="max-w-3xl">
      <Link href={`/entry/${id}`} className="text-label text-ink-muted hover:text-ink">← Back to entry</Link>
      <h1 className="text-display-m mt-6 text-ink">Edit entry</h1>
      {e.visibility === "public" && <p className="text-body-s mt-4 text-ink-muted">This entry is on the public Map. Your changes go live as soon as you save.</p>}
      <div className="mt-8">
        <EntryEditor
          mode="edit"
          initial={initial}
          hidden={{}}
          editableUrl
          action={updateEntryAction.bind(null, id)}
          places={places}
          countries={countries}
          disciplines={disciplines}
          tools={tools}
          favicon={e.favicon_url}
          image={e.image_url}
          cancelHref={`/entry/${id}`}
        />
      </div>
    </div>
  );
}
