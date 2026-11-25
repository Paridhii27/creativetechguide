import SearchField from "./ui/SearchField";
import AutoSubmit from "./AutoSubmit";
import { WINDOWS, type Params } from "@/lib/filters";
import { humanize, KINDS, type Discipline, type EntryType, type Lens } from "@/lib/types";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Field-guide filter column (DESIGN.md): micro labels, square hairline fields, pill buttons. */
const c = {
  form: "flex flex-col gap-5",
  label: "text-micro text-ink-muted",
  field:
    "text-body-s mt-1.5 w-full appearance-none rounded-none border border-line bg-bg py-2 pr-7 pl-2.5 text-ink transition-colors hover:border-ink focus:border-ink",
  keyword: "block",
  actions: "flex items-center gap-2 border-t border-line pt-5",
  apply: "text-label rounded-full border border-ink bg-ink px-3.5 py-1.5 text-bg transition-colors hover:bg-transparent hover:text-ink",
  clear: "text-label rounded-full border border-transparent px-3.5 py-1.5 text-ink-muted hover:text-ink",
};

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: { value: string; label: string }[] }) {
  return (
    <label className="block min-w-0">
      <span className={c.label}>{label}</span>
      <span className="relative block">
        <select name={name} defaultValue={value} className={c.field}>
          <option value="">Any</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span aria-hidden className="text-tag pointer-events-none absolute top-1/2 right-2.5 mt-[3px] -translate-y-1/2 text-ink-muted">
          ▾
        </span>
      </span>
    </label>
  );
}

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
      {/* Discipline leads the filters on every section, right after the keyword. */}
      <Select name="discipline" label="Discipline" value={v("discipline")} options={disciplines.map((d) => ({ value: d.slug, label: d.label }))} />
      {(kinds ?? KINDS[type].values).length > 0 && (
        <Select name="kind" label={kindLabel} value={v("kind")} options={(kinds ?? KINDS[type].values).map((k) => ({ value: k, label: humanize(k) }))} />
      )}
      {dated && (
        <Select name="within" label={type === "event" ? "Starting within" : "Deadline within"} value={v("within")} options={WINDOWS.map((w) => ({ ...w }))} />
      )}
      {type === "job" && (
        <>
          <Select name="work_mode" label="Work mode" value={v("work_mode")} options={["onsite", "hybrid", "remote"].map((x) => ({ value: x, label: humanize(x) }))} />
          <Select name="visa" label="Visa sponsorship" value={v("visa")} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unknown", label: "Unknown" }]} />
        </>
      )}
      {!placeless && <Select name="remote" label="Remote / online" value={v("remote")} options={[{ value: "yes", label: "Remote or online" }, { value: "no", label: "In person" }]} />}
      {lens.kind !== "global" && !placeless && (
        <Select
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
        <button className={c.apply}>Apply</button>
        <a href={`?lens=${lens.slug}`} className={c.clear}>Clear</a>
      </div>
    </AutoSubmit>
  );
}
