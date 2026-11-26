"use client";
import { startTransition, useActionState, useRef, useState } from "react";
import type { SaveState } from "@/app/actions/entries";
import { Monogram } from "@/components/Monogram";
import { defaultIconChoice, type IconChoice } from "@/lib/icon";
import { countryForCity } from "@/lib/places";
import { KINDS, SECTIONS, TOOL_KIND, humanize, kindsForSection, type Discipline, type EntryType, type Place } from "@/lib/types";

export type FormValues = Record<string, string | string[] | boolean | undefined>;


type Spec =
  | { kind: "text" | "url" | "date" | "number"; name: string; label: string; hint?: string; placeholder?: string; key?: boolean; list?: string }
  | { kind: "select"; name: string; label: string; options: string[] }
  | { kind: "tri"; name: string; label: string }

const ORG = (label = "Organisation"): Spec => ({ kind: "text", name: "organisation_name", label, hint: "Links to it if it's already on the Map." });
const APPLY: Spec = { kind: "url", name: "apply_url", label: "Apply link", placeholder: "Defaults to the page link" };

/** Type-specific fields. `key: true` marks the one date that stays visible even when empty. */
const FIELDS: Record<EntryType, Spec[]> = {
  organisation: [
    { kind: "tri", name: "hires_design_technologists", label: "Hires design technologists?" },
    { kind: "url", name: "careers_url", label: "Careers page" },
    { kind: "text", name: "instagram", label: "Instagram handle", placeholder: "@studio" },
  ],
  program: [
    { kind: "date", name: "deadline_date", label: "Application deadline", key: true },
    ORG("Institution"),
    { kind: "text", name: "degree_name", label: "Degree name", placeholder: "M.Des, MA, MFA…" },
    { kind: "number", name: "duration_months", label: "Duration (months)" },
    { kind: "select", name: "mode", label: "Mode", options: ["in_person", "online", "hybrid"] },
    { kind: "tri", name: "portfolio_required", label: "Portfolio required?" },
    { kind: "text", name: "deadline_round", label: "Application round", placeholder: "Round 1" },
    { kind: "text", name: "scholarship_name", label: "Scholarship" },
    { kind: "tri", name: "scholarship_open_worldwide", label: "Scholarship open worldwide?" },
    { kind: "text", name: "scholarship_eligible_countries", label: "Scholarship for applicants from", hint: "Comma-separated, if restricted" },
    APPLY,
  ],
  job: [
    { kind: "date", name: "closes_at", label: "Closing date", key: true },
    ORG(),
    { kind: "text", name: "role_title", label: "Role title" },
    { kind: "select", name: "employment", label: "Employment", options: ["full_time", "part_time", "contract", "freelance"] },
    { kind: "select", name: "work_mode", label: "Work mode", options: ["onsite", "hybrid", "remote"] },
    { kind: "text", name: "remote_regions", label: "Remote from", hint: "Comma-separated, e.g. Worldwide, or Europe, India" },
    { kind: "tri", name: "visa_sponsorship", label: "Visa sponsorship" },
    { kind: "text", name: "skills", label: "Skills", hint: "Comma-separated: TouchDesigner, Unity, p5.js…" },
    APPLY,
  ],
  opportunity: [
    { kind: "date", name: "deadline", label: "Deadline", key: true },
    ORG(),
    { kind: "tri", name: "open_worldwide", label: "Open worldwide?" },
    { kind: "text", name: "eligibility_countries", label: "Eligible countries / regions", hint: "Comma-separated, only if restricted" },
    { kind: "text", name: "ineligible_countries", label: "Explicitly not eligible", hint: "Comma-separated" },
    { kind: "text", name: "fee", label: "Entry fee", placeholder: "none, or the amount" },
    { kind: "text", name: "stipend_or_budget", label: "Stipend / budget" },
    { kind: "tri", name: "travel_covered", label: "Travel covered?" },
    APPLY,
  ],
  resource: [
    { kind: "text", name: "tool_name", label: "For tool", list: "tools", hint: "Link it to a tool on the Map, e.g. TouchDesigner." },
    { kind: "text", name: "author", label: "Author" },
    { kind: "text", name: "publisher", label: "Publisher" },
    { kind: "text", name: "frequency", label: "Frequency", placeholder: "weekly, monthly…" },
    { kind: "tri", name: "is_free", label: "Free?" },
  ],
  event: [
    { kind: "date", name: "start_date", label: "Starts", key: true },
    { kind: "date", name: "end_date", label: "Ends" },
    ORG("Organiser"),
    { kind: "text", name: "venue", label: "Venue" },
    { kind: "tri", name: "recurring", label: "Recurring?" },
  ],
};

/** Tools are resources of kind 'tool', with their own short form. */
const TOOL_FIELDS: Spec[] = [
  { kind: "text", name: "author", label: "Made by", placeholder: "Company, person or community" },
  { kind: "tri", name: "is_free", label: "Free?" },
];

const SOURCE_TEXT: Spec = { kind: "text", name: "deadline_source_text", label: "Where the date comes from", hint: "The sentence on the page that states the date." };

const namesOf = (s: Spec) => [s.name];
const asText = (v: FormValues[string]) => (Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "");
const isFilled = (v: FormValues[string]) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim() !== "" && v !== "unknown" : !!v);

function Field({ label, name, error, hint, children, wide }: { label: string; name?: string; error?: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`} htmlFor={name}>
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && !error && <span className="mt-1 block text-body-s text-ink-muted">{hint}</span>}
      {error && <span className="mt-1 block text-body-s text-accent-text">{error}</span>}
    </label>
  );
}

function SpecField({ spec, values, errors }: { spec: Spec; values: FormValues; errors: Record<string, string> }) {
  const v = (n: string) => asText(values[n]);
  switch (spec.kind) {
    case "select":
      return (
        <Field label={spec.label} name={spec.name} error={errors[spec.name]}>
          <select id={spec.name} name={spec.name} defaultValue={v(spec.name)} className="field">
            <option value="">—</option>
            {spec.options.map((o) => <option key={o} value={o}>{humanize(o)}</option>)}
          </select>
        </Field>
      );
    case "tri":
      return (
        <Field label={spec.label} name={spec.name}>
          <select id={spec.name} name={spec.name} defaultValue={v(spec.name) === "unknown" ? "" : v(spec.name)} className="field">
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
      );
    default:
      return (
        <Field label={spec.label} name={spec.name} error={errors[spec.name]} hint={spec.hint} wide={spec.name === "deadline_source_text"}>
          <input
            id={spec.name}
            name={spec.name}
            type={spec.kind === "date" ? "date" : spec.kind === "url" ? "url" : "text"}
            inputMode={spec.kind === "number" ? "numeric" : undefined}
            placeholder={spec.placeholder}
            list={spec.list}
            defaultValue={v(spec.name)}
            className="field"
          />
        </Field>
      );
  }
}

interface Props {
  mode: "add" | "edit";
  initial: FormValues;
  /** Hidden fields carried through unchanged (url, image_url, favicon_url). */
  hidden: Record<string, string>;
  action: (prev: SaveState, fd: FormData) => Promise<SaveState>;
  places: Place[];
  /** Every country name, for the Country suggestions (places only covers countries with a seeded city). */
  countries?: string[];
  disciplines: Discipline[];
  /** Tool names for the "For tool" picker. */
  tools?: string[];
  /** The link's favicon and page image, if it has them, for the picture choice. */
  favicon?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  /** Shown under the type pills, e.g. "Filled in from the page." */
  note?: string;
  /** Add mode: show the URL field itself so a link can be added or corrected. */
  editableUrl?: boolean;
  cancelHref?: string;
}

export default function EntryEditor({ mode, initial, hidden, action, places, countries: allCountries = [], disciplines, tools = [], favicon, image, isAdmin, note, editableUrl, cancelHref }: Props) {
  const initialType = (initial.type as EntryType) ?? "organisation";
  const [slug, setSlug] = useState(initialType === "resource" && initial.kind === TOOL_KIND ? "tools" : SECTIONS.find((s) => s.type === initialType && !s.kind)!.slug);
  const section = SECTIONS.find((s) => s.slug === slug)!;
  const type = section.type;
  const [state, formAction, saving] = useActionState<SaveState, FormData>(action, null);
  const [allDisciplines, setAllDisciplines] = useState(false);
  // Other offices: rows of (city, country); the main place is the City / Country pair above.
  const initialCities = Array.isArray(initial.extra_city) ? initial.extra_city : [];
  const initialCountries = Array.isArray(initial.extra_country) ? initial.extra_country : [];
  const [extraRows, setExtraRows] = useState(() => Array.from({ length: Math.max(initialCities.length, initialCountries.length) }, (_, i) => ({ id: i, city: initialCities[i] ?? "", country: initialCountries[i] ?? "", auto: false })));
  const nextRowId = useRef(extraRows.length);
  // Typing or picking a known city fills its country, unless you've set the country yourself.
  const [title, setTitle] = useState(asText(initial.title));
  const [icon, setIcon] = useState<IconChoice>(defaultIconChoice(initial.icon, favicon, image));
  // "Auto" means the country came from the city, not from you: it follows the city, including clearing
  // when the city becomes one we don't know (so "Lisbon" never keeps "India" from a previous "Mumbai").
  // A country you type yourself is never overwritten.
  const initialCity = asText(initial.city);
  const initialAutoCountry = asText(initial.country) ? null : countryForCity(places, initialCity);
  const [city, setCity] = useState(initialCity);
  const [country, setCountry] = useState(asText(initial.country) || initialAutoCountry || "");
  const countryAuto = useRef(Boolean(initialAutoCountry));
  const onCity = (v: string) => {
    setCity(v);
    if (country && !countryAuto.current) return;
    const c = countryForCity(places, v);
    setCountry(c ?? "");
    countryAuto.current = Boolean(c);
  };
  const patchRow = (id: number, patch: Partial<{ city: string; country: string; auto: boolean }>) =>
    setExtraRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const onRowCity = (id: number, v: string) =>
    setExtraRows((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r;
        if (r.country && !r.auto) return { ...r, city: v };
        const c = countryForCity(places, v);
        return { ...r, city: v, country: c ?? "", auto: Boolean(c) };
      }),
    );
  const errors = state && "fieldErrors" in state ? state.fieldErrors ?? {} : {};
  const countries = [...new Set([...allCountries, ...places.map((p) => p.country)])].sort();
  const selectedDisciplines = new Set(Array.isArray(initial.disciplines) ? initial.disciplines : []);

  const specs = [...(section.kind ? TOOL_FIELDS : FIELDS[type]), ...(type === "opportunity" || type === "job" || type === "program" ? [SOURCE_TEXT] : [])];
  const shown = specs.filter((s) => ("key" in s && s.key) || namesOf(s).some((n) => isFilled(initial[n])));
  const more = specs.filter((s) => !shown.includes(s));
  const moreHasError = more.some((s) => namesOf(s).some((n) => errors[n]));

  return (
    // Submitted by hand: with `action={formAction}` React clears the fields even when the save is refused.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="space-y-8"
    >
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}

      <fieldset className="space-y-3">
        <legend className="text-heading text-ink">What is it?</legend>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <label key={s.slug} className={`text-label cursor-pointer rounded-full border px-3.5 py-1.5 transition-colors ${slug === s.slug ? "border-accent bg-accent text-on-accent" : "border-line text-ink-muted hover:border-ink hover:text-ink"}`}>
              <input type="radio" name="type" value={s.type} checked={slug === s.slug} onChange={() => setSlug(s.slug)} className="sr-only" />
              {s.singular}
            </label>
          ))}
        </div>
        {note && <p className="text-body-s text-ink-muted">{note}</p>}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        {editableUrl && (
          <Field label="Link" name="url" error={errors.url} wide>
            <input id="url" name="url" type="url" defaultValue={asText(initial.url)} className="field" />
          </Field>
        )}
        <Field label="Title" name="title" error={errors.title} wide>
          <input id="title" name="title" required value={title} onChange={(e) => setTitle(e.target.value)} className="field" />
        </Field>
        {(favicon || image) && (
          <fieldset className="sm:col-span-2">
            <legend className="label">Picture</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {([
                favicon ? { value: "favicon", label: "Site icon", src: favicon } : null,
                image ? { value: "image", label: "Page image", src: image } : null,
                { value: "letter", label: "Just the letter", src: null },
              ] as ({ value: IconChoice; label: string; src: string | null } | null)[])
                .filter((o): o is { value: IconChoice; label: string; src: string | null } => !!o)
                .map((o) => (
                  <label key={o.value} className={`flex cursor-pointer items-center gap-2 rounded-none border px-3 py-2 text-body-s ${icon === o.value ? "border-ink bg-surface" : "border-line text-ink-muted hover:text-ink"}`}>
                    <input type="radio" name="icon" value={o.value} checked={icon === o.value} onChange={() => setIcon(o.value)} className="sr-only" />
                    <Monogram title={title || "?"} src={o.src} size={32} />
                    {o.label}
                  </label>
                ))}
            </div>
          </fieldset>
        )}
        <Field label="Summary" name="summary" error={errors.summary} wide>
          <textarea id="summary" name="summary" rows={3} defaultValue={asText(initial.summary)} className="field" />
        </Field>
        {section.kind ? (
          <input type="hidden" name="kind" value={section.kind} />
        ) : (
          <Field label={KINDS[type].field === "seniority" ? "Seniority" : "Kind"} name="kind" error={errors.kind}>
            <select key={slug} id="kind" name="kind" defaultValue={kindsForSection(section).includes(asText(initial.kind)) ? asText(initial.kind) : ""} className="field">
              <option value="">—</option>
              {kindsForSection(section).map((o) => <option key={o} value={o}>{humanize(o)}</option>)}
            </select>
          </Field>
        )}
        {/* Tools are digital and not place-based: no location or remote/online fields. */}
        {!section.kind && (
          <>
        <div className="grid grid-cols-2 gap-2">
          <Field label="City" name="city">
            <input id="city" name="city" list="cities" value={city} onChange={(e) => onCity(e.target.value)} autoComplete="off" className="field" />
          </Field>
          <Field label="Country / region" name="country">
            <input id="country" name="country" list="countries" value={country} onChange={(e) => { setCountry(e.target.value); countryAuto.current = false; }} autoComplete="off" className="field" />
          </Field>
        </div>
        {extraRows.length > 0 && (
          <div className="space-y-2 sm:col-span-2">
            <span className="label">Also based in</span>
            {extraRows.map((r, i) => (
              <div key={r.id} className="flex gap-2">
                <input name="extra_city" list="cities" placeholder="City" value={r.city} onChange={(e) => onRowCity(r.id, e.target.value)} autoComplete="off" aria-label={`Other place ${i + 1} city`} className="field" />
                <input name="extra_country" list="countries" placeholder="Country / region" value={r.country} onChange={(e) => patchRow(r.id, { country: e.target.value, auto: false })} autoComplete="off" aria-label={`Other place ${i + 1} country or region`} className="field" />
                <button type="button" onClick={() => setExtraRows((rows) => rows.filter((x) => x.id !== r.id))} aria-label={`Remove other place ${i + 1}`} className="px-2 text-ink-muted hover:text-ink">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-s sm:col-span-2">
          <button type="button" onClick={() => setExtraRows((rows) => [...rows, { id: nextRowId.current++, city: "", country: "", auto: false }])} className="text-ink-muted underline hover:text-ink">
            + Add another place
          </button>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_remote" defaultChecked={initial.is_remote === true} /> Remote / online
          </label>
        </div>
          </>
        )}
        <datalist id="cities">{places.map((p) => <option key={`${p.city}-${p.country}`} value={p.city}>{p.country}</option>)}</datalist>
        <datalist id="countries">{countries.map((c) => <option key={c} value={c} />)}</datalist>
        <datalist id="tools">{tools.map((t) => <option key={t} value={t} />)}</datalist>

        {shown.map((s) => <SpecField key={namesOf(s)[0]} spec={s} values={initial} errors={errors} />)}
      </fieldset>

      <fieldset>
        <legend className="label">Disciplines</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {disciplines.map((d) => (
            <label
              key={d.slug}
              className={`cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-body-s has-[:checked]:border-ink has-[:checked]:bg-surface ${allDisciplines || selectedDisciplines.has(d.slug) ? "flex" : "hidden"}`}
            >
              <input type="checkbox" name="disciplines" value={d.slug} defaultChecked={selectedDisciplines.has(d.slug)} className="accent-[var(--accent)]" />
              {d.label}
            </label>
          ))}
          {!allDisciplines && (
            <button type="button" onClick={() => setAllDisciplines(true)} className="text-body-s text-ink-muted underline hover:text-ink">
              {selectedDisciplines.size ? "Change" : "Pick disciplines"}
            </button>
          )}
        </div>
      </fieldset>

      {more.length > 0 && (
        <details key={slug} open={moreHasError || undefined} className="border border-line px-4 py-3">
          <summary className="text-label cursor-pointer text-ink">
            Add more details <span className="text-ink-muted">(optional, {more.length} more fields)</span>
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {more.map((s) => <SpecField key={namesOf(s)[0]} spec={s} values={initial} errors={errors} />)}
          </div>
        </details>
      )}

      {mode === "add" && (
        <fieldset className="space-y-3 border-t border-line pt-6">
          {isAdmin ? (
            <label className="flex items-start gap-2 text-body-s">
              <input type="checkbox" name="publish" className="mt-1" />
              <span><strong>Publish to the Map now.</strong> Everyone can see it straight away. Leave unticked to keep it private.</span>
            </label>
          ) : (
            <label className="flex items-start gap-2 text-body-s">
              <input type="checkbox" name="suggest" className="mt-1" />
              <span><strong>Suggest to the Map.</strong> It stays private until it&apos;s reviewed and approved, then everyone can see it. You can&apos;t edit it while it&apos;s being reviewed, so check the details first.</span>
            </label>
          )}
        </fieldset>
      )}

      {state && "error" in state && <p className="text-body-s text-accent-text">{state.error}</p>}
      {state && "duplicate" in state && (
        <p className="text-body-s">
          Already on the Map: <a href={`/entry/${state.duplicate.id}`} className="underline">{state.duplicate.title}</a>. Open it to save it to your layer.
        </p>
      )}
      <div className="flex items-center gap-4">
        <button disabled={saving} className="text-label whitespace-nowrap rounded-full border border-ink bg-ink px-4 py-2 text-bg transition-colors hover:bg-transparent hover:text-ink disabled:opacity-50 px-5">
          {saving ? "Saving…" : mode === "add" ? "Save to My Layer" : "Save changes"}
        </button>
        {cancelHref && <a href={cancelHref} className="text-body-s underline">Cancel</a>}
      </div>
    </form>
  );
}
