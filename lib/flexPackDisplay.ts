import { formatEventWhen, type TimezoneLike } from "@/lib/helpers";

export const FLEX_PACK_VOUCHER_FEE_USD = 1;

export type FlexPackCardTone = {
  bg: string;
  ink: string;
};

const TONES: Record<string, FlexPackCardTone> = {
  gold: { bg: "#e8c547", ink: "#1a1a1a" },
  platinum: { bg: "#8d93a0", ink: "#1a1a1a" },
  silver: { bg: "#c5c8ce", ink: "#1a1a1a" },
  club: { bg: "#0b1f3a", ink: "#ffffff" },
  bronze: { bg: "#b87333", ink: "#ffffff" },
};

function hexInk(color: string): string {
  const hex = color.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (full.length < 6) return "#ffffff";
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1a1a1a" : "#ffffff";
}

/** Header fallback when `flex-pack.image` is missing. */
export function flexPackCardTone(
  name?: string,
  color?: string,
  fallback = "#051b35",
): FlexPackCardTone {
  if (color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.trim())) {
    const bg = color.trim();
    return { bg, ink: hexInk(bg) };
  }
  const n = String(name || "").toLowerCase();
  if (n.includes("gold")) return TONES.gold;
  if (n.includes("platinum")) return TONES.platinum;
  if (n.includes("silver")) return TONES.silver;
  if (n.includes("club")) return TONES.club;
  if (n.includes("bronze")) return TONES.bronze;
  return { bg: fallback, ink: hexInk(fallback) };
}

export function flexPackVoucherCount(gameTickets?: number) {
  const count = Number(gameTickets);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

export function flexPackVoucherFee(gameTickets?: number) {
  return flexPackVoucherCount(gameTickets) * FLEX_PACK_VOUCHER_FEE_USD;
}

export function flexPackEachPrice(price?: number, gameTickets?: number) {
  const count = flexPackVoucherCount(gameTickets);
  if (!count || price == null || !Number.isFinite(Number(price))) return null;
  return Number(price) / count;
}

export function flexPackSeasonLabel(
  start?: string,
  end?: string,
  timezone?: TimezoneLike,
) {
  const y1 = formatEventWhen(start, timezone, "YYYY");
  const y2 = formatEventWhen(end, timezone, "YYYY");
  if (y1 && y2 && y1 !== y2) return `${y1}/${String(y2).slice(-2)}`;
  return y1 || y2 || "";
}

export function flexPackSeasonLine(
  pack?: { start?: string; end?: string; venue?: { timezone?: string } } | null,
) {
  const label = flexPackSeasonLabel(
    pack?.start,
    pack?.end,
    pack?.venue?.timezone,
  );
  return label ? `${label} Season · any home game` : "Any home game";
}
