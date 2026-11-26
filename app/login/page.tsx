import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import { BracketLabel } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/") ? sp.next : "/";
  return (
    <div className="mx-auto max-w-md py-8">
      <BracketLabel accent>Magic link</BracketLabel>
      <h1 className="text-display-m mt-4 text-ink">Sign in</h1>
      <p className="text-body mt-4 text-ink-muted">We&apos;ll email you a link. No password needed. Signing in lets you save entries, keep notes and track applications.</p>
      {sp.error && <p className="text-body-s mt-4 text-accent-text">That sign-in link didn&apos;t work or has expired. Request a new one.</p>}
      <div className="ticks mt-8 border border-line p-5"><LoginForm next={next} /></div>
    </div>
  );
}
