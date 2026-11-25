"use client";
import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "@/app/actions/auth";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, null);
  if (state?.ok) return <p className="text-body text-ink">{state.message}</p>;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" required autoComplete="email" className="field mt-1.5" />
      </label>
      <button disabled={pending} className="text-label w-full rounded-full border border-ink bg-ink py-2.5 text-bg transition-colors hover:bg-transparent hover:text-ink disabled:opacity-60">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
      {state && !state.ok && <p className="text-body-s text-accent-text">{state.message}</p>}
    </form>
  );
}
