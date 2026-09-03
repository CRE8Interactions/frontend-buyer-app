import type { TicketingListing } from "@/components/organisms/PremiumTicketing";
import type { TicketGroup } from "@/stores/filtersStore";

export type QuantityRestrictionSource = {
  minQuantity?: number | null;
  maxQuantity?: number | null;
  multipleOf?: number | null;
  /** Package API name for the same step as offer `multipleOf`. */
  incrementsOf?: number | null;
  /** Exact quantity. Mutually exclusive with min/max/step. */
  limit?: number | null;
};

export type QuantityLimits = {
  min: number;
  max: number;
  step: number;
  valid: boolean;
};

export type RawTicketGroup = TicketGroup & {
  offer?: TicketGroup["offer"] & {
    minQuantity?: number | null;
    maxQuantity?: number | null;
    multipleOf?: number | null;
    incrementsOf?: number | null;
    limit?: number | null;
  };
};

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

/** How many seats this group can actually sell right now. */
export function sellableCount(g: RawTicketGroup) {
  const fromSeats = Array.isArray(g.seatIds) ? g.seatIds.length : 0;
  const fromAvail = Number(g.availableCount || 0);
  const fromContiguous = Number(g.maxContiguous || 0);
  return Math.max(fromSeats, fromAvail, fromContiguous);
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeGlobalTicketLimit(value: unknown) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

type QuantityCapGroup = {
  GA?: boolean;
  generalAdmission?: boolean;
  offer?: {
    maxQuantity?: number | null;
    limit?: number | null;
  } | null;
  package?: {
    maxQuantity?: number | null;
    limit?: number | null;
  } | null;
};

function isGaGroup(group: QuantityCapGroup) {
  return Boolean(group.GA || group.generalAdmission);
}

function groupMaxQuantity(group: QuantityCapGroup) {
  return (
    normalizeGlobalTicketLimit(group.offer?.limit) ??
    normalizeGlobalTicketLimit(group.offer?.maxQuantity) ??
    normalizeGlobalTicketLimit(group.package?.limit) ??
    normalizeGlobalTicketLimit(group.package?.maxQuantity)
  );
}

/** Offer/package max when set; otherwise the event/package cap. */
export function selectionTicketLimit(
  eventLimit: unknown,
  groups: QuantityCapGroup[] = [],
) {
  const offerCaps = groups
    .map(groupMaxQuantity)
    .filter((n): n is number => n != null);
  if (offerCaps.length) return Math.min(...offerCaps);
  return normalizeGlobalTicketLimit(eventLimit);
}

function highestOfferMaxQuantity(groups: QuantityCapGroup[]) {
  const offerCaps = groups
    .map(groupMaxQuantity)
    .filter((n): n is number => n != null);
  return offerCaps.length ? Math.max(...offerCaps) : null;
}

/**
 * All / quantity list cap: highest offer maxQuantity or limit if any, else the
 * event global limit, else `defaultMax`.
 */
export function ticketQuantityCap(
  eventLimit: unknown,
  groups: QuantityCapGroup[] = [],
  defaultMax?: number | null,
) {
  return (
    highestOfferMaxQuantity(groups) ??
    normalizeGlobalTicketLimit(eventLimit) ??
    normalizeGlobalTicketLimit(defaultMax)
  );
}

export const DEFAULT_SEATED_TICKET_LIMIT = 50;
export const DEFAULT_GA_TICKET_LIMIT = 100;

/** 1…highest offer max or limit, else 1…event limit, else 1…default. */
export function ticketQuantityOptions(
  eventLimit: unknown,
  groups: QuantityCapGroup[] = [],
  defaultMax: number = DEFAULT_SEATED_TICKET_LIMIT,
) {
  const cap = ticketQuantityCap(eventLimit, groups, defaultMax);
  if (cap == null) return [];
  return Array.from({ length: cap }, (_, i) => i + 1);
}

/** Event limit if set; otherwise the highest selected offer/package limit. */
export function selectionPaneTicketLimit(
  eventLimit: unknown,
  selected: QuantityCapGroup[],
) {
  const gaOnly =
    selected.length > 0 && selected.every(isGaGroup);
  return ticketQuantityCap(
    eventLimit,
    selected,
    gaOnly ? DEFAULT_GA_TICKET_LIMIT : DEFAULT_SEATED_TICKET_LIMIT,
  );
}

/** Normalize offer restrictions into quantities the shopper can actually buy. */
export function quantityLimits(
  source: QuantityRestrictionSource | null | undefined,
  {
    available,
    defaultMax,
    globalMax,
  }: {
    available?: number | null;
    defaultMax: number;
    globalMax?: number | null;
  },
): QuantityLimits {
  const exactLimit = normalizeGlobalTicketLimit(source?.limit);
  if (exactLimit != null) {
    const inventoryMax =
      available == null
        ? exactLimit
        : Math.max(0, Math.floor(Number(available) || 0));
    const max = Math.min(exactLimit, inventoryMax);
    return { min: exactLimit, max, step: 1, valid: exactLimit <= max };
  }

  const step = positiveInteger(source?.multipleOf ?? source?.incrementsOf, 1);
  const configuredMin = positiveInteger(source?.minQuantity, 1);
  const offerMax = normalizeGlobalTicketLimit(source?.maxQuantity);
  const configuredMax = offerMax ?? defaultMax;
  const eventMax = offerMax ?? normalizeGlobalTicketLimit(globalMax) ?? configuredMax;
  const inventoryMax =
    available == null
      ? configuredMax
      : Math.max(0, Math.floor(Number(available) || 0));
  const rawMax = Math.min(configuredMax, eventMax, inventoryMax);
  const min = Math.ceil(configuredMin / step) * step;
  const max = Math.floor(rawMax / step) * step;

  return { min, max, step, valid: min <= max };
}

export function quantityIsAllowed(quantity: number, limits: QuantityLimits) {
  return (
    limits.valid &&
    quantity >= limits.min &&
    quantity <= limits.max &&
    quantity % limits.step === 0
  );
}

/** Keep a quantity inside the range and on a valid multiple. */
export function clampQuantity(quantity: number, limits: QuantityLimits) {
  if (!limits.valid) return 0;
  if (quantity <= limits.min) return limits.min;
  if (quantity >= limits.max) return limits.max;
  return Math.max(
    limits.min,
    Math.min(limits.max, Math.floor(quantity / limits.step) * limits.step),
  );
}

export function quantityRestrictionLabel(limits: QuantityLimits) {
  const range =
    limits.min === limits.max
      ? `${limits.min} per order`
      : `${limits.min}–${limits.max} per order`;
  return limits.step > 1 ? `${range} · multiples of ${limits.step}` : range;
}

/**
 * Offer as `GET /events/offers` returns it. Sold-out and hidden offers are
 * filtered out server-side, so every offer that arrives here is on sale.
 */
export type OfferSummary = {
  name?: string;
  isLocked?: boolean;
};

/** Zone label the listings use for a group, before section fallbacks. */
const offerZone = (g: RawTicketGroup) => g.offer?.name?.trim() || "";

/**
 * Access-coded offers in the payload, paired with the code that opens them.
 * `returnLocked` inventory carries its own `accessCode`, so the zone can be
 * shown as a lock chip instead of being dropped from the page.
 */
export function lockedZonesFromGroups(groups: RawTicketGroup[]) {
  const zones: { zone: string; code: string }[] = [];
  groups.forEach((g) => {
    const code = g.offer?.accessCode?.trim();
    const zone = offerZone(g);
    if (!code || !zone || zones.some((z) => z.zone === zone)) return;
    zones.push({ zone, code });
  });
  return zones;
}

/**
 * Filter chips for the offer catalog. Locked offers are only listed when their
 * inventory came back too — without a code to check against, the chip would
 * open an unlock prompt that can never be satisfied.
 */
export function offerChipNames(
  offers: OfferSummary[],
  lockedZones: Array<{ zone: string }> = [],
) {
  const unlockable = new Set(lockedZones.map((z) => z.zone));
  return offers
    .filter((o) => o.name && (!o.isLocked || unlockable.has(o.name)))
    .map((o) => o.name as string);
}

/**
 * Map Strapi ticket groups into PremiumTicketing listings.
 * Skips groups with nothing sellable, and coded offers unless the caller pairs
 * them with `lockedZones` so the page can gate them behind an access code.
 */
export function groupsToListings(
  groups: RawTicketGroup[],
  {
    includeLocked = false,
    globalMax,
  }: { includeLocked?: boolean; globalMax?: number | null } = {},
): TicketingListing[] {
  const seen = new Set<string>();
  return groups
    .filter((g) => includeLocked || !g.offer?.accessCode)
    .filter((g) => sellableCount(g) > 0)
    .filter((g) => {
      const key = `${g.id ?? g.ticketGroupUUID}-${g.offer?.id ?? "default"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((g) => {
      const available = sellableCount(g);
      const contiguous = Number(g.maxContiguous || 0);
      const limits = quantityLimits(g.offer, {
        available: Math.min(
          contiguous > 0 ? contiguous : available,
          available,
        ),
        defaultMax: DEFAULT_SEATED_TICKET_LIMIT,
        globalMax,
      });
      const zone =
        g.offer?.name ||
        (g.GA
          ? "General admission"
          : `Section ${g.sectionNumber || g.sectionName || ""}`.trim());
      return {
        zone,
        tier: g.offer?.name || g.sectionName || "Admission",
        sec: String(g.sectionNumber || g.sectionName || "GA"),
        row: String(g.rowNumber || g.rowName || (g.GA ? "GA" : "—")),
        min: limits.min,
        max: limits.max,
        multipleOf: limits.step,
        price: money(Number(g.price || 0)),
        sectionId: g.sectionId != null ? String(g.sectionId) : undefined,
        cartGroup: g as Record<string, unknown>,
      };
    })
    .filter((listing) => listing.min <= listing.max);
}
