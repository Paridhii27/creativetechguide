/** View modes from DESIGN.md. Only colour tokens change between them. */
export const VIEW_MODES = ["paper", "night", "blueprint"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const VIEW_MODE_KEY = "fg-view-mode";

export function nextViewMode(m: ViewMode): ViewMode {
  return VIEW_MODES[(VIEW_MODES.indexOf(m) + 1) % VIEW_MODES.length];
}

export function isViewMode(v: unknown): v is ViewMode {
  return typeof v === "string" && (VIEW_MODES as readonly string[]).includes(v);
}

/**
 * Runs in <head> before first paint so there's no flash of the wrong mode.
 * Saved choice wins; otherwise Night if the system prefers dark, else Paper.
 */
export const VIEW_MODE_SCRIPT = `(function(){try{var m=localStorage.getItem(${JSON.stringify(VIEW_MODE_KEY)});if(${JSON.stringify(
  VIEW_MODES,
)}.indexOf(m)<0){m=matchMedia("(prefers-color-scheme: dark)").matches?"night":"paper"}document.documentElement.dataset.theme=m}catch(e){}})();`;
