import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import {
  dominantFromRgba,
  meshBackgroundFromRgba,
  panelFillFromRgba,
} from "@/lib/logoColor";

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
    const mode = req.nextUrl.searchParams.get("mode");

    const sampleSize = mode === "jersey" ? 128 : 64;
    const { data, info } = await sharp(input)
      .resize(sampleSize, sampleSize, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (mode === "jersey") {
      const color =
        panelFillFromRgba(
          data,
          info.channels,
          info.width,
          info.height,
        ) || dominantFromRgba(data, info.channels, { deepen: 1 });
      return NextResponse.json(
        { color },
        {
          headers: {
            "Cache-Control":
              "public, max-age=86400, stale-while-revalidate=604800",
          },
        },
      );
    }

    const color =
      mode === "mesh"
        ? meshBackgroundFromRgba(data, info.channels, info.width, info.height)
        : dominantFromRgba(data, info.channels, {
            deepen: mode === "panel" ? 1 : 0.78,
          });
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
