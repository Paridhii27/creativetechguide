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
      <p className="text-body mt-4 text-ink-muted">Pop in your email and we&apos;ll send you a link, no password to remember. Once you&apos;re in, you can save your finds, keep notes and track applications.</p>
      {sp.error && <p className="text-body-s mt-4 text-accent-text">That sign-in link has expired or didn&apos;t work. Let&apos;s send you a fresh one.</p>}
      <div className="ticks mt-8 border border-line p-5"><LoginForm next={next} /></div>
    </div>
  );
}
