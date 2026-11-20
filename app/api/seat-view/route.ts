import type { NextRequest } from "next/server";
import sharp from "sharp";

/* A venue's pictures of a section (where it is on the map, and the view from its seats) at thumbnail size. The venue's files are full size (the view from a seat is
   about 30 MB), which no thumbnail should download, and Next's own image optimizer gives up on a download after 7 seconds. So this fetches the file once on the
   server, shrinks it to a thumbnail (w=480) and to a large picture for the dialog (w=1400) in one pass, keeps both small results in memory, and serves them
   with long caching, so the browser and the CDN in front keep them too. Only the venue CDN, only the two picture kinds, only two sizes and only plain names
   are accepted. */
export const runtime = "nodejs";

const BUCKET = "https://blocktickets.nyc3.cdn.digitaloceanspaces.com";
const SAFE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const KINDS = new Set(["thumbnail", "seat-view"]);
const WIDTHS = { "480": 480, "1400": 1400 } as const;
type Sized = { "480": Buffer; "1400": Buffer };

const done = new Map<string, Sized | null>();
const pending = new Map<string, Promise<Sized | null>>();

async function shrink(url: string): Promise<Sized | null> {
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) return null;
  const input = Buffer.from(await res.arrayBuffer());
  const to = (width: number, quality: number) => sharp(input, { sequentialRead: true }).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
  const [small, large] = await Promise.all([to(WIDTHS["480"], 72), to(WIDTHS["1400"], 78)]);
  return { "480": small, "1400": large };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const venue = (q.get("venue") ?? "").toLowerCase();
  const section = (q.get("section") ?? "").toLowerCase();
  const type = q.get("type") ?? "";
  const w = q.get("w") ?? "480";
  if (!SAFE.test(venue) || !SAFE.test(section) || !KINDS.has(type) || !(w in WIDTHS)) return new Response("Bad request", { status: 400 });

  const url = `${BUCKET}/venues/${venue}/${type}/${section}.png`;
  try {
    if (!done.has(url)) {
      let job = pending.get(url);
      if (!job) { job = shrink(url).finally(() => pending.delete(url)); pending.set(url, job); }
      done.set(url, await job);
    }
    const out = done.get(url)?.[w as keyof Sized];
    if (!out) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=300" } });
    return new Response(new Uint8Array(out), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400" } });
  } catch {
    return new Response("Bad gateway", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
