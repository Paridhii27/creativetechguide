import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Black_Han_Sans, Instrument_Serif, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { SECTIONS } from "@/lib/types";
import { cookieLens, getGeoCached } from "@/lib/lens-server";
import { getCurrentUser } from "@/lib/db/profiles";
import { myLayerCount } from "@/lib/db/mylayer";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import LensSwitch from "@/components/LensSwitch";
import NavLink from "@/components/NavLink";
import NavSearch from "@/components/NavSearch";
import GlobalDrop from "@/components/GlobalDrop";
import { DuotoneFilters } from "@/components/ui/DuotoneFilters";
import { NavBar } from "@/components/ui/NavBar";
import { PillLink } from "@/components/ui/primitives";
import { VIEW_MODE_SCRIPT } from "@/lib/theme";
import { Analytics } from "@vercel/analytics/next";
import { jsonLdScript, SITE_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/seo";

// The only three families on the site (DESIGN.md).
const blackHanSans = Black_Han_Sans({ subsets: ["latin"], weight: "400", variable: "--font-black-han-sans", display: "swap" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-instrument-serif", display: "swap" });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], axes: ["wdth"], variable: "--font-instrument-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_NAME, template: "%s · Field Guide" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["creative technology", "experience design", "creative coding", "interaction design", "open calls", "residencies", "design technologist jobs", "creative technology masters"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION, url: "/", locale: "en" },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  // Paste the code from Google Search Console / Bing Webmaster Tools (HTML tag method) into these env vars.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: siteUrl(),
  potentialAction: { "@type": "SearchAction", target: `${siteUrl()}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
};

/** Account pill in the top strip, matching the view-mode switch beside it (outlined, tag-size text, small icon). */
const ACCOUNT_PILL =
  "text-tag inline-flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3 text-ink transition-colors hover:border-ink";

function UserIcon() {
  return (
    <svg aria-hidden viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" className="h-3.5 w-3.5 shrink-0">
      <circle cx="7" cy="7" r="6.375" strokeOpacity="0.35" />
      <circle cx="7" cy="5.5" r="2" />
      <path d="M3.4 11.2c.7-1.6 2-2.4 3.6-2.4s2.9.8 3.6 2.4" strokeLinecap="round" />
    </svg>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lens, geo, user, layerCount] = await Promise.all([cookieLens(), getGeoCached(), getCurrentUser(), myLayerCount()]);
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${blackHanSans.variable} ${instrumentSerif.variable} ${instrumentSans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: VIEW_MODE_SCRIPT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(WEBSITE_JSON_LD) }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <DuotoneFilters />
        <header>
          <div className="page-width">
            <NavBar
              lens={
                <Suspense fallback={<div className="h-8 w-44" />}>
                  <LensSwitch fallback={lens.slug} geo={geo} />
                </Suspense>
              }
              // Your own things, grouped tight; the wider gap before them separates them from the lens.
              actions={
                <>
                  <PillLink className="h-8 flex-1 whitespace-nowrap py-0!" href={user ? "/me" : "/login?next=/me"} title="Your saves, your own entries and what you've suggested to the Map">
                    My Layer
                    {user && layerCount > 0 && <span className="text-tag -mr-1 rounded-full bg-accent px-1.5 py-px text-on-accent">{layerCount}</span>}
                  </PillLink>
                  {/* Adding links is for signed-in users only, so signed-out visitors don't get a button that just leads to sign in. */}
                  {user && (
                    <Link
                      href="/add"
                      aria-label="Add a link"
                      title="Add a link (press N, or paste or drop a link anywhere)"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink bg-ink text-bg transition-colors hover:bg-transparent hover:text-ink"
                    >
                      <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="h-3.5 w-3.5">
                        <path d="M8 2.5v11M2.5 8h11" />
                      </svg>
                    </Link>
                  )}
                </>
              }
              utility={
                user ? (
                  <form action="/auth/signout" method="post" className="contents">
                    <button className={ACCOUNT_PILL} title={user.email ? `Signed in as ${user.email}` : undefined}>
                      <UserIcon />
                      Sign out
                    </button>
                  </form>
                ) : (
                  <Link href="/login" className={ACCOUNT_PILL}>
                    <UserIcon />
                    Sign in
                  </Link>
                )
              }
              search={
                <Suspense fallback={<div className="h-9 w-full max-lg:order-3 max-lg:mt-5 max-lg:ml-3 max-lg:h-10 max-lg:w-10" />}>
                  <NavSearch />
                </Suspense>
              }
              nav={
                <Suspense>
                  {SECTIONS.map((s) => (
                    <NavLink key={s.slug} href={`/${s.slug}`}>{s.label}</NavLink>
                  ))}
                </Suspense>
              }
            />
          </div>
        </header>
        {!isSupabaseConfigured() && (
          <div className="border-b border-line bg-surface">
            <p className="text-body-s page-width py-2 text-ink-muted">
              Supabase isn&apos;t configured, so the catalogue is empty. Copy <code>.env.example</code> to <code>.env.local</code> and follow the README.
            </p>
          </div>
        )}
        {user && <GlobalDrop />}
        {/* Takes up any spare height, so the footer sits at the bottom of the screen on short pages too. */}
        <main className="page-width flex-1 py-10">{children}</main>
        <footer className="mt-16 border-t border-line">
          <div className="text-micro page-width flex flex-wrap items-center justify-between gap-3 py-6 text-ink-muted">
            <span>Field Guide: Creative Technology. Entries are reviewed before going public.</span>
            <span>Open data under CC BY 4.0 (coming soon)</span>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
