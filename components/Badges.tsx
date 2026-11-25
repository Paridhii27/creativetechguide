import { extraPlaceNames, locationLabel } from "@/lib/places";
export { extraPlaceNames, locationLabel };
export { Monogram } from "./Monogram";
import { DeadlineMark, EligibilityTag } from "@/components/ui/status";
import { placeRelevance } from "@/lib/relevance";
import type { Entry, Lens } from "@/lib/types";

/** Deadline coloured by urgency (DESIGN.md): >30 days ink, <30 accent outline, <7 solid accent. */
export function DeadlineChip({ date, label = "Deadline", event, endDate }: { date: string | null; label?: string; event?: boolean; endDate?: string | null }) {
  return <DeadlineMark date={date} label={label} event={event} endDate={endDate} />;
}

/** "Based in X / Open to X / Eligibility unclear" for the viewer's lens. Nothing in the Global lens. */
export function EligibilityBadge({ entry, lens }: { entry: Pick<Entry, "country" | "region" | "is_remote" | "data">; lens: Lens }) {
  if (lens.kind === "global") return null;
  return <EligibilityTag relevance={placeRelevance(entry, lens)} place={lens.label} />;
}

export function dateLabelFor(type: Entry["type"]): string | null {
  switch (type) {
    case "job":
      return "Closes";
    case "opportunity":
    case "program":
      return "Deadline";
    case "event":
      return "Starts";
    default:
      return null;
  }
}

