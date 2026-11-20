import sharp from "sharp";

/* The accent colour of a logo, for theming the opponent's half of a matchup stage: the most prominent saturated hue, ignoring white, black, grey and transparent pixels.
   Server only. Results are kept for the life of the server so each logo is fetched once. */
const cache = new Map<string, Promise<string | undefined>>();

async function compute(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), next: { revalidate: 86400 } });
    if (!res.ok) return undefined;
    const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).resize(48, 48, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const bins = Array.from({ length: 24 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < data.length; i += info.channels) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 200) continue;
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      const v = max / 255, s = max ? d / max : 0;
      if (v < 0.22 || s < 0.28) continue;
      const h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      const bin = bins[Math.floor((h / 6) * 24) % 24], w = s * v;
      bin.w += w; bin.r += r * w; bin.g += g * w; bin.b += b * w;
    }
    const best = bins.reduce((x, y) => (y.w > x.w ? y : x));
    if (best.w < 1) return undefined;
    const hex = (n: number) => Math.round(n / best.w).toString(16).padStart(2, "0");
    return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`;
  } catch {
    return undefined;
  }
}

export function accentColor(url: string): Promise<string | undefined> {
  let hit = cache.get(url);
  if (!hit) { hit = compute(url); cache.set(url, hit); }
  return hit;
}
