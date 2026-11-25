import type { ReactNode } from "react";
import { getEntriesByIds } from "@/lib/db/entries";
import { entryPicture } from "@/lib/icon";
import { groupByLetter } from "@/lib/index-groups";
import { locationLabel } from "@/lib/places";
import { placeRelevance } from "@/lib/relevance";
import { TYPE_SWATCH } from "@/lib/swatch";
import { humanize, isTool, KINDS, type Discipline, type Entry, type Lens } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { IndexGroup } from "@/components/ui/IndexRow";
import { DisciplineTag, Tag } from "@/components/ui/primitives";
import { EligibilityTag } from "@/components/ui/status";

const MAX_DISCIPLINES = 2;

/**
 * Organisations and resources as a catalogue of cards (knowledge-publication reference),
 * under A–Z headings that follow the existing alphabetical sort (split by relevance in a
 * place lens). Each card: picture on its type's ground, location, kind, summary, disciplines,
 * and the eligibility badge in a place lens.
 */
export default async function EntryCatalogue({
  entries,
  lens,
  disciplines,
  query,
  empty,
  savedIds,
  placeless = false,
}: {
  entries: Entry[];
  lens: Lens;
  disciplines?: Discipline[];
  query?: string;
  empty: ReactNode;
  /** entries in the signed-in user's layer get a "Saved" tag */
  savedIds?: Set<string>;
  /** Tools: digital, not place-based — no relevance groups or eligibility badges in a place lens. */
  placeless?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="border-y border-line py-16 text-center">
        <p className="text-body text-ink-muted">{empty}</p>
      </div>
    );
  }
  const linkIds = entries.map((e) => (e.data.organisation_id ?? e.data.tool_id) as string | undefined).filter((x): x is string => !!x);
  const linked = await getEntriesByIds([...new Set(linkIds)]);
  const label = new Map((disciplines ?? []).map((d) => [d.slug, d.label]));
  const groups = groupByLetter(entries, lens, { query, byRelevance: !placeless });

  return (
    <div className="flex flex-col gap-14">
      {groups.map((g) => (
        <IndexGroup key={g.key} title={g.title || `${g.items.length} ${g.items.length === 1 ? "entry" : "entries"}`} period={g.period}>
          <li className="list-none pt-6">
            <ul className="anim-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((e) => {
                const title = e.title.replace(/^\[Demo\]\s*/, "");
                const kindValue = e.data[KINDS[e.type].field];
                const kind = isTool(e) ? "Tool" : typeof kindValue === "string" ? humanize(kindValue) : null;
                const linkId = (e.data.organisation_id ?? e.data.tool_id) as string | undefined;
                const by = linkId ? linked[linkId]?.title.replace(/^\[Demo\]\s*/, "") : typeof e.data.author === "string" ? e.data.author : undefined;
                const pic = entryPicture(e);
                const extra = e.disciplines.length - MAX_DISCIPLINES;
                const saved = savedIds?.has(e.id);
                return (
                  <li key={e.id} className="flex">
                    <div className="flex w-full flex-col [&>article]:flex-1">
                      <Card
                        href={`/entry/${e.id}?lens=${lens.slug}`}
                        title={title}
                        kicker={[kind, by].filter(Boolean).join(" · ") || undefined}
                        swatch={TYPE_SWATCH[e.type]}
                        image={pic.src}
                        imageFit={pic.fit}
                        location={locationLabel(e) || undefined}
                        description={e.summary}
                        tags={
                          e.disciplines.length > 0 || title !== e.title || saved ? (
                            <>
                              {saved && <Tag tone="solid" title="In My Layer">Saved</Tag>}
                              {e.disciplines.slice(0, MAX_DISCIPLINES).map((d) => (
                                <DisciplineTag key={d} name={d} label={label.get(d) ?? humanize(d)} />
                              ))}
                              {extra > 0 && <Tag tone="muted">+{extra}</Tag>}
                              {title !== e.title && <Tag tone="muted">Demo</Tag>}
                            </>
                          ) : undefined
                        }
                        eligibility={lens.kind !== "global" && !placeless && !isTool(e) ? <EligibilityTag relevance={placeRelevance(e, lens)} place={lens.label} /> : undefined}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        </IndexGroup>
      ))}
    </div>
  );
}
