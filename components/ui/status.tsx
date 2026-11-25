import { dateChip, formatDate } from "@/lib/dates";
import { relevanceBadge } from "@/lib/lens";
import type { Relevance } from "@/lib/types";
import { Tag } from "./primitives";

/**
 * Deadline coloured by urgency (all modes): >30 days ink, <30 days accent outline,
 * <7 days solid accent. Past and unknown dates are muted.
 */
export function DeadlineMark({ date, label = "Deadline", event, endDate, className = "" }: { date: string | null; label?: string; event?: boolean; endDate?: string | null; className?: string }) {
  const c = dateChip({ date, label, event, endDate });
  const tone = c.tone === "week" ? "solid" : c.tone === "month" ? "accent" : c.tone === "later" ? "outline" : "muted";
  return (
    <Tag tone={tone} title={date ? `${label}: ${formatDate(date)}` : undefined} className={`${c.tone === "past" ? "line-through" : ""} ${className}`}>
      {c.text}
      {c.rel && <span className="opacity-75">· {c.rel}</span>}
    </Tag>
  );
}

/** "Based in X / Open to X / Eligibility unclear / Not open to X" for a place lens. Wording from relevanceBadge. */
export function EligibilityTag({ relevance, place }: { relevance: Relevance; place: string }) {
  const { label } = relevanceBadge(relevance, place);
  switch (relevance) {
    case "based_in":
      return <Tag tone="solid">{label}</Tag>;
    case "open_to":
      return <Tag tone="accent">{label}</Tag>;
    case "not_open":
      return <Tag tone="muted" className="line-through">{label}</Tag>;
    default:
      return <Tag tone="muted">{label}</Tag>;
  }
}
