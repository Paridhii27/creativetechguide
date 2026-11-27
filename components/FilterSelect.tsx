"use client";
import { useEffect, useRef, useState } from "react";
import PlaceMenu from "./ui/PlaceMenu";

/**
 * A filter dropdown in the site's own style, in place of the browser's select list. The choice is held in a
 * hidden field so it goes with the surrounding GET form, which is submitted as soon as it changes.
 */
export default function FilterSelect({ name, label, value, options }: { name: string; label: string; value: string; options: { value: string; label: string }[] }) {
  const field = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState(value);
  // Follow the URL when it changes underneath us (back, forward, a link).
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setChosen(value);
  }
  // "Clear filters" (AutoSubmit) empties the field in place and tells us to catch up.
  useEffect(() => {
    const input = field.current;
    const clear = () => setChosen("");
    input?.addEventListener("filter-clear", clear);
    return () => input?.removeEventListener("filter-clear", clear);
  }, []);

  const all = [{ value: "", label: "Any" }, ...options];
  const current = all.find((o) => o.value === chosen) ?? all[0];

  return (
    <div className="min-w-0">
      <span aria-hidden className="text-micro text-ink-muted">{label}</span>
      <div className="relative mt-1.5 flex">
        <input ref={field} type="hidden" name={name} value={chosen} data-filter readOnly />
        <PlaceMenu
          compact
          autoPlace
          label={current.label}
          ariaLabel={`${label} (now ${current.label})`}
          value={current.value}
          groups={[{ label, options: all }]}
          onSelect={(next) => {
            const input = field.current;
            if (!input || next === chosen) return;
            input.value = next; // the form reads it now, before React re-renders
            setChosen(next);
            input.form?.requestSubmit();
          }}
          className="text-body-s flex w-full items-center justify-between border border-control bg-bg px-2.5 py-2 text-left text-ink transition-colors hover:border-ink aria-expanded:border-ink"
        />
      </div>
    </div>
  );
}
