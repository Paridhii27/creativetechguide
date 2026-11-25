"use client";
import { useEffect, useState } from "react";

/** Local time in a zone, e.g. "21:04 IST". Renders a placeholder on the server to avoid hydration mismatch. */
export function HudClock({ timeZone, className = "" }: { timeZone: string; className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const text = now
    ? new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short" }).format(now)
    : "--:--";
  return <span className={`tabular-nums ${className}`}>{text}</span>;
}
