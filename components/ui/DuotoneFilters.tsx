/**
 * SVG filters referenced from CSS (`--img-filter`). Blueprint maps image shadows to the blue ink
 * (#3449B2) and highlights to the background (#FCFCFC), so pages stay monochrome.
 */
export function DuotoneFilters() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }} focusable="false">
      <filter id="duotone-blueprint" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.204 0.988" />
          <feFuncG type="table" tableValues="0.286 0.988" />
          <feFuncB type="table" tableValues="0.698 0.988" />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}
