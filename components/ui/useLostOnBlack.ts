"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

function watchTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const isMonitor = () => document.documentElement.dataset.theme === "night";

/** One question per picture, shared by every place it appears. */
const answers = new Map<string, Promise<boolean>>();
function ask(src: string): Promise<boolean> {
  let answer = answers.get(src);
  if (!answer) {
    answer = fetch(`/api/logo-tone?url=${encodeURIComponent(src)}`)
      .then(async (res) => res.ok && (await res.json()).dark === true)
      .catch(() => {
        answers.delete(src);
        return false;
      });
    answers.set(src, answer);
  }
  return answer;
}

/** True when we're in Monitor mode and this picture would disappear on its black ground. */
export function useLostOnBlack(src: string | null): boolean {
  const monitor = useSyncExternalStore(watchTheme, isMonitor, () => false);
  const [lost, setLost] = useState<Record<string, boolean>>({});
  // Only web addresses: pictures served by this site (relative paths) are our own and left as they are.
  const remote = src && /^https?:\/\//i.test(src) ? src : null;
  useEffect(() => {
    if (!monitor || !remote) return;
    let current = true;
    ask(remote).then((dark) => current && setLost((l) => ({ ...l, [remote]: dark })));
    return () => {
      current = false;
    };
  }, [monitor, remote]);
  return monitor && !!src && lost[src] === true;
}
