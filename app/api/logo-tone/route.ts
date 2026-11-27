import { NextResponse } from "next/server";
import sharp from "sharp";
import { isLostOnBlack, readIco } from "@/lib/logo-tone";
import { fetchImage } from "@/lib/unfurl";

/** How long the browser and Vercel's CDN keep an answer, in seconds. */
const cache = (seconds: number) => ({ "cache-control": `public, max-age=${seconds}, s-maxage=${seconds}` });

async function pixels(file: Buffer): Promise<Uint8Array> {
  const ico = readIco(file);
  if (ico && "rgba" in ico) return ico.rgba;
  return sharp(ico?.png ?? file, { limitInputPixels: 40_000_000 })
    .resize(64, 64, { fit: "inside", withoutEnlargement: true })
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer();
}

/** GET ?url= → {dark}: whether that picture would disappear on a black ground. Returns nothing else about it. */
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url || url.length > 2000) return NextResponse.json({ dark: false }, { status: 400 });
  try {
    const dark = isLostOnBlack(await pixels(await fetchImage(url)));
    return NextResponse.json({ dark }, { headers: cache(60 * 60 * 24 * 7) });
  } catch {
    // Unreadable here: leave the picture as it is, and look again later.
    return NextResponse.json({ dark: false }, { headers: cache(60 * 60) });
  }
}
