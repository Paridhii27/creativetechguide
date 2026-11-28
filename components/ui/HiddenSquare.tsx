"use client";
import { useEffect, useRef, useState } from "react";
import { swatchVar, type Swatch } from "@/lib/swatch";

const COLOURS: Swatch[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * A bit of whimsy hidden in plain sight: a small coloured square at the end of a line of text. Pressing it
 * floats a phrase above, a new one (and colour) each time; Escape or a press elsewhere puts it away.
 * The note is centred on the nearest `relative` ancestor, so give it one: it then never runs off the screen.
 */
export default function HiddenSquare({ phrases, start = 1 }: { phrases: string[]; /** the square's colour before it's pressed */ start?: Swatch }) {
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  /** presses so far, and the phrase the first press landed on */
  const [{ presses, first }, setState] = useState({ presses: 0, first: 0 });
  const phrase = open ? phrases[(first + presses - 1) % phrases.length] : "";
  const colour = COLOURS[(start - 1 + presses) % COLOURS.length];

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!button.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label="A little surprise"
        onClick={() => {
          setOpen(true);
          setState((s) => ({ presses: s.presses + 1, first: s.presses ? s.first : Math.floor(Math.random() * phrases.length) }));
        }}
        onBlur={() => setOpen(false)}
        // The square is tiny; the button around it is big enough to tap without making its line any taller.
        className="group -my-3 inline-grid h-8 w-6 cursor-pointer place-items-center align-middle"
      >
        <span aria-hidden className="block h-2 w-2 transition-[rotate,scale] duration-300 group-hover:scale-125 group-hover:rotate-45 motion-reduce:transition-none" style={{ background: swatchVar(colour) }} />
      </button>
      {/* Always present, so screen readers hear each new phrase. */}
      <span role="status" className="pointer-events-none absolute inset-x-0 bottom-full z-20 mb-2 flex justify-center">
        {/* Keyed, so each new phrase fades in. */}
        {phrase && (
          <span key={presses} className="ticks anim-fade-up text-body-s border border-line bg-bg px-3 py-2 text-center font-normal normal-case tracking-normal text-ink [font-stretch:100%] [font-variation-settings:normal]">
            {phrase}
          </span>
        )}
      </span>
    </>
  );
}
