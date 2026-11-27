"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/** [what it can mean, discipline slug, discipline name] */
const MEANINGS = [
  ["a wall that moves when you walk past it", "installation", "Installation"],
  ["code used as a paintbrush", "creative-coding", "Creative coding"],
  ["a building turned into a screen", "projection-mapping", "Projection mapping"],
  ["a world you can step inside", "spatial-xr", "AR/VR & spatial"],
  ["an object that senses you and answers back", "physical-computing", "Physical computing"],
  ["an instrument nobody has played before", "sound-music-tech", "Sound & music tech"],
  ["one rule that draws a thousand pictures", "generative-art", "Generative art"],
  ["data you can walk around and feel", "data-visualisation", "Data visualisation"],
  ["a game that changes how you think", "game-design", "Game design"],
  ["a machine as your creative collaborator", "ai", "AI"],
  ["a room designed around a story", "experience-design", "Experience design"],
] as const;

const EVERY_MS = 3500;

/**
 * "Creative technology can mean…", one example at a time, each linking to the studios in that discipline.
 * It turns over by itself until you choose one; it holds while hovered or focused, and never moves on its own
 * for people who ask for reduced motion.
 */
export default function Meanings({ lens }: { lens: string }) {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!auto || held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % MEANINGS.length), EVERY_MS);
    return () => clearInterval(t);
  }, [auto, held]);

  const pick = (n: number) => {
    setAuto(false);
    setI((n + MEANINGS.length) % MEANINGS.length);
  };
  const [text, slug, name] = MEANINGS[i];

  return (
    <div
      className="mt-6 max-w-xl border-y border-line py-3"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <p className="text-micro text-ink-muted">It can mean</p>
      {/* Clicking the line shows the next one. Two lines are reserved so the page below never jumps. */}
      <button type="button" onClick={() => pick(i + 1)} title="Show another" className="mt-1 flex min-h-[2.4em] w-full cursor-pointer items-center text-left text-accent-l text-ink">
        <span key={i} aria-live={auto ? "off" : "polite"} className="anim-fade-up">
          {text}
        </span>
      </button>
      <div className="mt-1 flex items-center justify-between gap-3">
        <Link href={`/studios?discipline=${slug}&lens=${lens}`} className="text-label text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          {name} studios <span aria-hidden className="nudge">→</span>
        </Link>
        {/* One tick per example: where you are, and a way to jump. */}
        <div className="flex">
          {MEANINGS.map(([label], n) => (
            <button key={label} type="button" onClick={() => pick(n)} aria-label={`Show: ${label}`} aria-current={n === i || undefined} className="group cursor-pointer px-[3px] py-2">
              <span className={`block h-2.5 w-0.5 transition-colors ${n === i ? "bg-accent" : "bg-line group-hover:bg-ink"}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
