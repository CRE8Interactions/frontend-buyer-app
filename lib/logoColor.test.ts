import { describe, expect, it } from "vitest";
import {
  jerseyColorFromRgba,
  panelFillFromRgba,
  panelFillFromSvgMarkup,
} from "@/lib/logoColor";

function rgbaBuffer(
  pixels: Array<[number, number, number, number?]>,
  width: number,
  height: number,
) {
  const channels = 4;
  const data = Buffer.alloc(width * height * channels, 0);
  for (let i = 0; i < pixels.length; i++) {
    const [r, g, b, a = 255] = pixels[i];
    const offset = i * channels;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  }
  return data;
}

function rgbaGrid(
  width: number,
  height: number,
  paint: (x: number, y: number) => [number, number, number, number?],
) {
  const channels = 4;
  const data = Buffer.alloc(width * height * channels, 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = paint(x, y);
      const i = (y * width + x) * channels;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return data;
}

describe("panelFillFromRgba", () => {
  it("uses border pixels for a full-jersey raster logo", () => {
    const pixels: Array<[number, number, number, number?]> = [];
    for (let i = 0; i < 52; i++) pixels.push([0xbf, 0x0c, 0x26]);
    for (let i = 0; i < 6; i++) pixels.push([0x55, 0x08, 0x12]);
    for (let i = 0; i < 6; i++) pixels.push([0x4c, 0x4e, 0x52]);
    for (let i = 0; i < 4; i++) pixels.push([0xff, 0xff, 0xff]);

    const data = rgbaBuffer(pixels, 8, 8);

    expect(panelFillFromRgba(data, 4, 8, 8)).toBe("#bf0c26");
  });

  it("uses the dark badge background even when a bright mark covers more pixels", () => {
    const black: [number, number, number] = [0x12, 0x12, 0x14];
    const yellow: [number, number, number] = [0xff, 0xcd, 0x00];
    const data = rgbaGrid(12, 12, (x, y) => {
      const center =
        x >= 4 && x <= 7 && y >= 3 && y <= 8 ? yellow : black;
      return center;
    });

    expect(panelFillFromRgba(data, 4, 12, 12)).toBe("#121214");
  });

  it("uses the border backdrop instead of a bright center mark", () => {
    const yellow: [number, number, number] = [0xff, 0xcd, 0x00];
    const black: [number, number, number] = [0x10, 0x18, 0x20];
    const data = rgbaGrid(12, 12, (x, y) => {
      const edge = x === 0 || y === 0 || x === 11 || y === 11;
      return edge ? black : yellow;
    });

    expect(panelFillFromRgba(data, 4, 12, 12)).toBe("#101820");
  });

  it("uses the yellow jersey backdrop behind a black mark", () => {
    const yellow: [number, number, number] = [0xff, 0xcd, 0x00];
    const black: [number, number, number] = [0x10, 0x18, 0x20];
    const data = rgbaGrid(12, 12, (x, y) => {
      const edge = x === 0 || y === 0 || x === 11 || y === 11;
      return edge ? yellow : black;
    });

    expect(panelFillFromRgba(data, 4, 12, 12)).toBe("#ffcd00");
  });
});

describe("panelFillFromSvgMarkup", () => {
  it("uses the saturated jersey fill when there is no dark backdrop", () => {
    const markup = `
      <path style="fill:#4c4e52" />
      <path style="fill:#bf0c26" />
      <path style="fill:#bf0c26" />
      <path fill="#ffffff" />
    `;

    expect(panelFillFromSvgMarkup(markup)).toBe("#bf0c26");
  });

  it("uses the dark backdrop fill over brighter brand marks", () => {
    const markup = `
      <rect fill="#0d3b2e" />
      <rect fill="#0d3b2e" />
      <rect fill="#0d3b2e" />
      <rect fill="#0d3b2e" />
      <path fill="#007a6d" />
    `;

    expect(panelFillFromSvgMarkup(markup)).toBe("#0d3b2e");
  });

  it("uses the dark backdrop even when bright marks appear more often", () => {
    const markup = `
      <rect fill="#101820" />
      <path fill="#ffcd00" />
      <path fill="#ffcd00" />
      <path fill="#ffcd00" />
      <path fill="#ffcd00" />
    `;

    expect(panelFillFromSvgMarkup(markup)).toBe("#101820");
  });

  it("uses a yellow jersey rect behind a black mark", () => {
    const markup = `
      <rect fill="#ffcd00" />
      <path fill="#101820" />
      <path fill="#101820" />
      <path fill="#101820" />
      <path fill="#101820" />
    `;

    expect(panelFillFromSvgMarkup(markup)).toBe("#ffcd00");
  });
});

describe("jerseyColorFromRgba", () => {
  it("still prefers the brighter center brand color for mark sampling", () => {
    const darkGreen: [number, number, number] = [0x0d, 0x3b, 0x2e];
    const brandTeal: [number, number, number] = [0x00, 0x7a, 0x6d];
    const data = rgbaGrid(12, 12, (x, y) => {
      const edge = x < 2 || y < 2 || x > 9 || y > 9;
      return edge ? darkGreen : brandTeal;
    });

    expect(jerseyColorFromRgba(data, 4, 12, 12)).toBe("#007a6d");
  });
});
