function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function expandHex(hex: string) {
  const raw = hex.replace("#", "").trim();
  if (raw.length === 3) {
    return `#${raw
      .split("")
      .map((c) => c + c)
      .join("")}`.toLowerCase();
  }
  if (raw.length >= 6) return `#${raw.slice(0, 6).toLowerCase()}`;
  return null;
}

function hexToRgb(hex: string) {
  const normalized = expandHex(hex);
  if (!normalized) return null;
  const raw = normalized.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

function isJerseyFill(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lum = (r + g + b) / 3;
  if (lum > 238 || lum < 22) return false;
  if (sat < 0.14) return false;
  return true;
}

function hexLuminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return (rgb.r + rgb.g + rgb.b) / 3;
}

function hexSaturation(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max === 0 ? 0 : (max - min) / max;
}

/** Prefer the brand mark fill over a darker same-hue background in vector logos. */
function pickBrandJerseyFill(counts: Map<string, number>) {
  const entries = [...counts.entries()];
  if (!entries.length) return null;

  const maxCount = Math.max(...entries.map(([, count]) => count));
  const candidates = entries.filter(([, count]) => count >= maxCount * 0.18);
  candidates.sort((a, b) => {
    const lumA = hexLuminance(a[0]);
    const lumB = hexLuminance(b[0]);
    const scoreA = hexSaturation(a[0]) * Math.min(lumA / 120, 1);
    const scoreB = hexSaturation(b[0]) * Math.min(lumB / 120, 1);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b[1] - a[1];
  });
  return candidates[0]?.[0] ?? null;
}

/** Most frequently used fill in a vector logo. */
function pickMostUsedFill(counts: Map<string, number>) {
  let best: string | null = null;
  let bestCount = 0;

  for (const [hex, count] of counts) {
    if (count > bestCount) {
      best = hex;
      bestCount = count;
    }
  }

  return best;
}

/** Panel backdrop from vector logos — rect fills are the canvas, then most-used fill. */
export function panelFillFromSvgMarkup(markup: string) {
  const rectCounts = new Map<string, number>();
  const rectPattern = /<rect\b[^>]*>/gi;

  for (const match of markup.matchAll(rectPattern)) {
    const tag = match[0];
    const fillMatch =
      tag.match(/fill="(#[0-9a-fA-F]{3,8})"/i) ||
      tag.match(/fill='(#[0-9a-fA-F]{3,8})'/i) ||
      tag.match(/fill:\s*(#[0-9a-fA-F]{3,8})/i);
    const normalized = expandHex(fillMatch?.[1] || "");
    if (!normalized) continue;
    rectCounts.set(normalized, (rectCounts.get(normalized) || 0) + 1);
  }

  const rectFill = pickMostUsedFill(rectCounts);
  if (rectFill) return rectFill;

  const counts = new Map<string, number>();
  const patterns = [
    /fill:\s*(#[0-9a-fA-F]{3,8})/g,
    /fill="(#[0-9a-fA-F]{3,8})"/g,
    /fill='(#[0-9a-fA-F]{3,8})'/g,
  ];

  for (const pattern of patterns) {
    for (const match of markup.matchAll(pattern)) {
      const normalized = expandHex(match[1] || "");
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }

  return pickMostUsedFill(counts);
}

/** Most-used saturated SVG fill — exact jersey hex from vector team logos. */
export function jerseyColorFromSvgMarkup(markup: string) {
  const counts = new Map<string, number>();
  const patterns = [
    /fill:\s*(#[0-9a-fA-F]{3,8})/g,
    /fill="(#[0-9a-fA-F]{3,8})"/g,
    /fill='(#[0-9a-fA-F]{3,8})'/g,
  ];

  for (const pattern of patterns) {
    for (const match of markup.matchAll(pattern)) {
      const normalized = expandHex(match[1] || "");
      if (!normalized || !isJerseyFill(normalized)) continue;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }

  return pickBrandJerseyFill(counts);
}

function rgbHue(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  if (max === min) return 0;
  const delta = max - min;
  let hue = 0;
  if (max === rn) hue = ((gn - bn) / delta) % 6;
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;
  hue = Math.round(hue * 60);
  return hue < 0 ? hue + 360 : hue;
}

/** Pick a saturated brand-ish fill from logo pixels. */
export function dominantFromRgba(
  data: Buffer,
  channels: number,
  options?: { deepen?: number },
) {
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

  const factor = options?.deepen ?? 0.78;
  const tone = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c * factor)));
  return rgbToHex(tone(pick.r), tone(pick.g), tone(pick.b));
}

function bucketBrandScore(bucket: {
  sumR: number;
  sumG: number;
  sumB: number;
  weight: number;
}) {
  const r = bucket.sumR / bucket.weight;
  const g = bucket.sumG / bucket.weight;
  const b = bucket.sumB / bucket.weight;
  const lum = (r + g + b) / 3;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lumFit = 1 - Math.min(1, Math.abs(lum - 105) / 105);
  return bucket.weight * sat * (0.3 + lumFit * 0.7);
}

/**
 * Dominant saturated hue from logo pixels — matches jersey fills rather than
 * accents (navy marks, grey details, white type) or dark edge backgrounds.
 */
export function jerseyColorFromRgba(
  data: Buffer,
  channels: number,
  width: number,
  height: number,
) {
  type Bucket = { sumR: number; sumG: number; sumB: number; weight: number };
  const buckets = new Map<number, Bucket>();
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const maxDist = Math.hypot(cx, cy) || 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = channels >= 4 ? data[i + 3] : 255;
      if (a < 100) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = (r + g + b) / 3;

      if (lum > 238 || lum < 22) continue;
      if (sat < 0.18) continue;
      if (lum < 48 && sat > 0.35) continue;

      const dist = Math.hypot(x - cx, y - cy) / maxDist;
      const centerBoost = Math.max(0.35, 1.75 - dist * 0.95);
      const w = sat * (a / 255) * centerBoost;
      const bucketKey = Math.round(rgbHue(r, g, b) / 15) * 15;
      const bucket = buckets.get(bucketKey) || {
        sumR: 0,
        sumG: 0,
        sumB: 0,
        weight: 0,
      };
      bucket.sumR += r * w;
      bucket.sumG += g * w;
      bucket.sumB += b * w;
      bucket.weight += w;
      buckets.set(bucketKey, bucket);
    }
  }

  let best: Bucket | null = null;
  let bestScore = 0;
  for (const bucket of buckets.values()) {
    const score = bucketBrandScore(bucket);
    if (!best || score > bestScore) {
      best = bucket;
      bestScore = score;
    }
  }
  if (!best || best.weight === 0) return null;

  return rgbToHex(
    Math.round(best.sumR / best.weight),
    Math.round(best.sumG / best.weight),
    Math.round(best.sumB / best.weight),
  );
}

function quantizeChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value / 8) * 8));
}

/** Dominant opaque border color — canvas behind the mark, light or dark. */
export function panelBorderFromRgba(
  data: Buffer,
  channels: number,
  width: number,
  height: number,
) {
  type Bucket = { sumR: number; sumG: number; sumB: number; weight: number };
  const buckets = new Map<string, Bucket>();

  const band = Math.max(1, Math.round(Math.min(width, height) * 0.08));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const onBorder =
        x < band || x >= width - band || y < band || y >= height - band;
      if (!onBorder) continue;

      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = channels >= 4 ? data[i + 3] : 255;
      if (a < 100) continue;

      const lum = (r + g + b) / 3;
      if (lum > 245) continue;

      const w = a / 255;
      const key = rgbToHex(quantizeChannel(r), quantizeChannel(g), quantizeChannel(b));
      const bucket = buckets.get(key) || {
        sumR: 0,
        sumG: 0,
        sumB: 0,
        weight: 0,
      };
      bucket.sumR += r * w;
      bucket.sumG += g * w;
      bucket.sumB += b * w;
      bucket.weight += w;
      buckets.set(key, bucket);
    }
  }

  let best: Bucket | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.weight > best.weight) best = bucket;
  }

  if (!best || best.weight === 0) return null;

  return rgbToHex(
    Math.round(best.sumR / best.weight),
    Math.round(best.sumG / best.weight),
    Math.round(best.sumB / best.weight),
  );
}

function mostCommonFillFromRgba(
  data: Buffer,
  channels: number,
  width: number,
  height: number,
) {
  type Bucket = { sumR: number; sumG: number; sumB: number; weight: number };
  const buckets = new Map<string, Bucket>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = channels >= 4 ? data[i + 3] : 255;
      if (a < 100) continue;

      const lum = (r + g + b) / 3;
      if (lum > 245) continue;

      const w = a / 255;
      const key = rgbToHex(quantizeChannel(r), quantizeChannel(g), quantizeChannel(b));
      const bucket = buckets.get(key) || {
        sumR: 0,
        sumG: 0,
        sumB: 0,
        weight: 0,
      };
      bucket.sumR += r * w;
      bucket.sumG += g * w;
      bucket.sumB += b * w;
      bucket.weight += w;
      buckets.set(key, bucket);
    }
  }

  let best: Bucket | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.weight > best.weight) best = bucket;
  }

  if (!best || best.weight === 0) return null;

  return rgbToHex(
    Math.round(best.sumR / best.weight),
    Math.round(best.sumG / best.weight),
    Math.round(best.sumB / best.weight),
  );
}

/** Panel backdrop from raster logos — canvas border first, then largest area. */
export function panelFillFromRgba(
  data: Buffer,
  channels: number,
  width: number,
  height: number,
) {
  return (
    panelBorderFromRgba(data, channels, width, height) ||
    mostCommonFillFromRgba(data, channels, width, height) ||
    meshBackgroundFromRgba(data, channels, width, height)
  );
}

/** Average dark neutral pixels from image borders — matches jersey/card backgrounds. */
export function meshBackgroundFromRgba(
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
