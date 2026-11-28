"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SECTIONS } from "@/lib/types";

const URL_RE = /^https?:\/\/\S+$/i;
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/** Pages you search or filter on, where a stray "n" is far more likely to be typing than a command. */
const SEARCHING = new Set(["/search", ...SECTIONS.map((s) => `/${s.slug}`)]);

/** N only counts as a shortcut when nothing is focused (not a field, menu, button or link) and no dropdown is open. */
function isShortcut(e: KeyboardEvent) {
  if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey || e.repeat || e.isComposing || e.defaultPrevented) return false;
  // The page itself counts as nothing focused: <main> takes focus from "Skip to content" or a click on it.
  const t = e.target;
  if (t !== document.body && t !== document.documentElement && !(t instanceof HTMLElement && t.id === "main")) return false;
  // An open menu can be left without focus (Safari doesn't focus a button you click), so check for one too.
  return !SEARCHING.has(window.location.pathname) && !document.querySelector('[aria-expanded="true"]');
}

/** Drop or paste a link anywhere (outside text fields) to add an entry. N does the same, away from search pages. */
export default function GlobalDrop() {
  const router = useRouter();
  const [over, setOver] = useState(false);

  useEffect(() => {
    const go = (url?: string) => router.push(url ? `/add?url=${encodeURIComponent(url)}` : "/add");
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const text = e.clipboardData?.getData("text")?.trim();
      if (text && URL_RE.test(text)) {
        e.preventDefault();
        go(text);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (isShortcut(e)) {
        e.preventDefault();
        go();
      }
    };
    const hasLink = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].some((t) => t === "text/uri-list" || t === "text/plain");
    const onDragOver = (e: DragEvent) => {
      if (!hasLink(e) || isTyping(e.target)) return;
      e.preventDefault();
      setOver(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setOver(false);
    };
    const onDrop = (e: DragEvent) => {
      setOver(false);
      if (isTyping(e.target)) return;
      const text = (e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain") || "").split("\n").find((l) => URL_RE.test(l.trim()))?.trim();
      if (text) {
        e.preventDefault();
        go(text);
      }
    };
    document.addEventListener("paste", onPaste);
    document.addEventListener("keydown", onKey);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
    };
  }, [router]);

  if (!over) return null;
  return (
    <div className="ticks bg-specimen-grid pointer-events-none fixed inset-3 z-50 grid place-items-center border border-dashed border-ink/60 opacity-95">
      <div className="text-center">
        <p className="text-micro text-accent-text">[ Drop URL ]</p>
        <p className="text-display-m mt-3 text-ink">Ooh, a link. Let go.</p>
      </div>
    </div>
  );
}
