import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeadlineChip, EligibilityBadge, dateLabelFor, locationLabel } from "@/components/Badges";
import { AnnotationBox } from "@/components/ui/hud";
import { Barcode, BracketLabel, DisciplineTag, LocationLabel, Mark, PillLink, Tag } from "@/components/ui/primitives";
import { Thumb } from "@/components/ui/Thumb";
import { entrySwatch } from "@/lib/swatch";
import EntryList from "@/components/EntryList";
import EntryActions from "@/components/EntryActions";
import { getCurrentUser } from "@/lib/db/profiles";
import { getUserState, isAdmin } from "@/lib/db/mylayer";
import { getEntriesByIds, getEntry, getFxTable, getRelatedEntries, getToolResources } from "@/lib/db/entries";
import { formatDate } from "@/lib/dates";
import { entryJsonLd, isIndexable, jsonLdScript, SITE_NAME } from "@/lib/seo";
import { entryPicture } from "@/lib/icon";
import { resolveLens } from "@/lib/lens-server";
import { approxIn, formatMoney, isMoney, type FxTable } from "@/lib/money";
import { humanize, isTool, KINDS, sectionForEntry, type Entry, type Lens } from "@/lib/types";

type Fact = [label: string, value: React.ReactNode];

const yesNo = (v: unknown) => (v === true || v === "yes" ? "Yes" : v === false || v === "no" ? "No" : v == null || v === "unknown" ? null : String(v));
const listOf = (v: unknown) => (Array.isArray(v) && v.length ? v.join(", ") : null);
const str = (v: unknown) => (typeof v === "string" && v ? humanize(v) : null);

function money(v: unknown, lens: Lens, fx: FxTable): string | null {
  if (!isMoney(v)) return null;
  const orig = `${formatMoney(v)}${v.per ? ` per ${v.per}` : ""}`;
  const conv = approxIn(v, lens.currency, fx);
  return conv ? `${orig} (${conv})` : orig;
}

function facts(e: Entry, lens: Lens, fx: FxTable, linked: Record<string, Entry>): Fact[] {
  const d = e.data;
  const link = (id: unknown) => {
    const o = typeof id === "string" ? linked[id] : undefined;
    return o ? <Link href={`/entry/${o.id}`} className="underline">{o.title.replace(/^\[Demo\]\s*/, "")}</Link> : null;
  };
  switch (e.type) {
    case "organisation":
      return [
        ["Kind", str(d.org_kind)],
        ["Size", str(d.size)],
        ["Hires design technologists", d.hires_design_technologists == null ? null : yesNo(d.hires_design_technologists)],
        ["Careers", typeof d.careers_url === "string" ? <a href={d.careers_url} className="underline" rel="noopener">{d.careers_url}</a> : null],
        ["Instagram", typeof d.instagram === "string" ? <a href={`https://instagram.com/${d.instagram}`} className="underline" rel="noopener">@{d.instagram}</a> : null],
        ["Notable projects", listOf(d.notable_projects)],
      ];
    case "program": {
      const deadlines = (Array.isArray(d.application_deadlines) ? d.application_deadlines : []) as { round?: string; date?: string; source_text?: string }[];
      const scholarships = (Array.isArray(d.scholarships) ? d.scholarships : []) as { name: string; url?: string; open_worldwide?: boolean; eligible_countries?: string[] }[];
      return [
        ["Institution", link(d.institution_id)],
        ["Type", str(d.program_kind)],
        ["Degree", d.degree_name as string],
        ["Duration", d.duration_months ? `${d.duration_months} months` : null],
        ["Mode", str(d.mode)],
        ["Language", d.language as string],
        ["Tuition", money(d.tuition, lens, fx)],
        ["Intake", d.intake_month as string],
        ["Portfolio required", d.portfolio_required == null ? null : yesNo(d.portfolio_required)],
        ["Admission requirements", d.admission_requirements as string],
        [
          "Application rounds",
          deadlines.length ? (
            <ul className="space-y-1">
              {deadlines.map((r, i) => (
                <li key={i}>
                  {r.round ? `${r.round}: ` : ""}
                  {r.date ? formatDate(r.date) : "date unknown"}
                  {r.source_text && <q className="text-body-s block text-ink-muted">{r.source_text}</q>}
                </li>
              ))}
            </ul>
          ) : null
        ],
        [
          "Scholarships",
          scholarships.length ? (
            <ul>
              {scholarships.map((s, i) => (
                <li key={i}>
                  {s.url ? <a href={s.url} className="underline" rel="noopener">{s.name}</a> : s.name}
                  {s.open_worldwide ? <Tag tone="accent" className="ml-2">Open worldwide</Tag> : null}
                  {s.eligible_countries?.length ? <span className="text-body-s ml-2 text-ink-muted">For applicants from {s.eligible_countries.join(", ")}</span> : null}
                </li>
              ))}
            </ul>
          ) : null,
        ],
        ["Notable alumni / faculty", listOf(d.notable_alumni_or_faculty)],
        ["Curriculum", listOf(d.curriculum_tags)],
      ];
    }
    case "job": {
      const s = d.salary as { min?: number; max?: number; currency?: string; period?: string } | null;
      const salary =
        s?.currency && (s.min != null || s.max != null)
          ? [s.min, s.max].filter((x) => x != null).map((a) => money({ amount: a!, currency: s.currency! }, lens, fx)).join(" – ") + (s.period ? ` per ${s.period}` : "")
          : null;
      return [
        ["Organisation", link(d.organisation_id)],
        ["Role", d.role_title as string],
        ["Seniority", str(d.seniority)],
        ["Employment", str(d.employment)],
        ["Work mode", str(d.work_mode)],
        ["Remote from", listOf(d.remote_regions)],
        ["Visa sponsorship", yesNo(d.visa_sponsorship)],
        ["Salary", salary],
        ["Posted", typeof d.posted_at === "string" ? formatDate(d.posted_at) : null],
        ["Skills", listOf(d.skills)],
      ];
    }
    case "opportunity":
      return [
        ["Organisation", link(d.organisation_id)],
        ["Type", str(d.opp_kind)],
        ["Deadline", typeof d.deadline === "string" ? formatDate(d.deadline) : null],
        ["Deadline wording", d.deadline_source_text ? <q>{String(d.deadline_source_text)}</q> : null],
        ["Open worldwide", d.open_worldwide == null ? null : yesNo(d.open_worldwide)],
        ["Eligible countries", listOf(d.eligibility_countries)],
        ["Not eligible", listOf(d.ineligible_countries)],
        ["Entry fee", d.fee == null || d.fee === "unknown" ? null : d.fee === "none" ? "None" : String(d.fee)],
        ["Stipend / budget", d.stipend_or_budget as string],
        ["Travel covered", d.travel_covered == null ? null : yesNo(d.travel_covered)],
      ];
    case "resource":
      return [
        ["Format", isTool(e) ? null : str(d.resource_kind)],
        ["For tool", link(d.tool_id)],
        [isTool(e) ? "Made by" : "Author", d.author as string],
        ["Publisher", d.publisher as string],
        ["Frequency", d.frequency as string],
        ["Free", d.is_free == null ? null : yesNo(d.is_free)],
      ];
    case "event":
      return [
        ["Type", str(d.event_kind)],
        ["Dates", typeof d.start_date === "string" ? `${formatDate(d.start_date)}${typeof d.end_date === "string" ? ` – ${formatDate(d.end_date)}` : ""}` : d.recurring ? "Recurring; dates vary" : null],
        ["Venue", d.venue as string],
        ["Recurring", d.recurring == null ? null : yesNo(d.recurring)],
        ["Organiser", link(d.organisation_id)],
        ["Open call", link(d.submission_opportunity_id)],
      ];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const e = await getEntry((await params).id);
  if (!e) return { title: "Not found", robots: { index: false } };
  const title = e.title.replace(/^\[Demo\]\s*/, "");
  const description = e.summary ?? `${sectionForEntry(e).singular}${locationLabel(e) ? ` · ${locationLabel(e)}` : ""} on the ${SITE_NAME}.`;
  return {
    title,
    description,
    alternates: { canonical: `/entry/${e.id}` },
    robots: isIndexable(e) ? undefined : { index: false, follow: false },
    openGraph: { type: "article", title, description, url: `/entry/${e.id}`, images: e.image_url ? [{ url: e.image_url }] : undefined },
    twitter: { card: e.image_url ? "summary_large_image" : "summary", title, description, images: e.image_url ? [e.image_url] : undefined },
  };
}

export default async function EntryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lens?: string; added?: string; edited?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const e = await getEntry(id);
  if (!e) notFound();
  const lens = await resolveLens(sp.lens);
  const d = e.data;
  const linkIds = [d.organisation_id, d.institution_id, d.submission_opportunity_id, d.tool_id].filter((x): x is string => typeof x === "string");
  const [fx, linked, related, user, userState, admin] = await Promise.all([
    getFxTable(),
    getEntriesByIds(linkIds),
    e.type === "organisation" ? getRelatedEntries(e.id) : isTool(e) ? getToolResources(e.id) : Promise.resolve([]),
    getCurrentUser(),
    getUserState(e.id),
    isAdmin(),
  ]);
  const section = sectionForEntry(e);
  const dateLabel = dateLabelFor(e.type);
  const applyUrl = (typeof d.apply_url === "string" && d.apply_url) || e.url;
  const programInstitution = e.type === "program" && typeof d.institution_id === "string" ? linked[d.institution_id]?.title.replace(/^\[Demo\]\s*/, "") : undefined;
  const rows = facts(e, lens, fx, linked).filter(([, v]) => v != null && v !== "");
  const isPublic = e.visibility === "public" && e.status === "approved";

  const swatch = entrySwatch(e);
  const pic = entryPicture(e);
  const kind = (() => {
    const v = d[KINDS[e.type].field];
    return typeof v === "string" ? humanize(v) : null;
  })();
  const endDate = typeof d.end_date === "string" ? d.end_date : null;
  const notice = "text-body-s mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 border border-line bg-surface px-4 py-3 text-ink";

  return (
    <>
      {isPublic && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(entryJsonLd(e, linked)) }} />}
    <article>
      {sp.added && (
        <p className={notice}>
          <Mark swatch={swatch} size={7} />
          Saved to your layer.{" "}
          {e.status === "pending_review" ? "It's waiting for review." : e.visibility === "public" ? "It's live on the Map." : admin ? "It's private. Publish it to the Map whenever you're ready." : "It's private. Suggest it to the Map whenever you're ready."}{" "}
          {(admin || e.visibility === "private") && <><Link href={`/entry/${e.id}/edit`} className="underline underline-offset-4">Edit details</Link> · </>}
          <Link href="/add" className="underline underline-offset-4">Add another</Link>
        </p>
      )}
      {sp.edited && (
        <p className={notice}>
          <Mark swatch={swatch} size={7} />
          Changes saved.
        </p>
      )}
      {e.visibility === "private" && e.owner_id === user?.id ? (
        <Link href="/me" className="text-label text-ink-muted hover:text-ink">← My Layer</Link>
      ) : (
        <Link href={`/${section.slug}?lens=${lens.slug}`} className="text-label text-ink-muted hover:text-ink">← {section.label}</Link>
      )}

      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,46rem)_minmax(0,22rem)] lg:gap-16 xl:gap-24">
        {/* MAIN ---------------------------------------------------------- */}
        <div className="min-w-0">
          <p className="text-micro flex items-center gap-1.5 text-ink-muted">
            <Mark swatch={swatch} size={7} />
            {[section.singular, kind].filter(Boolean).join(" · ")}
          </p>
          <h1 className="text-display-m mt-4 break-words text-ink">{(programInstitution ?? e.title).replace(/^\[Demo\]\s*/, "")}</h1>
          {programInstitution && <p className="text-heading mt-3 text-ink-muted">{e.title.replace(/^\[Demo\]\s*/, "")}</p>}
          {locationLabel(e, { all: true }) && <LocationLabel className="mt-4">{locationLabel(e, { all: true })}</LocationLabel>}

          <div className="mt-6 flex flex-wrap gap-1.5">
            {dateLabel && <DeadlineChip date={e.key_date} label={dateLabel} event={e.type === "event"} endDate={endDate} />}
            <EligibilityBadge entry={e} lens={lens} />
            {!isPublic && <Tag tone="muted">{e.visibility === "private" ? "Private" : ""} {humanize(e.status)}</Tag>}
            {e.title.startsWith("[Demo]") && <Tag tone="muted">Demo</Tag>}
            {e.disciplines.map((t) => (
              <Link key={t} href={`/${section.slug}?discipline=${t}&lens=${lens.slug}`} className="transition-opacity hover:opacity-70">
                <DisciplineTag name={t} label={humanize(t)} />
              </Link>
            ))}
          </div>

          {e.summary && <p className="text-body-l mt-8 text-ink">{e.summary}</p>}

          <div className="mt-8 flex flex-wrap items-start gap-3">
            {applyUrl && (
              <a href={applyUrl} rel="noopener" target="_blank" className="text-label inline-flex items-center rounded-full border border-ink bg-ink px-4 py-2 text-bg transition-colors hover:bg-transparent hover:text-ink">
                {e.type === "job" || e.type === "opportunity" ? "Apply / read the call ↗" : "Visit site ↗"}
              </a>
            )}
            <EntryActions
              entryId={e.id}
              signedIn={!!user}
              saved={userState?.saved ?? false}
              isOwner={!!user && e.owner_id === user.id}
              isAdmin={admin}
              status={e.status}
              visibility={e.visibility}
            />
          </div>

          {rows.length > 0 && (
            <dl className="mt-12 grid grid-cols-1 border-t border-ink sm:grid-cols-[12rem_minmax(0,1fr)]">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-micro border-line pt-4 text-ink-muted sm:border-b sm:py-4">{k}</dt>
                  <dd className="text-body-s border-b border-line pt-1 pb-4 break-words text-ink sm:py-4">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="text-micro mt-6 text-ink-muted">
            {e.last_verified_at ? `Link last checked ${formatDate(e.last_verified_at)}. ` : ""}
            Added {formatDate(e.created_at)}. Details may change; always confirm on the source page.
          </p>
        </div>

        {/* SPECIMEN PANEL (visual-direction reference) -------------------- */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="ticks bg-specimen-grid border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <BracketLabel mark={swatch}>{section.singular}</BracketLabel>
              <Barcode seed={e.id} width={48} height={10} />
            </div>
            <Thumb src={pic.src} title={e.title.replace(/^\[Demo\]\s*/, "")} fit={pic.fit === "icon" ? "icon" : "cover"} swatch={swatch} className="aspect-square w-full" />
            <div className="mt-4 flex flex-col gap-3">
              {dateLabel && (
                <AnnotationBox title={dateLabel} swatch={1}>
                  <DeadlineChip date={e.key_date} label={dateLabel} event={e.type === "event"} endDate={endDate} />
                </AnnotationBox>
              )}
              {!isTool(e) && (e.city || e.country || e.is_remote) && (
                <AnnotationBox
                  title="Location"
                  swatch={5}
                  rows={[
                    ...(e.city ? [{ label: "City", value: e.city }] : []),
                    ...(e.country ? [{ label: "Country", value: e.country }] : []),
                    ...(e.is_remote ? [{ label: "Remote", value: "Yes" }] : []),
                  ]}
                />
              )}
              {lens.kind !== "global" && !isTool(e) && (
                <AnnotationBox title={`Lens — ${lens.label}`} swatch={2}>
                  <EligibilityBadge entry={e} lens={lens} />
                </AnnotationBox>
              )}
              {e.disciplines.length > 0 && (
                <AnnotationBox title="Core disciplines" swatch={3} rows={e.disciplines.map((t, i) => ({ label: String(i + 1).padStart(2, "0"), value: humanize(t) }))} />
              )}
            </div>
          </div>
        </aside>
      </div>

      {isTool(e) && (
        <section className="mt-20 max-w-[46rem]">
          {/* The list draws the section's one rule (its top border), so the heading has none of its own. */}
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <h2 className="text-heading text-ink">Libraries &amp; resources for {e.title}</h2>
            {user && (
              <PillLink href={`/add?tool=${encodeURIComponent(e.title)}`} className="shrink-0">
                + Add one
              </PillLink>
            )}
          </div>
          <div className="mt-4">
            <EntryList entries={related} lens={lens} fx={fx} empty={<>Nothing linked yet. When you add a library, tutorial or community, choose {e.title} under &ldquo;For tool&rdquo;.</>} />
          </div>
        </section>
      )}
      {!isTool(e) && related.length > 0 && (
        <section className="mt-20 max-w-[46rem]">
          <h2 className="text-heading text-ink">At {e.title}</h2>
          <div className="mt-4"><EntryList entries={related} lens={lens} fx={fx} /></div>
        </section>
      )}
    </article>
    </>
  );
}
