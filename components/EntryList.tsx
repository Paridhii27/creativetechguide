import EntryCard from "./EntryCard";
import { getEntriesByIds } from "@/lib/db/entries";
import type { Entry, Lens } from "@/lib/types";

const orgIdOf = (e: Entry) => (e.data.organisation_id ?? e.data.institution_id ?? e.data.tool_id) as string | undefined;

export default async function EntryList({ entries, lens, empty, actionsFor, savedIds }: { entries: Entry[]; lens: Lens; empty?: React.ReactNode; actionsFor?: (e: Entry) => React.ReactNode; savedIds?: Set<string> }) {
  if (entries.length === 0) return <div className="text-body border-y border-line py-16 text-center text-ink-muted">{empty ?? "Nothing here yet."}</div>;
  const orgs = await getEntriesByIds([...new Set(entries.map(orgIdOf).filter((x): x is string => !!x))]);
  return (
    <ul className="anim-stagger border-t border-ink">
      {entries.map((e) => {
        const org = orgIdOf(e);
        return <EntryCard key={e.id} entry={e} lens={lens} orgName={org ? orgs[org]?.title.replace(/^\[Demo\]\s*/, "") : undefined} actions={actionsFor?.(e)} saved={savedIds?.has(e.id)} />;
      })}
    </ul>
  );
}
