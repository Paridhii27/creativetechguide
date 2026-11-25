"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const URL_RE = /^https?:\/\/\S+$/i;
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/** Drop or paste a link anywhere (outside text fields), or press N, to add an entry. */
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
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
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
        <p className="text-display-m mt-3 text-ink">Drop the link to add it</p>
      </div>
    </div>
  );
}
