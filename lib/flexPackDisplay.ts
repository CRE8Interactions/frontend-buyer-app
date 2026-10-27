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
  pack?: {
    start?: string;
    end?: string;
    venue?: { timezone?: TimezoneLike };
  } | null,
) {
  const label = flexPackSeasonLabel(
    pack?.start,
    pack?.end,
    pack?.venue?.timezone,
  );
  return label ? `${label} Season · any home game` : "Any home game";
}

export const FLEX_PACK_FEES_AT_CHECKOUT = "Fees added at checkout";
export const FLEX_PACK_INCLUDES_TAXES_AND_FEES = "Taxes and fees included";

export type FlexPackQuoteInput = {
  price?: unknown;
  gameTickets?: unknown;
  customFees?: unknown;
  custom_fees?: unknown;
  organization?: {
    isTaxable?: unknown;
    taxRate?: { estimatedCombinedRate?: unknown } | null;
    tax_rate?: { estimatedCombinedRate?: unknown } | null;
    fee_structure?: {
      stripeCharge?: unknown;
      stripeServicePecentage?: unknown;
    } | null;
    feeStructure?: {
      stripeCharge?: unknown;
      stripeServicePecentage?: unknown;
    } | null;
  } | null;
} | null | undefined;

export type FlexPackPurchaseQuote = {
  basePrice: number;
  voucherFee: number;
  subtotal: number;
  salesTax: number;
  processingFee: number;
  customFeeAmount: number;
  total: number;
  totalTax: number;
  buyerTotal: number;
  /** True when org tax rate and card-fee settings were on the pack. */
  pricedWithTaxesAndFees: boolean;
};

function roundMoney(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Matches flex-pack checkout, which rounds card math with toFixed. */
function roundTo2(value: unknown): number {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(2));
}

function normalizeRate(value: unknown): number {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return numeric > 1 ? numeric / 100 : numeric;
}

function recordAttributes(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const attributes = record.attributes;
  if (attributes && typeof attributes === "object") {
    return { ...record, ...(attributes as Record<string, unknown>) };
  }
  return record;
}

function parseFlexPackPrice(flexPack: FlexPackQuoteInput): number {
  const raw = flexPack?.price;
  if (raw === null || raw === undefined || raw === "") return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isCompFlexPack(flexPack: FlexPackQuoteInput): boolean {
  return parseFlexPackPrice(flexPack) === 0;
}

function readCustomFees(flexPack: FlexPackQuoteInput): Array<{
  id: number;
  name: string;
  option: string;
  feeAmount: number;
}> {
  const rawSource = flexPack?.customFees ?? flexPack?.custom_fees;
  const raw = Array.isArray(rawSource) ? rawSource : [];
  return raw.flatMap((fee) => {
    const attrs = recordAttributes(fee);
    if (!attrs) return [];
    const id = Number(attrs.id);
    const feeAmount = Number(attrs.feeAmount ?? attrs.fee_amount);
    if (!Number.isFinite(id) || id <= 0) return [];
    if (!Number.isFinite(feeAmount) || feeAmount <= 0) return [];
    const name = String(attrs.name || "Custom fee").trim() || "Custom fee";
    return [
      {
        id,
        name,
        option: String(attrs.option || "amount").toLowerCase(),
        feeAmount,
      },
    ];
  });
}

function customFeeLineAmount(
  fee: { option: string; feeAmount: number },
  percentBase: number,
): number {
  if (fee.option === "percent") {
    return roundMoney((percentBase * fee.feeAmount) / 100);
  }
  return roundMoney(fee.feeAmount);
}

/**
 * Fan charge for a flex pack: pack price, $1 per voucher, sales tax on that
 * subtotal, then card processing. Custom fees are added once and processing
 * is recalculated. `buyerTotal` is what the fan pays.
 */
export function quoteFlexPackPurchase(
  flexPack: FlexPackQuoteInput,
): FlexPackPurchaseQuote {
  const comp = isCompFlexPack(flexPack);
  const basePrice = parseFlexPackPrice(flexPack);
  const voucherFee = comp ? 0 : flexPackVoucherFee(Number(flexPack?.gameTickets));
  const subtotal = roundMoney(basePrice + voucherFee);
  const organization = recordAttributes(flexPack?.organization);
  const taxRateRecord = recordAttributes(
    organization?.taxRate ?? organization?.tax_rate,
  );
  const feeStructure = recordAttributes(
    organization?.fee_structure ?? organization?.feeStructure,
  );
  const pricedWithTaxesAndFees = Boolean(taxRateRecord && feeStructure);
  const taxRate = Number(taxRateRecord?.estimatedCombinedRate);
  const salesTax =
    organization?.isTaxable && !comp && Number.isFinite(taxRate)
      ? roundTo2(subtotal * taxRate)
      : 0;
  const stripeCharge = Number(feeStructure?.stripeCharge || 0);
  const stripeRate = normalizeRate(feeStructure?.stripeServicePecentage);
  const processingFor = (amount: number) => {
    if (comp) return 0;
    const charge = Number(amount) || 0;
    if (charge <= 0) return 0;
    return roundTo2(stripeCharge + charge * stripeRate);
  };
  const processingBeforeCustomFees = processingFor(subtotal + salesTax);
  const chargedBeforeCustom = roundMoney(
    subtotal + salesTax + processingBeforeCustomFees,
  );
  const fees = comp || chargedBeforeCustom <= 0 ? [] : readCustomFees(flexPack);
  const customFeeLines = fees.flatMap((fee) => {
    const amount = customFeeLineAmount(fee, chargedBeforeCustom);
    if (amount <= 0) return [];
    return [{ id: fee.id, name: fee.name, amount }];
  });
  const customFeeAmount = roundMoney(
    customFeeLines.reduce((sum, line) => sum + line.amount, 0),
  );

  let processingFee = processingBeforeCustomFees;
  if (customFeeAmount > 0) {
    const baseWithoutProcessing = roundMoney(
      chargedBeforeCustom - processingBeforeCustomFees,
    );
    const chargeBase = roundMoney(baseWithoutProcessing + customFeeAmount);
    processingFee = processingFor(chargeBase);
  }

  const total = roundMoney(subtotal + customFeeAmount);
  const buyerTotal = roundMoney(total + salesTax + processingFee);

  return {
    basePrice,
    voucherFee,
    subtotal,
    salesTax,
    processingFee,
    customFeeAmount,
    total,
    totalTax: salesTax,
    buyerTotal,
    pricedWithTaxesAndFees,
  };
}

/** Pack price plus custom fees, without the per-voucher fee. */
function flexPackPriceBeforeTaxes(flexPack: FlexPackQuoteInput): number {
  const base = roundMoney(flexPack?.price);
  const rawSource = flexPack?.customFees ?? flexPack?.custom_fees;
  const raw = Array.isArray(rawSource) ? rawSource : [];
  const extra = raw.reduce((sum, fee) => {
    const attrs = recordAttributes(fee);
    if (!attrs) return sum;
    const amount = Number(attrs.feeAmount ?? attrs.fee_amount);
    if (!Number.isFinite(amount) || amount <= 0) return sum;
    const option = String(attrs.option || "amount").toLowerCase();
    const dollars =
      option === "percent" ? roundMoney((base * amount) / 100) : amount;
    return sum + dollars;
  }, 0);
  return roundMoney(base + extra);
}

/** Checkout total when tax and card fees are known; otherwise pack price plus custom fees. */
export function flexPackDisplayPrice(flexPack: FlexPackQuoteInput): number {
  const quote = quoteFlexPackPurchase(flexPack);
  if (quote.pricedWithTaxesAndFees) return quote.buyerTotal;
  return flexPackPriceBeforeTaxes(flexPack);
}

export function flexPackPriceIncludesTaxesAndFees(
  flexPack: FlexPackQuoteInput,
): boolean {
  return quoteFlexPackPurchase(flexPack).pricedWithTaxesAndFees;
}

export function flexPackPriceCaption(flexPack: FlexPackQuoteInput): string {
  return flexPackPriceIncludesTaxesAndFees(flexPack)
    ? FLEX_PACK_INCLUDES_TAXES_AND_FEES
    : FLEX_PACK_FEES_AT_CHECKOUT;
}
