import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Black_Han_Sans, Instrument_Serif, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { SECTIONS } from "@/lib/types";
import { cookieLens, getGeoCached } from "@/lib/lens-server";
import { getCurrentProfile, getCurrentUser } from "@/lib/db/profiles";
import { myLayerCount, pendingReviewCount } from "@/lib/db/mylayer";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lens, geo, user, profile, layerCount, reviewCount] = await Promise.all([cookieLens(), getGeoCached(), getCurrentUser(), getCurrentProfile(), myLayerCount(), pendingReviewCount()]);
  // Only the admin reviews suggestions and publishes to the Map; everyone else suggests and keeps their own layer.
  const admin = profile?.role === "admin";
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
                  <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />
                  {admin && (
                    <PillLink href="/admin/review" title="Suggestions waiting for you to approve or reject">
                      Review queue
                      {reviewCount > 0 && <span className="text-tag -mr-1 rounded-full bg-accent px-1.5 py-px text-on-accent">{reviewCount}</span>}
                    </PillLink>
                  )}
                  <PillLink href={user ? "/me" : "/login?next=/me"} title="Your saves, your own entries and what you've suggested to the Map">
                    My Layer
                    {user && layerCount > 0 && <span className="text-tag -mr-1 rounded-full bg-accent px-1.5 py-px text-on-accent">{layerCount}</span>}
                  </PillLink>
                  <PillLink href="/add" variant="primary" title="Add a URL to your layer (or press N, or paste/drop a link anywhere)">
                    + Drop URL
                  </PillLink>
                </>
              }
              utility={
                user ? (
                  <>
                    {admin && <span className="text-ink">Admin</span>}
                    <form action="/auth/signout" method="post" className="contents">
                      <button className="hover:text-ink" title={user.email ?? undefined}>Sign out</button>
                    </form>
                  </>
                ) : (
                  <Link href="/login" className="text-ink hover:underline">Sign in</Link>
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
