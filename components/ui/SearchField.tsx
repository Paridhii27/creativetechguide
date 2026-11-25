/** A search bar: pill-shaped hairline field with a magnifier glyph inside. */
export default function SearchField({
  size = "m",
  className = "",
  kbd,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & {
  size?: "s" | "m" | "l";
  /** keyboard shortcut shown as a small chip at the right while the field is empty and unfocused */
  kbd?: string;
}) {
  const s = {
    s: { input: "text-body-s py-2 pl-9 pr-3", icon: "left-3 h-4 w-4" },
    m: { input: "text-body-m py-2.5 pl-10 pr-4", icon: "left-3.5 h-4 w-4" },
    l: { input: "text-body-l py-3 pl-12 pr-5", icon: "left-4.5 h-5 w-5" },
  }[size];
  return (
    <span className={`relative block ${className}`}>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-muted ${s.icon}`}
      >
        <circle cx="8.5" cy="8.5" r="5.75" />
        <path d="m13 13 4.25 4.25" />
      </svg>
      <input
        type="search"
        {...props}
        className={`peer w-full appearance-none rounded-full border border-line bg-bg text-ink transition-colors placeholder:text-ink-muted hover:border-ink focus:border-ink focus:outline-2 focus:outline-offset-1 focus:outline-accent [&::-webkit-search-cancel-button]:hidden ${s.input}`}
      />
      {kbd && (
        <kbd
          aria-hidden
          className="text-micro pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full border border-line px-1.5 py-0.5 text-ink-muted peer-focus:hidden peer-[:not(:placeholder-shown)]:hidden"
        >
          {kbd}
        </kbd>
      )}
    </span>
  );
}
