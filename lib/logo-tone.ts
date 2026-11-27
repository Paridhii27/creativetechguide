/** Would a picture be lost on Monitor mode's black ground? Pure pixel checks, so they can be tested. */

/** Below this relative luminance a colour is hard to make out on black (about 2:1 contrast). */
const MIN_LUMINANCE = 0.06;
/** Pictures with less see-through area than this bring their own ground, so they're left alone. */
const MIN_TRANSPARENT = 0.05;
/** Share of the drawn pixels that must stand out for the picture to count as visible. */
const MIN_BRIGHT = 0.04;
/** Monitor mode shows pictures at this brightness (`--img-filter`). */
const DIM = 0.9;

const linear = (v: number) => {
  const c = (v * DIM) / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** `rgba`: 4 bytes per pixel, alpha not premultiplied. */
export function isLostOnBlack(rgba: Uint8Array): boolean {
  let drawn = 0;
  let bright = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const alpha = rgba[i + 3] / 255;
    drawn += alpha;
    if (0.2126 * linear(rgba[i]) + 0.7152 * linear(rgba[i + 1]) + 0.0722 * linear(rgba[i + 2]) >= MIN_LUMINANCE) bright += alpha;
  }
  const pixels = rgba.length / 4;
  if (!pixels || 1 - drawn / pixels < MIN_TRANSPARENT) return false;
  return !drawn || bright / drawn < MIN_BRIGHT;
}

export type IcoImage = { png: Buffer } | { rgba: Uint8Array; width: number; height: number };

/** The largest picture inside an .ico file (which the image library can't read), or null if it isn't one we understand. */
export function readIco(file: Buffer): IcoImage | null {
  if (file.length < 22 || file.readUInt32LE(0) !== 0x00010000) return null;
  let best: { data: Buffer; score: number } | null = null;
  for (let i = 0; i < file.readUInt16LE(4) && 22 + i * 16 <= file.length; i++) {
    const at = 6 + i * 16;
    const score = (file[at] || 256) * 1000 + file.readUInt16LE(at + 6); // width, then colour depth
    const size = file.readUInt32LE(at + 8);
    const offset = file.readUInt32LE(at + 12);
    if (offset + size <= file.length && (!best || score > best.score)) best = { data: file.subarray(offset, offset + size), score };
  }
  if (!best || best.data.length < 40) return null;
  const d = best.data;
  if (d.readUInt32BE(0) === 0x89504e47) return { png: d };

  // Otherwise a bitmap without its file header: palette, pixels, then a 1-bit mask, rows stored bottom-up.
  const header = d.readUInt32LE(0);
  const width = d.readInt32LE(4);
  const height = d.readInt32LE(8) / 2; // counts the mask too
  const bpp = d.readUInt16LE(14);
  const compressed = d.readUInt32LE(16) !== 0;
  if (compressed || ![1, 4, 8, 24, 32].includes(bpp) || width < 1 || width > 256 || height < 1 || height > 256) return null;
  const colours = bpp <= 8 ? d.readUInt32LE(32) || 1 << bpp : 0;
  const start = header + colours * 4;
  const stride = Math.ceil((width * bpp) / 32) * 4;
  const maskStride = Math.ceil(width / 32) * 4;
  const maskStart = start + stride * height;
  if (maskStart > d.length) return null;
  const hasMask = maskStart + maskStride * height <= d.length;
  const rgba = new Uint8Array(width * height * 4);
  let anyAlpha = false;
  for (let y = 0; y < height; y++) {
    const row = start + (height - 1 - y) * stride;
    for (let x = 0; x < width; x++) {
      let from: number;
      if (bpp >= 24) from = row + x * (bpp / 8);
      else {
        const index = (d[row + ((x * bpp) >> 3)] >> (8 - bpp - ((x * bpp) % 8))) & ((1 << bpp) - 1);
        from = header + index * 4;
      }
      const to = (y * width + x) * 4;
      rgba.set([d[from + 2], d[from + 1], d[from], bpp === 32 ? d[from + 3] : 255], to);
      if (bpp === 32 && d[from + 3]) anyAlpha = true;
    }
  }
  // Older icons say what's see-through in the mask rather than an alpha channel.
  if (!anyAlpha && hasMask) {
    for (let y = 0; y < height; y++) {
      const row = maskStart + (height - 1 - y) * maskStride;
      for (let x = 0; x < width; x++) rgba[(y * width + x) * 4 + 3] = (d[row + (x >> 3)] >> (7 - (x % 8))) & 1 ? 0 : 255;
    }
  }
  return { rgba, width, height };
}
