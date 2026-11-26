import type { Metadata } from "next";
import type { ReactNode } from "react";
import { addDays } from "@/lib/dates";
import { SECTIONS } from "@/lib/types";
import { ChangeView } from "@/components/ui/ChangeView";
import { Barcode, BracketLabel, DisciplineTag, GridMark, LocationLabel, Mark, PillButton, Tag, ViewLink, Wordmark } from "@/components/ui/primitives";
import { swatchFor, TYPE_SWATCH, type Swatch } from "@/lib/swatch";
import { ENTRY_TYPES } from "@/lib/types";
import { DeadlineMark, EligibilityTag } from "@/components/ui/status";
import { IndexGroup, IndexRow } from "@/components/ui/IndexRow";
import { CatalogueCard, CatalogueRow } from "@/components/ui/CatalogueRow";
import { Card } from "@/components/ui/Card";
import { AnnotationBox, LayerStack, Specimen } from "@/components/ui/hud";
import { Accent, BentoCard, BentoGrid, BigStat, PageTitle } from "@/components/ui/layout";
import { NavBar } from "@/components/ui/NavBar";
import { BentoToggleDemo, LensToggleDemo } from "./Demos";
import { Globe } from "@/components/ui/Globe";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } };

/* -------------------------------------------------------------------------- */

const COLOURS = [
  ["--bg", "Page background"],
  ["--surface", "Cards, image grounds"],
  ["--ink", "All type"],
  ["--ink-muted", "Secondary type"],
  ["--line", "Hairlines, rules, grid"],
  ["--accent", "Shapes, lines, large type"],
  ["--accent-text", "Accent for small text"],
  ["--accent-soft", "Secondary HUD, inactive"],
  ["--on-accent", "Text on accent fills"],
  ["--grid", "Specimen grid"],
  ["--swatch-1", "Palette · fills and marks"],
  ["--swatch-2", "Palette · fills and marks"],
  ["--swatch-3", "Palette · fills and marks"],
  ["--swatch-4", "Palette · fills and marks"],
  ["--swatch-5", "Palette · fills and marks"],
  ["--on-swatch", "Text on palette fills"],
] as const;

const TYPE: { token: string; spec: string; sample: ReactNode; cls: string }[] = [
  { token: "display-xl", spec: "Black Han Sans · 160→64 · 0.88 · −0.01em", cls: "text-display-xl", sample: "Field" },
  { token: "display-l", spec: "Black Han Sans · 96→48 · 0.9 · −0.005em", cls: "text-display-l", sample: "Open calls" },
  { token: "display-m", spec: "Black Han Sans · 56→36 · 0.95", cls: "text-display-m", sample: "Programmes" },
  { token: "heading", spec: "Black Han Sans · 32→26 · 1.0", cls: "text-heading", sample: "Studios in Berlin" },
  { token: "wordmark", spec: "Black Han Sans · 24→20 · 1.1 · 0.01em", cls: "text-wordmark", sample: "Creative Technology" },
  { token: "numeral", spec: "Black Han Sans · 40→28 · 1.0 · tabular", cls: "text-numeral", sample: "28.06 · 1,204" },
  { token: "accent-l", spec: "Instrument Serif Italic · 36→28 · 1.1", cls: "text-accent-l", sample: "Where the work is, and who it’s open to." },
  { token: "accent-m", spec: "Instrument Serif Italic · 20 · 1.2", cls: "text-accent-m", sample: "A Field Guide" },
  { token: "body-l", spec: "Instrument Sans 400 · 18 · 1.5", cls: "text-body-l", sample: "A curated catalogue of studios, programmes, jobs, open calls and events in creative technology." },
  { token: "body", spec: "Instrument Sans 400 · 16 · 1.5", cls: "text-body", sample: "Residency for artists working with sensors, light and public space. Six weeks on site, with a production budget." },
  { token: "body-s", spec: "Instrument Sans 400 · 14 · 1.45", cls: "text-body-s", sample: "Two-year programme in interaction and spatial design; portfolio required." },
  { token: "nav", spec: "Instrument Sans 700 · 16 · upper · 0.01em", cls: "text-nav", sample: "Open calls" },
  { token: "label", spec: "Instrument Sans 600 · 13 · upper · 0.04em", cls: "text-label", sample: "Filter · Deadline · View" },
  { token: "tag", spec: "Instrument Sans 600 · 11 · upper · 0.06em", cls: "text-tag", sample: "Installation · 2026" },
  { token: "micro", spec: "Instrument Sans 500 wdth 85 · 10 · upper · 0.08em", cls: "text-micro", sample: "[ Core disciplines ] · 12.9716° N 77.5946° E · 21:04 IST" },
];

const NAV = [...SECTIONS.map((s) => ({ href: `/${s.slug}`, label: s.label, active: s.slug === "open-calls" })), { href: "/search", label: "Search the website", active: false }];

/* -------------------------------------------------------------------------- */

function Section({ n, title, refGroup, children }: { n: string; title: string; refGroup?: string; children: ReactNode }) {
  return (
    <section className="border-t border-ink pt-4 pb-20">
      <div className="mb-10 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-heading text-ink">
          <span className="text-micro mr-3 inline-flex items-center gap-1.5 align-middle text-ink-muted">
            <Mark swatch={(((Number(n) - 1) % 5) + 1) as Swatch} size={7} />
            {n}
          </span>
          {title}
        </h2>
        {refGroup && <BracketLabel className="text-ink-muted">Ref — {refGroup}</BracketLabel>}
      </div>
      {children}
    </section>
  );
}

function Sub({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mb-12">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h3 className="text-label text-ink">{title}</h3>
        {note && <p className="text-body-s text-ink-muted">{note}</p>}
      </div>
      {children}
    </div>
  );
}

/** Mini sample rendered in a fixed mode, so all three can be compared side by side. */
function ModeSample({ mode, name, note }: { mode: "paper" | "night" | "blueprint"; name: string; note: string }) {
  return (
    <div data-theme={mode} className="bg-specimen-grid ticks flex flex-col gap-4 border border-line p-5 text-ink">
      <div className="flex items-center justify-between">
        <BracketLabel accent>{name}</BracketLabel>
        <Barcode seed={mode} width={40} height={9} />
      </div>
      <div className="text-display-m">
        Open <Accent>calls</Accent>
      </div>
      <p className="text-body-s text-ink-muted">{note}</p>
      <div className="flex flex-wrap gap-1.5">
        <DisciplineTag name="installation" />
        <Tag tone="accent">Deadline in 18d</Tag>
        <Tag tone="solid">Closes in 3d</Tag>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-label rounded-full bg-accent px-3 py-1.5 text-on-accent">India</span>
        <span className="text-label rounded-full border border-line px-3 py-1.5 text-ink-muted">Global</span>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {["--bg", "--surface", "--line", "--accent", "--ink"].map((v) => (
          <span key={v} className="h-6 border border-line" style={{ background: `var(${v})` }} title={v} />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {SWATCHES.map((v) => (
          <span key={v} className="h-6" style={{ background: `var(${v})` }} title={v} />
        ))}
      </div>
    </div>
  );
}

const SWATCHES = ["--swatch-1", "--swatch-2", "--swatch-3", "--swatch-4", "--swatch-5"];

const TYPE_LABEL = { opportunity: "Open call", program: "Programme", job: "Job", event: "Event", organisation: "Organisation", resource: "Resource" } as const;

const DISCIPLINES = [
  "experience-design", "creative-coding", "interaction-design", "spatial-xr", "installation", "projection-mapping", "ai",
  "sound-music-tech", "generative-art", "physical-computing", "game-design", "data-visualisation", "service-design", "research",
];

/** Scattered squares, after the paper-squares reference: deterministic positions. */
function PaletteField() {
  const cells = Array.from({ length: 96 }, (_, i) => {
    let h = Math.imul(i + 1, 2654435761);
    h ^= h >>> 15;
    h = Math.imul(h, 2246822519);
    h = (h ^ (h >>> 13)) >>> 0;
    return h % 5 === 0 ? SWATCHES[(h >>> 4) % SWATCHES.length] : null;
  });
  return (
    <div className="grid grid-cols-12 gap-px border border-line bg-line sm:grid-cols-16">
      {cells.map((c, i) => (
        <div key={i} className="grid aspect-square place-items-center bg-bg">
          {c && <span className="h-1/3 w-1/3" style={{ background: `var(${c})` }} />}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export default function StyleguidePage() {
  return (
    <div className="font-[family-name:var(--font-text)] text-ink">
      <PageTitle
        kicker="Design system"
        title="Styleguide"
        meta="Tokens · type · components · from DESIGN.md"
        aside={
          <div className="ticks flex flex-col items-start gap-2 border border-line p-3">
            <span className="text-micro text-ink-muted">View the whole page in each mode</span>
            <ChangeView />
          </div>
        }
      />

      {/* 01 COLOUR ------------------------------------------------------- */}
      <Section n="01" title="Colour · three view modes" refGroup="visual direction">
        <Sub title="Side by side" note="Each panel is pinned to one mode; the rest of the page follows the View switch.">
          <div className="grid gap-4 md:grid-cols-3">
            <ModeSample mode="paper" name="Document" note="Black on white, like a printed guide. Signal red is rare: active states, urgent deadlines. Paper-square colours for fills." />
            <ModeSample mode="night" name="Monitor" note="A black instrument panel. Chartreuse for HUD details and focus; soft coral, sage, pink, cobalt, orange for tiles." />
            <ModeSample mode="blueprint" name="Blueprint" note="Monochrome blue, like a technical drawing. Accents become solid blue fills." />
          </div>
        </Sub>
        <Sub title="Tokens in the current mode">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {COLOURS.map(([v, use]) => (
              <li key={v}>
                <div className="h-16 border border-line" style={{ background: `var(${v})` }} />
                <div className="text-tag mt-2 text-ink">{v}</div>
                <div className="text-micro mt-0.5 text-ink-muted">{use}</div>
              </li>
            ))}
          </ul>
        </Sub>
        <Sub
          title="Secondary palette"
          note="Document: the paper-square colours. Monitor: the soft gradient-tile colours. Blueprint: all one blue. For fills, tiles, map dots and category marks only, never small text; text on them uses --on-swatch."
        >
          <PaletteField />
        </Sub>
        <Sub title="Type colours" note="Every entry type keeps one palette colour across the site: marks in lists, image grounds, fallback blocks, map dots. Resources stay outlined.">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ENTRY_TYPES.map((t) => {
              const sw = TYPE_SWATCH[t];
              return (
                <li key={t} className="border border-line">
                  <div className="h-14" style={{ background: sw ? `var(--swatch-${sw})` : "transparent" }} />
                  <div className="text-tag flex items-center gap-1.5 border-t border-line p-2 text-ink">
                    <Mark swatch={sw} size={7} />
                    {TYPE_LABEL[t]}
                  </div>
                </li>
              );
            })}
          </ul>
        </Sub>
        <Sub title="Deadline urgency" note="All modes: more than 30 days ink, under 30 days accent outline, under 7 days solid accent.">
          <div className="flex flex-wrap gap-2">
            <DeadlineMark date={addDays(64)} />
            <DeadlineMark date={addDays(18)} />
            <DeadlineMark date={addDays(3)} />
            <DeadlineMark date={addDays(-5)} />
            <DeadlineMark date={null} />
            <DeadlineMark date={addDays(10)} label="Starts" event />
          </div>
        </Sub>
        <Sub title="Images per mode" note="Document as is; Monitor at 90% brightness; Blueprint in blue duotone (hover to see the original).">
          <div className="grid max-w-xl grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/styleguide/sample-${i}.svg`} alt="" className="mode-img h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </Sub>
      </Section>

      {/* 02 TYPE --------------------------------------------------------- */}
      <Section n="02" title="Typography">
        <Sub title="Families" note="Three Google families, self-hosted with next/font. No monospace.">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Display", "Black Han Sans", "text-display-m", "Aa 28.06"],
              ["Accent", "Instrument Serif Italic", "text-accent-l", "as it stands"],
              ["Text and UI", "Instrument Sans 400–700, wdth 75–100", "text-body-l font-semibold", "Aa Bb 0123"],
            ].map(([role, fam, cls, s]) => (
              <div key={role} className="ticks border border-line p-5">
                <BracketLabel>{role}</BracketLabel>
                <div className={`${cls} mt-6 text-ink`}>{s}</div>
                <div className="text-micro mt-4 text-ink-muted">{fam}</div>
              </div>
            ))}
          </div>
        </Sub>

        <Sub title="Scale" note="Desktop → mobile, fluid with clamp(). Resize the window to see the display sizes move.">
          <ul>
            {TYPE.map((t) => (
              <li key={t.token} className="grid gap-x-6 gap-y-2 border-b border-line py-5 md:grid-cols-[12rem_minmax(0,1fr)]">
                <div>
                  <div className="text-tag text-ink">{t.token}</div>
                  <div className="text-micro mt-1 text-ink-muted">{t.spec}</div>
                </div>
                <div className={`${t.cls} min-w-0 break-words text-ink`}>{t.sample}</div>
              </li>
            ))}
          </ul>
        </Sub>

        <Sub title="Mixing in one line" note="The serif phrase is ~8% larger, sentence case, on the same baseline. At most once per section.">
          <p className="text-display-l text-ink">
            The field, <Accent>as it stands</Accent>
          </p>
        </Sub>

        <Sub title="The signature contrast" note="Huge display type beside tiny micro labels, with one serif phrase as the human note.">
          <div className="bg-specimen-grid relative border border-line p-6 sm:p-10">
            <div className="text-micro mb-6 flex flex-wrap justify-between gap-2 text-ink-muted">
              <BracketLabel>Core disciplines</BracketLabel>
              <span>12.9716° N · 77.5946° E</span>
            </div>
            <div className="text-display-xl text-ink">
              Reality,
              <br />
              by <Accent>design</Accent>
            </div>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <p className="text-micro max-w-[34ch] text-ink-muted">
                Experience design · creative coding · spatial XR · installation · physical computing · generative art
              </p>
              <Barcode seed="signature" />
            </div>
          </div>
        </Sub>
      </Section>

      {/* 03 PRIMITIVES --------------------------------------------------- */}
      <Section n="03" title="Primitives">
        <div className="grid gap-x-12 md:grid-cols-2">
          <Sub title="Tags" note="Disciplines carry a stable palette mark; tint chips for highlighted kinds.">
            <div className="flex flex-wrap gap-1.5">
              {DISCIPLINES.map((d) => (
                <DisciplineTag key={d} name={d} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Tag tone="tint" swatch={1}>Residency</Tag>
              <Tag tone="tint" swatch={2}>Masters</Tag>
              <Tag tone="tint" swatch={3}>Full time</Tag>
              <Tag tone="tint" swatch={4}>Festival</Tag>
              <Tag tone="tint" swatch={5}>Studio</Tag>
              <Tag>Residency</Tag>
              <Tag tone="accent">Accent</Tag>
              <Tag tone="solid">Solid</Tag>
              <Tag tone="muted">Muted</Tag>
            </div>
          </Sub>
          <Sub title="Eligibility (place lens)">
            <div className="flex flex-wrap gap-1.5">
              <EligibilityTag relevance="based_in" place="India" />
              <EligibilityTag relevance="open_to" place="India" />
              <EligibilityTag relevance="unknown" place="India" />
              <EligibilityTag relevance="not_open" place="India" />
            </div>
          </Sub>
          <Sub title="Pill buttons">
            <div className="flex flex-wrap items-center gap-2">
              <PillButton variant="primary" size="nav">Save</PillButton>
              <PillButton size="nav">Drop a URL</PillButton>
              <PillButton variant="primary">Apply</PillButton>
              <PillButton>Filter</PillButton>
              <PillButton variant="ghost">Clear</PillButton>
              <PillButton disabled>Disabled</PillButton>
            </div>
          </Sub>
          <Sub title="Lens toggle" note="Active option: solid accent fill.">
            <LensToggleDemo />
          </Sub>
          <Sub title="HUD details">
            <div className="flex flex-wrap items-center gap-5">
              <BracketLabel>Core disciplines</BracketLabel>
              <BracketLabel accent>Deadline</BracketLabel>
              <BracketLabel mark={2}>Programme</BracketLabel>
              <LocationLabel>Bengaluru, IN</LocationLabel>
              <LocationLabel>Remote</LocationLabel>
              <Barcode />
              <GridMark />
            </div>
          </Sub>
          <Sub title="Links and wordmark">
            <div className="flex flex-wrap items-center gap-6">
              <ViewLink href="/styleguide">View</ViewLink>
              <ViewLink href="/styleguide">View all</ViewLink>
              <Wordmark href="/styleguide" />
            </div>
          </Sub>
        </div>
      </Section>

      {/* 04 NAV ---------------------------------------------------------- */}
      <Section n="04" title="Navigation" refGroup="figma nav">
        <Sub title="Top bar" note="Quiet top strip (CHANGE VIEW left, account links right); wordmark with the lens and URL drop as the main row; sections below with search at the far right.">
          <div className="border border-line px-4 sm:px-6">
            <NavBar
              nav={NAV.map((i) => (
                <a
                  key={i.label}
                  href={i.href}
                  aria-current={i.active ? "page" : undefined}
                  className={`text-nav-s whitespace-nowrap border-b-2 pb-5 text-ink max-lg:border-b-0 max-lg:border-l-2 max-lg:py-3 max-lg:pl-3 ${i.active ? "border-accent" : "border-transparent hover:border-line"}`}
                >
                  {i.label}
                </a>
              ))}
              utility={<><span>My Layer</span><span>Review queue</span><span>Sign out</span></>}
              lens={<LensToggleDemo />}
              actions={<PillButton variant="primary">+ Drop URL</PillButton>}
            />
            <div className="h-6" />
          </div>
        </Sub>
      </Section>

      {/* 05 INDEX -------------------------------------------------------- */}
      <Section n="05" title="Index table" refGroup="knowledge publication">
        <Sub title="Time-based items" note="Open calls, events, jobs, programme deadlines. Date column, title and tags, description and meta, thumbnail.">
          <div className="flex flex-col gap-14">
            <IndexGroup title="Closing this month" period={new Date().getFullYear()} swatch={1}>
              <IndexRow
                date={addDays(3)}
                href="/styleguide"
                swatch={TYPE_SWATCH.opportunity}
                kicker="Sample · Lumen Foundation"
                title="Light and Public Space Residency"
                description="Six-week residency for artists working with light, sensors and public space. Production budget and travel included."
                tags={<><Tag tone="tint" swatch={TYPE_SWATCH.opportunity!}>Residency</Tag><DisciplineTag name="installation" /></>}
                status={<DeadlineMark date={addDays(3)} />}
                meta={<><EligibilityTag relevance="open_to" place="India" /><LocationLabel>Linz, AT</LocationLabel></>}
                image="/styleguide/sample-1.svg"
              />
              <IndexRow
                date={addDays(18)}
                href="/styleguide"
                swatch={TYPE_SWATCH.program}
                kicker="Sample · Rhine School of Design"
                title="MA Interaction Design · Round 1"
                description="First application round for the two-year programme. Portfolio and statement required."
                tags={<><Tag tone="tint" swatch={TYPE_SWATCH.program!}>Masters</Tag><DisciplineTag name="interaction-design" /></>}
                status={<DeadlineMark date={addDays(18)} />}
                meta={<><EligibilityTag relevance="unknown" place="India" /><LocationLabel>Rotterdam, NL</LocationLabel></>}
                image="/styleguide/sample-2.svg"
              />
              <IndexRow
                date={addDays(26)}
                href="/styleguide"
                swatch={TYPE_SWATCH.job}
                kicker="Sample · Studio Kiln"
                title="Creative Technologist, Spatial"
                description="Prototype mixed-reality installations with the studio’s design team."
                tags={<><Tag tone="tint" swatch={TYPE_SWATCH.job!}>Full time</Tag><DisciplineTag name="spatial-xr" /></>}
                status={<DeadlineMark date={addDays(26)} />}
                meta={<><EligibilityTag relevance="based_in" place="India" /><LocationLabel>Bengaluru, IN</LocationLabel></>}
              />
            </IndexGroup>
            <IndexGroup title="Upcoming" period={new Date().getFullYear() + 1}>
              <IndexRow
                date={addDays(64)}
                href="/styleguide"
                swatch={TYPE_SWATCH.opportunity}
                kicker="Sample · New Media Fund"
                title="Research Fellowship in Sound and Machine Listening"
                description="Twelve-month fellowship with a stipend; open worldwide."
                tags={<><Tag tone="tint" swatch={TYPE_SWATCH.opportunity!}>Fellowship</Tag><DisciplineTag name="sound-music-tech" /></>}
                status={<DeadlineMark date={addDays(64)} />}
                meta={<><EligibilityTag relevance="open_to" place="India" /><LocationLabel>Remote</LocationLabel></>}
              />
              <IndexRow
                date={addDays(80)}
                href="/styleguide"
                swatch={TYPE_SWATCH.event}
                kicker="Sample · Open Signal Festival"
                title="Open Signal 2027"
                description="Four days of interactive and generative work across the city."
                tags={<><Tag tone="tint" swatch={TYPE_SWATCH.event!}>Festival</Tag><DisciplineTag name="generative-art" /></>}
                status={<DeadlineMark date={addDays(80)} label="Starts" event />}
                meta={<LocationLabel>Rotterdam, NL</LocationLabel>}
                image="/styleguide/sample-4.svg"
              />
            </IndexGroup>
            <IndexGroup title="Past" period={new Date().getFullYear() - 1}>
              <IndexRow
                date={addDays(-40)}
                href="/styleguide"
                swatch={TYPE_SWATCH.opportunity}
                kicker="Sample · Harbour Arts"
                title="Projection Mapping Open Call"
                description="Closed. Kept for reference until next cycle."
                tags={<DisciplineTag name="projection-mapping" />}
                status={<DeadlineMark date={addDays(-40)} />}
                meta={<LocationLabel>Melbourne, AU</LocationLabel>}
                image="/styleguide/sample-3.svg"
                muted
              />
            </IndexGroup>
          </div>
        </Sub>
      </Section>

      {/* 06 CATALOGUE ---------------------------------------------------- */}
      <Section n="06" title="Catalogue row" refGroup="knowledge publication">
        <CatalogueRow title="Studios in Berlin" description="Sample studios and labs that hire design technologists." href="/styleguide" swatch={TYPE_SWATCH.organisation}>
          <CatalogueCard href="/styleguide" title="Studio Parallax" swatch={swatchFor("Studio Parallax")} image="/styleguide/sample-1.svg" label="Studio" caption="Installation · 20–50" />
          <CatalogueCard href="/styleguide" title="Halbton Lab" swatch={swatchFor("Halbton Lab")} image="/styleguide/sample-2.svg" label="Lab" caption="Sound · research" />
          <CatalogueCard href="/styleguide" title="Formwerk" swatch={swatchFor("Formwerk")} image="/styleguide/sample-3.svg" label="Studio" caption="Spatial XR · 10–20" />
          <CatalogueCard href="/styleguide" title="Kollektiv Null" swatch={swatchFor("Kollektiv Null")} label="Collective" caption="Creative coding" />
        </CatalogueRow>
        <CatalogueRow title="Master’s programmes in Europe" description="Two-year and one-year programmes with portfolio entry." href="/styleguide" swatch={TYPE_SWATCH.program}>
          <CatalogueCard href="/styleguide" title="MA Interaction Design" swatch={swatchFor("MA Interaction Design")} image="/styleguide/sample-4.svg" label="Masters" caption="24 months · in person" />
          <CatalogueCard href="/styleguide" title="MSc Creative Computing" swatch={swatchFor("MSc Creative Computing")} image="/styleguide/sample-2.svg" label="Masters" caption="12 months · hybrid" />
          <CatalogueCard href="/styleguide" title="MA Spatial Media" swatch={swatchFor("MA Spatial Media")} image="/styleguide/sample-3.svg" label="Masters" caption="24 months · in person" />
        </CatalogueRow>
      </Section>

      {/* 07 CARDS -------------------------------------------------------- */}
      <Section n="07" title="Card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            href="/styleguide"
            title="Signal Garden"
            kicker="Studio"
            swatch={TYPE_SWATCH.organisation}
            location="Mumbai, IN"
            description="Sample studio making interactive installations for museums and public space."
            image="/styleguide/sample-3.svg"
            tags={<><DisciplineTag name="installation" /><DisciplineTag name="physical-computing" /></>}
            eligibility={<EligibilityTag relevance="based_in" place="India" />}
          />
          <Card
            href="/styleguide"
            title="Creative Technologist"
            kicker="Job · Mid"
            swatch={TYPE_SWATCH.job}
            location="Remote"
            description="Prototype interactive experiences with TouchDesigner and Unity."
            image="/styleguide/sample-2.svg"
            tags={<><DisciplineTag name="TouchDesigner" /><DisciplineTag name="Unity" /></>}
            status={<DeadlineMark date={addDays(12)} label="Closes" />}
            eligibility={<EligibilityTag relevance="open_to" place="India" />}
          />
          <Card
            href="/styleguide"
            title="Summer School in Generative Systems"
            kicker="Programme"
            swatch={TYPE_SWATCH.program}
            location="Barcelona, ES"
            description="Two weeks of workshops on generative and computational design."
            tags={<DisciplineTag name="generative-art" />}
            status={<DeadlineMark date={addDays(5)} />}
            eligibility={<EligibilityTag relevance="unknown" place="India" />}
          />
        </div>
      </Section>

      {/* 08 SPECIMEN ----------------------------------------------------- */}
      <Section n="08" title="Specimen and annotation" refGroup="visual direction">
        <Sub title="Annotation box">
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <AnnotationBox
              title="Deadline"
              barcode="a1"
              swatch={1}
              rows={[
                { label: "Closes", value: "28.06.2026" },
                { label: "Source", value: "“Applications close 28 June”" },
              ]}
            />
            <AnnotationBox
              title="Eligibility"
              swatch={3}
              rows={[
                { label: "Open to", value: "Worldwide" },
                { label: "Fee", value: "None" },
                { label: "Travel", value: "Covered" },
              ]}
            />
          </div>
        </Sub>
        <Sub title="Specimen with leader lines" note="Home hero (the world map), entry detail (the entry’s image), map. Boxes stack below on small screens.">
          <Specimen
            label="The field · global"
            coords="20.5937° N · 78.9629° E"
            timeZone="Asia/Kolkata"
            annotations={[
              {
                id: "loc",
                swatch: 5,
                anchor: { x: 57, y: 47 },
                to: { x: 80, y: 30 },
                box: { x: 74, y: 10, w: 22 },
                content: <AnnotationBox title="Location" swatch={5} rows={[{ label: "City", value: "Bengaluru" }, { label: "Country", value: "India" }]} />,
              },
              {
                id: "disc",
                swatch: 2,
                anchor: { x: 47, y: 31 },
                to: { x: 22, y: 22 },
                via: { x: 22, y: 31 },
                box: { x: 4, y: 12, w: 22 },
                content: <AnnotationBox title="Core disciplines" swatch={2} rows={[{ label: "01", value: "Installation" }, { label: "02", value: "Creative coding" }]} />,
              },
              {
                id: "dead",
                swatch: 1,
                anchor: { x: 40, y: 36 },
                to: { x: 20, y: 70 },
                box: { x: 4, y: 68, w: 24 },
                content: (
                  <AnnotationBox title="Deadline" barcode="dl" swatch={1}>
                    <DeadlineMark date={addDays(5)} />
                  </AnnotationBox>
                ),
              },
            ]}
          >
            <Globe />
          </Specimen>
        </Sub>
        <Sub title="Exploded layers" note="Explains the Map (shared) at the bottom and My Layer (private) above it.">
          <LayerStack
            layers={[
              { label: "The Map", note: "Public, reviewed catalogue", swatch: 2 },
              { label: "Lens", note: "Global, or any place", swatch: 4 },
              { label: "My Layer", note: "Saves, notes, applications", active: true },
            ]}
          />
        </Sub>
      </Section>

      {/* 09 BENTO -------------------------------------------------------- */}
      <Section n="09" title="Bento" refGroup="bento box · Insights and My Layer home only">
        <BentoGrid>
          <BentoCard className="col-span-2 row-span-2" tone="glass">
            <div className="flex items-start justify-between gap-2">
              <span className="text-micro opacity-70">This week</span>
              <BentoToggleDemo />
            </div>
            <div className="mt-auto">
              <div className="text-display-xl">12</div>
              <p className="text-accent-m mt-2 text-ink-muted">deadlines you’re watching</p>
            </div>
          </BentoCard>
          <BentoCard tone="swatch" swatch={1}>
            <BigStat value="48" label="Open calls" note="Open to India" />
          </BentoCard>
          <BentoCard tone="swatch" swatch={4}>
            <BigStat value="3" label="Applying" />
          </BentoCard>
          <BentoCard tone="swatch" swatch={2}>
            <BigStat value="7" label="Interviewing" />
          </BentoCard>
          <BentoCard tone="swatch" swatch={3}>
            <BigStat value="21" label="Saved" />
          </BentoCard>
          <BentoCard className="col-span-2">
            <BigStat value="1,204" label="Entries on the Map" note="Across 61 cities" />
          </BentoCard>
          <BentoCard tone="ink" className="col-span-2">
            <BigStat value="5" label="Closing this week" />
          </BentoCard>
        </BentoGrid>
      </Section>

      {/* 10 MOTION ------------------------------------------------------- */}
      <Section n="10" title="Motion">
        <p className="text-body max-w-prose text-ink-muted">
          Leader lines draw in, annotation boxes fade up, list rows reveal with a slight stagger (<code className="text-tag">anim-draw</code>,{" "}
          <code className="text-tag">anim-fade-up</code>, <code className="text-tag">anim-stagger</code>). Mode changes fade colours over 300ms. All of it
          switches off under reduced motion.
        </p>
      </Section>
    </div>
  );
}
