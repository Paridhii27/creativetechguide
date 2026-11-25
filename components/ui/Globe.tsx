/** Wireframe globe: the home specimen (until the MapLibre world map lands in M3). */
export function Globe({ className = "h-[78%] w-auto" }: { className?: string }) {
  return (
    <svg viewBox="-110 -110 220 220" className={`text-ink ${className}`} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.85">
        <circle r="100" />
        {[20, 45, 70, 90].map((rx) => (
          <ellipse key={rx} rx={rx} ry="100" />
        ))}
        {[-75, -50, -25, 0, 25, 50, 75].map((y) => (
          <line key={y} x1={-Math.sqrt(100 * 100 - y * y)} x2={Math.sqrt(100 * 100 - y * y)} y1={y} y2={y} />
        ))}
      </g>
    </svg>
  );
}
