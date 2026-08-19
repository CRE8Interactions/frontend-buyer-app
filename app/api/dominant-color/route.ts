import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

const ALLOWED_HOST_SUFFIXES = [
  "digitaloceanspaces.com",
  "amazonaws.com",
  "cloudfront.net",
  "localhost",
  "127.0.0.1",
];

function isAllowedImageUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Pick a saturated brand-ish fill from logo pixels. */
function dominantFromRgba(data: Buffer, channels: number) {
  let bestScore = 0;
  let best = { r: 30, g: 60, b: 100 };
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = channels >= 4 ? data[i + 3] : 255;
    if (a < 140) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = (r + g + b) / 3;

    // Skip near-white / near-black / washed neutrals
    if (lum > 235 || lum < 18) continue;
    if (sat < 0.12 && lum > 170) continue;

    sumR += r;
    sumG += g;
    sumB += b;
    count += 1;

    const score = sat * 1.6 + (1 - Math.abs(lum - 110) / 255);
    if (score > bestScore) {
      bestScore = score;
      best = { r, g, b };
    }
  }

  const pick =
    bestScore > 0.3
      ? best
      : count > 0
        ? {
            r: Math.round(sumR / count),
            g: Math.round(sumG / count),
            b: Math.round(sumB / count),
          }
        : best;

  // Deepen so logos stay readable on the panel
  const deepen = (c: number) => Math.max(0, Math.min(255, Math.round(c * 0.78)));
  return rgbToHex(deepen(pick.r), deepen(pick.g), deepen(pick.b));
}

/** Average dark neutral pixels from image borders — matches jersey/card backgrounds. */
function meshBackgroundFromRgba(
  data: Buffer,
  channels: number,
  width: number,
  height: number,
) {
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  const consider = (r: number, g: number, b: number, a: number) => {
    if (a < 100) return;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = (r + g + b) / 3;
    if (lum < 12 || lum > 190) return;
    if (sat > 0.45 && lum > 50) return;
    sumR += r;
    sumG += g;
    sumB += b;
    count += 1;
  };

  const band = Math.max(2, Math.round(Math.min(width, height) * 0.12));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const onBorder =
        x < band || x >= width - band || y < band || y >= height - band;
      if (!onBorder) continue;
      const i = (y * width + x) * channels;
      consider(
        data[i],
        data[i + 1],
        data[i + 2],
        channels >= 4 ? data[i + 3] : 255,
      );
    }
  }

  if (count === 0) {
    for (let i = 0; i < data.length; i += channels) {
      consider(
        data[i],
        data[i + 1],
        data[i + 2],
        channels >= 4 ? data[i + 3] : 255,
      );
    }
  }

  if (count === 0) return "#252930";

  return rgbToHex(
    Math.round(sumR / count),
    Math.round(sumG / count),
    Math.round(sumB / count),
  );
}

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src");
  if (!src || !isAllowedImageUrl(src)) {
    return NextResponse.json({ error: "Invalid image url" }, { status: 400 });
  }

  try {
    const res = await fetch(src, {
      headers: { Accept: "image/*" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
    }

    const input = Buffer.from(await res.arrayBuffer());
    const { data, info } = await sharp(input)
      .resize(64, 64, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const color =
      req.nextUrl.searchParams.get("mode") === "mesh"
        ? meshBackgroundFromRgba(data, info.channels, info.width, info.height)
        : dominantFromRgba(data, info.channels);
    return NextResponse.json(
      { color },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Color sample failed" }, { status: 500 });
  }
}
