import type { GATier, TicketingListing } from "@/components/organisms/PremiumTicketing";
import { expandGroupsWithConnectedOffers } from "@/lib/connectedOffers";
import { gaTierSubtitle } from "@/lib/ticketSummary";
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
  offer?: QuantityRestrictionSource | null;
  package?: QuantityRestrictionSource | null;
};

function restrictionSourceFromGroup(
  group: QuantityCapGroup,
): QuantityRestrictionSource | null {
  const source = group.package || group.offer;
  return source ?? null;
}

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
  if (!groups.length) return null;
  const caps = groups.map(groupMaxQuantity);
  if (caps.some((cap) => cap == null)) return null;
  return Math.max(...(caps as number[]));
}

/**
 * All / quantity list cap: highest offer maxQuantity or limit only when every
 * offer sets one; otherwise the event global limit, else `defaultMax`.
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

/**
 * Full min/max/step copy for the map Your selection pane — mirrors GA tier notes.
 * Clamps max to `selectionPaneTicketLimit()` when that cap is tighter.
 */
export function selectionPaneRestrictionLabel(
  eventLimit: unknown,
  selected: QuantityCapGroup[] = [],
  fallbackSource?: QuantityRestrictionSource | null,
): string | null {
  const cap = selectionPaneTicketLimit(eventLimit, selected);
  const gaOnly = selected.length > 0 && selected.every(isGaGroup);
  const defaultMax = gaOnly
    ? DEFAULT_GA_TICKET_LIMIT
    : DEFAULT_SEATED_TICKET_LIMIT;

  let source: QuantityRestrictionSource | null = null;
  for (const group of selected) {
    const fromGroup = restrictionSourceFromGroup(group);
    if (fromGroup) {
      source = fromGroup;
      break;
    }
  }
  if (!source && fallbackSource) {
    source = fallbackSource;
  }

  const limits = quantityLimits(source ?? {}, {
    available: undefined,
    defaultMax,
    globalMax: normalizeGlobalTicketLimit(eventLimit),
  });

  if (!limits.valid) {
    if (cap == null) return null;
    const capped = quantityLimits(
      normalizeGlobalTicketLimit(source?.limit) != null
        ? { limit: source?.limit }
        : { maxQuantity: cap },
      {
        available: undefined,
        defaultMax,
        globalMax: normalizeGlobalTicketLimit(eventLimit),
      },
    );
    return capped.valid ? quantityRestrictionRangeLabel(capped) : null;
  }

  const { min, step, valid } = limits;
  let { max } = limits;
  if (cap != null && max > cap) {
    max = cap;
    if (min > max) return null;
  }

  return quantityRestrictionRangeLabel({ min, max, step, valid });
}

/** Min/max ticket limit copy without step suffix (Your selection pane). */
export function quantityRestrictionRangeLabel(limits: QuantityLimits) {
  return limits.min === limits.max
    ? `${limits.min} per order`
    : `${limits.min}–${limits.max} per order`;
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

/** Inventory cap passed into quantityLimits for seated vs GA groups. */
export function inventoryCapForLimits(group: RawTicketGroup) {
  const available = sellableCount(group);
  const contiguous = Number(group.maxContiguous || 0);
  if (isGaGroup(group)) return available;
  return Math.min(contiguous > 0 ? contiguous : available, available);
}

/** Single source of truth for offer/package limits across listings, GA, and map. */
export function limitsFromTicketGroup(
  group: QuantityCapGroup & RawTicketGroup,
  globalMax?: number | null,
): QuantityLimits {
  const source = restrictionSourceFromGroup(group);
  const ga = isGaGroup(group);
  return quantityLimits(source, {
    available: inventoryCapForLimits(group),
    defaultMax: ga ? DEFAULT_GA_TICKET_LIMIT : DEFAULT_SEATED_TICKET_LIMIT,
    globalMax,
  });
}

export function limitsFromListing(
  listing: {
    min: number;
    max: number;
    multipleOf?: number;
    cartGroup?: Record<string, unknown>;
  },
  globalMax?: number | null,
): QuantityLimits {
  const group = listing.cartGroup as RawTicketGroup | undefined;
  if (group && (group.offer || group.package)) {
    return limitsFromTicketGroup(group, globalMax);
  }
  return {
    min: listing.min,
    max: listing.max,
    step: Math.max(1, listing.multipleOf || 1),
    valid: listing.min <= listing.max,
  };
}

export function limitsFromGaTier(
  tier: {
    min?: number;
    max?: number;
    multipleOf?: number;
    cartGroup?: Record<string, unknown>;
  },
  globalMax?: number | null,
): QuantityLimits {
  const group = tier.cartGroup as RawTicketGroup | undefined;
  const source = group?.offer || group?.package;
  const tierSource: QuantityRestrictionSource = {
    ...(source || {}),
    minQuantity: tier.min ?? source?.minQuantity,
    maxQuantity: tier.max ?? source?.maxQuantity,
    multipleOf: tier.multipleOf ?? source?.multipleOf ?? source?.incrementsOf,
    limit: source?.limit,
  };
  return quantityLimits(tierSource, {
    available: group ? inventoryCapForLimits(group) : undefined,
    defaultMax: DEFAULT_GA_TICKET_LIMIT,
    globalMax,
  });
}

/** Default quantity filter when listings load. */
export function initialTicketQuantity(
  listings: Array<{
    min: number;
    max: number;
    multipleOf?: number;
    cartGroup?: Record<string, unknown>;
  }>,
  globalMax?: number | null,
) {
  if (
    listings.some((listing) =>
      quantityIsAllowed(2, limitsFromListing(listing, globalMax)),
    )
  ) {
    return 2;
  }
  const minimums = listings
    .map((listing) => limitsFromListing(listing, globalMax))
    .filter((limits) => limits.valid)
    .map((limits) => limits.min);
  return minimums.length ? Math.min(...minimums) : 1;
}

/** Valid picker values for an offer — mirrors blocktickets getValidQuantitiesForTicketGroup. */
export function validQuantityOptions(
  source: QuantityRestrictionSource | null | undefined,
  {
    available,
    defaultMax,
    globalMax,
  }: {
    available?: number;
    defaultMax: number;
    globalMax?: number | null;
  },
) {
  const limits = quantityLimits(source, { available, defaultMax, globalMax });
  if (!limits.valid) return [];
  const options: number[] = [];
  for (let q = limits.min; q <= limits.max; q += limits.step) {
    options.push(q);
  }
  return options;
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

function quantityStepSuffix(step: number) {
  return step > 1 ? ` · Increments of ${step}` : "";
}

export function quantityRestrictionLabel(limits: QuantityLimits) {
  const range = quantityRestrictionRangeLabel(limits);
  return `${range}${quantityStepSuffix(limits.step)}`;
}

/** Listing row copy: `2 – 20 Tickets`. */
export function listingAvailabilityRange(
  min: number,
  max: number,
) {
  if (min === max) {
    return min === 1 ? "1 Ticket" : `${min} Tickets`;
  }
  return `${min} – ${max} Tickets`;
}

/** Ticket details drawer copy: `2-20 tickets available · Increments of 2`. */
export function listingDetailAvailabilityLabel(
  min: number,
  max: number,
  step = 1,
) {
  const tickets =
    min === max
      ? min === 1
        ? "1 ticket"
        : `${min} tickets`
      : `${min}-${max} tickets`;
  const availability = `${tickets} available`;
  return `${availability}${quantityStepSuffix(step)}`;
}

/**
 * Offer as `GET /events/offers` returns it. Sold-out and hidden offers are
 * filtered out server-side, so every offer that arrives here is on sale.
 */
export type OfferSummary = {
  name?: string;
  isLocked?: boolean;
  isConnectedOffer?: boolean | null;
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
    .filter((o) => o.name && !o.isConnectedOffer && (!o.isLocked || unlockable.has(o.name)))
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
  return expandGroupsWithConnectedOffers(groups)
    .filter((g) => includeLocked || !g.offer?.accessCode)
    .filter((g) => sellableCount(g) > 0)
    .filter((g) => {
      const key = `${g.id ?? g.ticketGroupUUID}-${g.offer?.id ?? "default"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((g) => {
      const limits = limitsFromTicketGroup(g, globalMax);
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

/**
 * Map Strapi GA ticket groups into checkout-ready tier cards.
 * Access-coded offers stay visible as locked tiers until the shopper enters a code.
 */
export function groupsToGaTiers(
  groups: RawTicketGroup[],
  {
    globalMax,
    includeLocked = false,
  }: { globalMax?: number | null; includeLocked?: boolean } = {},
): GATier[] {
  const seen = new Set<string>();

  return expandGroupsWithConnectedOffers(groups)
    .filter((g) => includeLocked || !g.offer?.accessCode)
    .filter((g) => {
      const key = `${g.id ?? g.ticketGroupUUID}-${g.offer?.id ?? "default"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((g) => {
      const available = Number(g.availableCount || 0);
      const unit = Number(g.price || 0);
      const offerName = g.offer?.name || g.sectionName || "Standard admission";
      const limits = limitsFromTicketGroup(g, globalMax);
      const soldout = available <= 0;
      const coded = Boolean(g.offer?.accessCode?.trim());
      const state: GATier["state"] = soldout
        ? "soldout"
        : coded
          ? "locked"
          : "live";

      return {
        name: offerName,
        sub: gaTierSubtitle({
          sectionName: g.sectionName != null ? String(g.sectionName) : null,
          sectionNumber: g.sectionNumber != null ? String(g.sectionNumber) : null,
          offer: g.offer,
        }),
        price: unit === 0 || g.offer?.freeOffer ? "Free" : money(unit),
        unit,
        note: `Ticket limit: ${quantityRestrictionLabel(limits)}`,
        state,
        min: limits.min,
        max: limits.max,
        multipleOf: limits.step,
        cartGroup: g as Record<string, unknown>,
      } satisfies GATier;
    })
    .filter((tier) => tier.state === "soldout" || tier.state === "locked" || tier.min <= tier.max)
    .sort((a, b) => {
      const rank: Record<GATier["state"], number> = {
        live: 0,
        locked: 1,
        scheduled: 2,
        soldout: 3,
      };
      return rank[a.state] - rank[b.state];
    });
}
