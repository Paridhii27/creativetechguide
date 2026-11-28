"use client";
import { useState, useTransition } from "react";
import { findImagesAction } from "@/app/actions/entries";
import type { PageImage } from "@/lib/images";

/**
 * "Fetch from page": lists the logos and larger images on the entry's link so one can be chosen. Sizes are read
 * here in the browser, so images a site won't show elsewhere drop out.
 *
 * Sits in the row of picture choices: its button is shaped like them (dashed, as it adds one), and the results
 * take the full width beneath.
 */
export default function PicturePicker({ pageUrl, selected, onPick }: { pageUrl: () => string; selected: string[]; onPick: (image: PageImage) => void }) {
  const [images, setImages] = useState<PageImage[] | null>(null);
  /** natural size by address; null = didn't load, or too small to be worth choosing */
  const [sizes, setSizes] = useState<Record<string, string | null>>({});
  const [message, setMessage] = useState("");
  const [finding, start] = useTransition();

  const find = () =>
    start(async () => {
      setMessage("");
      try {
        const res = await findImagesAction(pageUrl());
        if ("error" in res) {
          setImages(null);
          setMessage(res.error);
        } else {
          setSizes({});
          setImages(res.images);
        }
      } catch {
        setMessage("Couldn’t look for images. Check your connection and try again.");
      }
    });

  const measure = (url: string, img: HTMLImageElement) => {
    // An SVG without its own size reports 0: it scales to anything.
    const vector = /\.svg(\?|$)/i.test(url);
    const { naturalWidth: w, naturalHeight: h } = img;
    setSizes((s) => ({ ...s, [url]: vector ? "Vector" : Math.max(w, h) < 48 ? null : `${w} × ${h}` }));
  };

  const shown = images?.filter((i) => sizes[i.url] !== null) ?? [];

  return (
    <div className="contents">
      <button
        type="button"
        disabled={finding}
        onClick={find}
        className="text-body-s flex min-w-0 cursor-pointer items-center gap-2 text-left border border-dashed border-control px-3 py-2 text-ink transition-colors hover:border-ink hover:bg-surface disabled:cursor-wait"
      >
        {/* The same 32px square the other choices show their picture in. */}
        <span className="grid h-8 w-8 place-items-center bg-surface">
          <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 ${finding ? "animate-pulse motion-reduce:animate-none" : ""}`}>
            <path d="M10 3v9m-3.5-3.5L10 12l3.5-3.5M3.5 13.5v3h13v-3" />
          </svg>
        </span>
        {finding ? "Looking…" : images ? "Look again" : "Fetch from page"}
      </button>

      {images && (
        <div className="col-span-full basis-full space-y-3 pt-1">
          <p role="status" className="text-body-s text-ink-muted">
            {shown.length ? "Choose one, then save. Logos sit centred; photos fill the picture area." : "No pictures we could use there. The letter tile looks good too."}
          </p>
          {(["logo", "photo"] as const).map((slot) => {
            const group = shown.filter((i) => i.slot === slot);
            if (!group.length) return null;
            return (
              <div key={slot}>
                <p className="text-micro text-ink-muted">{slot === "logo" ? "Logos and icons" : "Photos"}</p>
                <ul className="mt-1.5 grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
                  {group.map((i, n) => {
                    const on = selected.includes(i.url);
                    return (
                      <li key={i.url}>
                        <button
                          type="button"
                          aria-pressed={on}
                          aria-label={`${slot === "logo" ? "Logo" : "Photo"} ${n + 1}${sizes[i.url] ? `, ${sizes[i.url]}` : ""}`}
                          onClick={() => onPick(i)}
                          className={`block w-full cursor-pointer border p-1.5 transition-colors ${on ? "border-ink bg-surface" : "border-line hover:border-ink"}`}
                        >
                          {/* A mid grey ground, so both white and black logos can be seen. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={i.url}
                            alt=""
                            onLoad={(e) => measure(i.url, e.currentTarget)}
                            onError={() => setSizes((s) => ({ ...s, [i.url]: null }))}
                            className="h-20 w-full bg-[#8a8a8a] object-contain"
                          />
                          <span className="text-micro mt-1 block text-ink-muted">{sizes[i.url] ?? "Loading…"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {message && <p role="alert" className="text-body-s col-span-full basis-full text-accent-text">{message}</p>}
    </div>
  );
}
