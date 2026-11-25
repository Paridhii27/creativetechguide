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
import { NavBar } from "@/components/ui/layout";
import { PillLink } from "@/components/ui/primitives";
import { VIEW_MODE_SCRIPT } from "@/lib/theme";

// The only three families on the site (DESIGN.md).
const blackHanSans = Black_Han_Sans({ subsets: ["latin"], weight: "400", variable: "--font-black-han-sans", display: "swap" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-instrument-serif", display: "swap" });
const instrumentSans = Instrument_Sans({ subsets: ["latin"], axes: ["wdth"], variable: "--font-instrument-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Field Guide: Creative Technology", template: "%s · Field Guide" },
  description: "A field guide to creative technology, experience design and design-technology work, seen through any country or region.",
};

/** Account pill in the top strip, matching the view-mode switch beside it (outlined, tag-size text, small icon). */
const ACCOUNT_PILL =
  "text-tag inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-ink transition-colors hover:border-ink";

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
      </head>
      <body className="min-h-screen">
        <DuotoneFilters />
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <NavBar
              right={
                <>
                  <Suspense fallback={<div className="h-8 w-44" />}>
                    <LensSwitch fallback={lens.slug} geo={geo} />
                  </Suspense>
                  {/* Your own things, grouped tight; the wider gap before them separates them from the lens. */}
                  <div className="flex items-center gap-2">
                    <PillLink href={user ? "/me" : "/login?next=/me"} title="Your saves, your own entries and what you've suggested to the Map">
                      My Layer
                      {user && layerCount > 0 && <span className="text-tag -mr-1 rounded-full bg-accent px-1.5 py-px text-on-accent">{layerCount}</span>}
                    </PillLink>
                    {/* Adding links is for signed-in users only, so signed-out visitors don't get a button that just leads to sign in. */}
                    {user && (
                      <Link
                        href="/add"
                        aria-label="Add a link"
                        title="Add a link (press N, or paste or drop a link anywhere)"
                        className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-full border border-ink bg-ink text-bg transition-colors hover:bg-transparent hover:text-ink"
                      >
                        <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="h-3.5 w-3.5">
                          <path d="M8 2.5v11M2.5 8h11" />
                        </svg>
                      </Link>
                    )}
                  </div>
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
                <Suspense fallback={<div className="h-9 w-full" />}>
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
            <p className="text-body-s mx-auto max-w-7xl px-4 py-2 text-ink-muted sm:px-8">
              Supabase isn&apos;t configured, so the catalogue is empty. Copy <code>.env.example</code> to <code>.env.local</code> and follow the README.
            </p>
          </div>
        )}
        {user && <GlobalDrop />}
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">{children}</main>
        <footer className="mt-16 border-t border-line">
          <div className="text-micro mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-ink-muted sm:px-8">
            <span>Field Guide: Creative Technology. Entries are reviewed before going public.</span>
            <span>Open data under CC BY 4.0 (coming soon)</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
