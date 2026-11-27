import SearchField from "./ui/SearchField";
import AutoSubmit from "./AutoSubmit";
import FilterSelect from "./FilterSelect";
import { REMOTE_TYPES, WINDOWS, type Params } from "@/lib/filters";
import { humanize, KINDS, type Discipline, type EntryType, type Lens } from "@/lib/types";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Field-guide filter column (DESIGN.md): micro labels, square hairline dropdowns, pill buttons. */
const c = {
  form: "flex flex-col gap-5",
  label: "text-micro text-ink-muted",
  keyword: "block",
  actions: "flex items-center gap-2 border-t border-line pt-5",
  clear: "text-label py-1.5 text-ink-muted hover:text-ink",
};

export default function Filters({
  type,
  kinds,
  params,
  lens,
  disciplines,
  placeless = false,
}: {
  type: EntryType;
  kinds?: string[];
  params: Params;
  lens: Lens;
  disciplines: Discipline[];
  /** Tools are digital and not place-based: no remote or lens-relevance filters. */
  placeless?: boolean;
}) {
  const v = (k: string) => one(params[k]);
  const dated = type === "job" || type === "opportunity" || type === "program" || type === "event";
  const kindLabel = { organisation: "Kind", program: "Programme type", job: "Seniority", opportunity: "Call type", resource: "Format", event: "Event type" }[type];

  return (
    <AutoSubmit className={c.form}>
      <input type="hidden" name="lens" value={lens.slug} />
      <label className={c.keyword}>
        <span className={c.label}>Keyword</span>
        <SearchField name="q" size="s" className="mt-1.5" defaultValue={v("q")} placeholder="e.g. TouchDesigner" />
      </label>
      {/* Only while a city is chosen (from the home globe): empty the box to clear it. */}
      {!placeless && v("city") && (
        <label className={c.keyword}>
          <span className={c.label}>City</span>
          <SearchField key={v("city")} name="city" size="s" className="mt-1.5" defaultValue={v("city")} />
        </label>
      )}
      {/* Discipline leads the filters on every section, right after the keyword. */}
      <FilterSelect name="discipline" label="Discipline" value={v("discipline")} options={disciplines.map((d) => ({ value: d.slug, label: d.label }))} />
      {(kinds ?? KINDS[type].values).length > 0 && (
        <FilterSelect name="kind" label={kindLabel} value={v("kind")} options={(kinds ?? KINDS[type].values).map((k) => ({ value: k, label: humanize(k) }))} />
      )}
      {dated && (
        <FilterSelect name="within" label={type === "event" ? "Starting within" : "Deadline within"} value={v("within")} options={WINDOWS.map((w) => ({ ...w }))} />
      )}
      {type === "job" && (
        <>
          <FilterSelect name="work_mode" label="Work mode" value={v("work_mode")} options={["onsite", "hybrid", "remote"].map((x) => ({ value: x, label: humanize(x) }))} />
          <FilterSelect name="visa" label="Visa sponsorship" value={v("visa")} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unknown", label: "Unknown" }]} />
        </>
      )}
      {REMOTE_TYPES.includes(type) && <FilterSelect name="remote" label="Remote / In person" value={v("remote")} options={[{ value: "yes", label: "Remote / Online" }, { value: "no", label: "In person" }]} />}
      {lens.kind !== "global" && !placeless && (
        <FilterSelect
          name="relevance"
          label={`Relevance to ${lens.label}`}
          value={v("relevance")}
          options={[
            { value: "based_in", label: `Based in ${lens.label}` },
            { value: "open_to", label: `Open to ${lens.label}` },
            { value: "unknown", label: "Eligibility unclear" },
            { value: "not_open", label: `Not open to ${lens.label}` },
          ]}
        />
      )}
      <div className={c.actions}>
        <a href={`?lens=${lens.slug}`} data-clear className={c.clear}>Clear filters</a>
        <span role="status" className="text-tag ml-auto text-ink-muted">
          <span className="hidden in-data-pending:inline">Updating…</span>
        </span>
      </div>
    </AutoSubmit>
  );
}
