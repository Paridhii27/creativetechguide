import { describe, expect, it } from "vitest";
import { isLostOnBlack, readIco } from "@/lib/logo-tone";

type Px = [number, number, number, number];
const picture = (...parts: [Px, number][]) => new Uint8Array(parts.flatMap(([px, n]) => Array.from({ length: n }, () => px).flat()));
const CLEAR: Px = [0, 0, 0, 0];
const BLACK: Px = [0, 0, 0, 255];
const WHITE: Px = [255, 255, 255, 255];
const RED: Px = [240, 74, 48, 255];

describe("pictures on a black ground", () => {
  it("loses see-through logos drawn in black or very dark colours", () => {
    expect(isLostOnBlack(picture([CLEAR, 70], [BLACK, 30]))).toBe(true);
    expect(isLostOnBlack(picture([CLEAR, 70], [[10, 20, 70, 255], 30]))).toBe(true);
    expect(isLostOnBlack(picture([CLEAR, 100]))).toBe(true);
  });
  it("keeps white, coloured and partly coloured logos", () => {
    expect(isLostOnBlack(picture([CLEAR, 70], [WHITE, 30]))).toBe(false);
    expect(isLostOnBlack(picture([CLEAR, 70], [RED, 30]))).toBe(false);
    expect(isLostOnBlack(picture([CLEAR, 50], [BLACK, 30], [RED, 20]))).toBe(false);
  });
  it("keeps pictures that bring their own ground", () => {
    expect(isLostOnBlack(picture([BLACK, 100]))).toBe(false);
  });
});

describe(".ico files", () => {
  // 2×1, 32-bit: one opaque black pixel and one see-through pixel.
  const dib = Buffer.alloc(40 + 8 + 4);
  dib.writeUInt32LE(40, 0);
  dib.writeInt32LE(2, 4);
  dib.writeInt32LE(2, 8);
  dib.writeUInt16LE(32, 14);
  dib.set([0, 0, 0, 255, 0, 0, 0, 0], 40);
  const head = Buffer.alloc(22);
  head.writeUInt32LE(0x00010000, 0);
  head.writeUInt16LE(1, 4);
  head[6] = 2;
  head.writeUInt32LE(dib.length, 14);
  head.writeUInt32LE(22, 18);

  it("reads a bitmap icon's pixels", () => {
    expect(readIco(Buffer.concat([head, dib]))).toEqual({ rgba: new Uint8Array([0, 0, 0, 255, 0, 0, 0, 0]), width: 2, height: 1 });
  });
  it("ignores other files", () => {
    expect(readIco(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
  });
});
