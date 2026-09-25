import type { GATier, TicketingListing } from "@/components/organisms/PremiumTicketing";
import { expandGroupsWithConnectedOffers } from "@/lib/connectedOffers";
import { gaTierSubtitle, selectionOfferName } from "@/lib/ticketSummary";
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

/** Numeric unit price from a listing's `$12.00` string. */
export function listingUnitPrice(listing: { price?: string; cartGroup?: Record<string, unknown> }) {
  const fromGroup = Number(listing.cartGroup?.price);
  if (Number.isFinite(fromGroup) && fromGroup > 0) return fromGroup;
  return parseFloat(String(listing.price || "").replace(/[^0-9.]/g, "")) || 0;
}

export function sortListingsByPrice<T extends { price?: string; cartGroup?: Record<string, unknown> }>(
  listings: T[],
  sort: "price" | "-price" = "price",
): T[] {
  const dir = sort === "-price" ? -1 : 1;
  return [...listings].sort(
    (a, b) => (listingUnitPrice(a) - listingUnitPrice(b)) * dir,
  );
}

export function listingOfferId(listing: {
  cartGroup?: Record<string, unknown>;
}): string | number | undefined {
  const offer = listing.cartGroup?.offer as { id?: string | number } | undefined;
  return offer?.id;
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

/**
 * Buy-exactly-N quantity. An explicit `limit` wins. Maximum and Multiple Of
 * set to the same number mean the same thing: the shopper can only take that
 * many, not a range of multiples up to it.
 */
function exactQuantityLimit(
  source: QuantityRestrictionSource | null | undefined,
): number | null {
  const explicit = normalizeGlobalTicketLimit(source?.limit);
  if (explicit != null) return explicit;
  const max = normalizeGlobalTicketLimit(source?.maxQuantity);
  const step = normalizeGlobalTicketLimit(
    source?.multipleOf ?? source?.incrementsOf,
  );
  if (max != null && step != null && max === step) return max;
  return null;
}

type QuantityCapSource = QuantityRestrictionSource & {
  id?: string | number | null;
  name?: string | null;
};

type QuantityCapGroup = {
  GA?: boolean;
  generalAdmission?: boolean;
  offer?: QuantityCapSource | null;
  package?: QuantityCapSource | null;
  quantity?: number | null;
  availableCount?: number | null;
  /** Row inventory the seat came from. */
  seatIds?: unknown;
  /** Seat already taken out of that row by this selection. */
  seatId?: unknown;
};

function restrictionSourceFromGroup(
  group: QuantityCapGroup,
): QuantityCapSource | null {
  const source = group.package || group.offer;
  return source ?? null;
}

/** What makes two selected rows read as the same offer to the shopper. */
function selectionOfferKey(group: QuantityCapGroup) {
  const source = restrictionSourceFromGroup(group);
  const identity = source?.id ?? source?.name;
  return identity == null || identity === ""
    ? restrictionSourceKey(source)
    : String(identity);
}

function isGaGroup(group: QuantityCapGroup) {
  return Boolean(group.GA || group.generalAdmission);
}

/** Identity of the quantity rules a group carries, so mixed offers are detectable. */
function restrictionSourceKey(
  source: QuantityRestrictionSource | null | undefined,
) {
  return [
    normalizeGlobalTicketLimit(source?.limit) ?? "",
    normalizeGlobalTicketLimit(source?.minQuantity) ?? "",
    normalizeGlobalTicketLimit(source?.maxQuantity) ?? "",
    normalizeGlobalTicketLimit(source?.multipleOf ?? source?.incrementsOf) ?? "",
  ].join("|");
}

function groupMaxQuantity(group: QuantityCapGroup) {
  return (
    normalizeGlobalTicketLimit(group.offer?.limit) ??
    normalizeGlobalTicketLimit(group.offer?.maxQuantity) ??
    normalizeGlobalTicketLimit(group.package?.limit) ??
    normalizeGlobalTicketLimit(group.package?.maxQuantity)
  );
}

/** The offer/package's own per-order cap, or null when it sets none. */
export function offerMaxQuantity(group: QuantityCapGroup) {
  return groupMaxQuantity(group);
}

/** Shopper-facing name of the offer/package a group sells under. */
export function offerDisplayName(group: QuantityCapGroup) {
  const named = selectionOfferName(
    group as Parameters<typeof selectionOfferName>[0],
    "",
  ).trim();
  if (named) return named;
  const packageName = group.package?.name;
  return typeof packageName === "string" && packageName.trim()
    ? packageName.trim()
    : null;
}

/** Seated rows count as one ticket; GA rows count as their quantity. */
function countCartTickets(groups: QuantityCapGroup[]) {
  return groups.reduce((sum, group) => {
    if (group.GA === true || group.generalAdmission) {
      return sum + (Number(group.quantity) || 0);
    }
    if (group.GA === false) return sum + 1;
    return sum;
  }, 0);
}

/**
 * Limit that adding these tickets would break, or null when the add is allowed.
 * When every offer caps quantity, the strictest cap still bounds the whole order.
 * When one offer does not, only the offer being added is held to its own max —
 * an uncapped offer is not stopped by the other offer's ceiling.
 */
export function exceededSelectionTicketLimit(
  eventLimit: unknown,
  selected: QuantityCapGroup[],
  incoming: QuantityCapGroup[] = [],
  additionalTickets: number,
): number | null {
  const combined = [...selected, ...incoming];
  const everyOfferCaps =
    combined.length > 0 &&
    combined.every((group) => groupMaxQuantity(group) != null);

  if (everyOfferCaps || incoming.length === 0) {
    const limit = selectionTicketLimit(eventLimit, combined);
    if (!limit) return null;
    return countCartTickets(selected) + additionalTickets <= limit ? null : limit;
  }

  const incomingKeys = [...new Set(incoming.map(selectionOfferKey))];
  for (const key of incomingKeys) {
    const sample = incoming.find((group) => selectionOfferKey(group) === key);
    const cap = sample ? groupMaxQuantity(sample) : null;
    if (cap == null) continue;
    const already = countCartTickets(
      selected.filter((group) => selectionOfferKey(group) === key),
    );
    const adding =
      incomingKeys.length === 1
        ? additionalTickets
        : incoming
            .filter((group) => selectionOfferKey(group) === key)
            .reduce((sum, group) => sum + (Number(group.quantity) || 0), 0);
    if (already + adding > cap) return cap;
  }

  const eventCap = normalizeGlobalTicketLimit(eventLimit);
  const addingUncapped = incoming.some((group) => groupMaxQuantity(group) == null);
  if (eventCap == null || !addingUncapped) return null;
  return countCartTickets(selected) + additionalTickets <= eventCap
    ? null
    : eventCap;
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
 * Seats the selected offers hold in their row. Offers on one seat each cover
 * part of the row, and the seats already picked still count, so the pane states
 * the row's total rather than what one offer has left.
 */
/**
 * Highest limit the selected GA offers actually show. Two offers at 26 and 50
 * can be bought up to the larger of those, which is not the 100 GA fallback
 * and not the stricter of the two.
 */
function highestGaOfferLimit(
  selected: QuantityCapGroup[],
  eventLimit: unknown,
) {
  const byOffer = new Map<string, number>();
  selected.forEach((group) => {
    const max = limitsFromTicketGroup(
      group as QuantityCapGroup & RawTicketGroup,
      normalizeGlobalTicketLimit(eventLimit),
    ).max;
    const key = selectionOfferKey(group);
    byOffer.set(key, Math.max(byOffer.get(key) ?? 0, max));
  });
  if (byOffer.size < 2) return null;
  return Math.max(...byOffer.values());
}

function selectionRowInventory(selected: QuantityCapGroup[]) {
  if (selected.length && selected.every(isGaGroup)) {
    const byOffer = new Map<string, number>();
    selected.forEach((group) => {
      const count = sellableCount(group as RawTicketGroup);
      const key = selectionOfferKey(group);
      byOffer.set(key, Math.max(byOffer.get(key) ?? 0, count));
    });
    const total = [...byOffer.values()].reduce((sum, n) => sum + n, 0);
    return total || undefined;
  }
  const seats = new Set<string>();
  selected.forEach((group) => {
    if (Array.isArray(group.seatIds)) {
      group.seatIds.forEach((id) => seats.add(String(id)));
    }
    if (group.seatId != null) seats.add(String(group.seatId));
  });
  return seats.size || undefined;
}

/** Strictest minimum the selected offers impose. */
function selectionMinQuantity(selected: QuantityCapGroup[]) {
  const mins = selected
    .map((group) =>
      normalizeGlobalTicketLimit(restrictionSourceFromGroup(group)?.minQuantity),
    )
    .filter((min): min is number => min != null);
  return mins.length ? Math.max(...mins) : 1;
}

/**
 * Strictest maximum the selected offers impose, but only when every one of them
 * caps quantity. An uncapped offer can carry the order past the other offer's
 * ceiling, so the pane states the row's total instead of that ceiling.
 */
function selectionMaxQuantity(selected: QuantityCapGroup[]) {
  const maxes = selected.map((group) => {
    const source = restrictionSourceFromGroup(group);
    return (
      normalizeGlobalTicketLimit(source?.limit) ??
      normalizeGlobalTicketLimit(source?.maxQuantity)
    );
  });
  return maxes.length && maxes.every((max) => max != null)
    ? Math.min(...maxes)
    : null;
}

/**
 * Full min/max/step copy for the map Your selection pane — mirrors GA tier notes.
 * Clamps max to `selectionPaneTicketLimit()` when that cap is tighter, and to the
 * seats the selected row holds, since that is all the map can assign. A
 * selection spanning two offers uses the strictest minimum. Two GA offers use
 * the higher of the limits they each show; seated offers use a shared maximum
 * only when every one of them caps quantity.
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

  const mixedOffers = new Set(selected.map(selectionOfferKey)).size > 1;
  const highestGaLimit = gaOnly
    ? highestGaOfferLimit(selected, eventLimit)
    : null;
  const source = mixedOffers
    ? {
        minQuantity: selectionMinQuantity(selected),
        maxQuantity: highestGaLimit ?? selectionMaxQuantity(selected),
      }
    : selected
        .map(restrictionSourceFromGroup)
        .find((fromGroup) => fromGroup != null) ??
      fallbackSource ??
      null;

  const limits = quantityLimits(source ?? {}, {
    available: selectionRowInventory(selected),
    defaultMax,
    globalMax: normalizeGlobalTicketLimit(eventLimit),
  });

  if (!limits.valid) {
    if (cap == null) return null;
    const exactLimit = exactQuantityLimit(source);
    const capped = quantityLimits(
      exactLimit != null ? { limit: exactLimit } : { maxQuantity: cap },
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
  const exactLimit = exactQuantityLimit(source);
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

/** Seated offers remain visible on the map even when they require a group. */
export function offerAllowedOnSeatedMap(
  _source?: QuantityRestrictionSource | null,
) {
  return true;
}

/**
 * Ordinary seated offers pick the clicked seat only. Group-restricted offers
 * (BOGO, pairs, exact quantities) use the row inventory so the map can assign
 * the clicked seat and the remaining required seats together.
 */
export function limitsFromSeatedOfferRow(
  group?: QuantityCapGroup & RawTicketGroup,
  globalMax?: number | null,
): QuantityLimits {
  if (!group) return { min: 1, max: 1, step: 1, valid: true };
  const rowAvailable = Array.isArray(group.seatIds)
    ? group.seatIds.length
    : sellableCount(group);
  const limits = limitsFromTicketGroup(
    {
      ...group,
      availableCount: rowAvailable,
      maxContiguous: rowAvailable,
    },
    globalMax,
  );
  // A group offer sells as one block, so the stepper jumps straight to the
  // required quantity on the first click and has nowhere else to go.
  if (limits.min > 1 || limits.step > 1) {
    return { min: limits.min, max: limits.min, step: 1, valid: limits.valid };
  }
  return { min: 1, max: 1, step: 1, valid: true };
}

/** Whether a seated map tooltip should list this offer row. */
export function shouldShowSeatedMapOfferRow(
  _group?: QuantityCapGroup & RawTicketGroup,
  _globalMax?: number | null,
): boolean {
  return true;
}

/** Offers on a seat that shoppers can pick from the seated map. */
export function seatedMapSelectableOffers(
  groups: RawTicketGroup[],
  globalMax?: number | null,
) {
  return groups.filter((group) => shouldShowSeatedMapOfferRow(group, globalMax));
}

export function hasSeatedMapSelectableOffers(
  groups: RawTicketGroup[],
  globalMax?: number | null,
) {
  return seatedMapSelectableOffers(groups, globalMax).length > 0;
}

/**
 * Seated map offer row copy. Ordinary offers sell the clicked seat and say
 * nothing; group-restricted ones name the minimum or exact quantity, not a range.
 */
export function seatedOfferRowRestrictionLabel(
  source: QuantityRestrictionSource | null | undefined,
  _limits?: QuantityLimits,
): string | null {
  const exactLimit = exactQuantityLimit(source);
  if (exactLimit != null && exactLimit > 1) return `Exact of ${exactLimit}`;
  // A multiple is its own floor, and it rounds any configured minimum up to the
  // quantity the stepper will actually jump to.
  const step = positiveInteger(source?.multipleOf ?? source?.incrementsOf, 1);
  const configuredMin = normalizeGlobalTicketLimit(source?.minQuantity) ?? step;
  const min = Math.ceil(configuredMin / step) * step;
  return min > 1 ? `Minimum of ${min}` : null;
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

/**
 * Limits an offer row shows. Configured exact limits stay visible even when
 * inventory makes the offer temporarily unpurchasable.
 */
export function offerRestrictionLimits(
  source: QuantityRestrictionSource | null | undefined,
  limits: QuantityLimits,
): QuantityLimits | null {
  const exactLimit = exactQuantityLimit(source);
  if (exactLimit != null) {
    return { min: exactLimit, max: exactLimit, step: 1, valid: true };
  }

  const offerMax = normalizeGlobalTicketLimit(source?.maxQuantity);
  const offerMin = positiveInteger(source?.minQuantity, 1);
  if (offerMax != null && offerMin === offerMax) {
    const step = positiveInteger(
      source?.multipleOf ?? source?.incrementsOf,
      1,
    );
    return { min: offerMax, max: offerMax, step, valid: true };
  }

  if (!limits.valid) return null;
  return limits;
}

/**
 * Unconstrained GA default: 1–100, no increment. Shown once in the popover
 * header instead of on every offer row.
 */
export function isUnconstrainedGaTicketLimit(
  limits: QuantityLimits | null | undefined,
) {
  return Boolean(
    limits &&
      limits.min === 1 &&
      limits.max === DEFAULT_GA_TICKET_LIMIT &&
      limits.step === 1,
  );
}

/**
 * GA popover offer-row copy. Hide the unconstrained default (1–100).
 */
export function gaOfferRowRestrictionLabel(
  source: QuantityRestrictionSource | null | undefined,
  limits: QuantityLimits,
): string | null {
  const display = offerRestrictionLimits(source, limits);
  if (!display || isUnconstrainedGaTicketLimit(display)) return null;
  return quantityRestrictionLabel(display);
}

/** Header copy when at least one GA offer still uses the 1–100 default. */
export function gaPopoverDefaultLimitLabel(
  rows: Array<QuantityLimits | null>,
): string | null {
  if (!rows.some((row) => isUnconstrainedGaTicketLimit(row))) return null;
  return quantityRestrictionLabel({
    min: 1,
    max: DEFAULT_GA_TICKET_LIMIT,
    step: 1,
    valid: true,
  });
}

/**
 * One shopper-facing limit line for the offers a popover lists: the shared copy
 * when the offers agree, otherwise the full span they allow together.
 */
export function offerListRestrictionLabel(
  rows: Array<QuantityLimits | null>,
): string | null {
  const shown = rows.filter((row): row is QuantityLimits => row != null);
  if (!shown.length) return null;
  const steps = new Set(shown.map((row) => row.step));
  return quantityRestrictionLabel({
    min: Math.min(...shown.map((row) => row.min)),
    max: Math.max(...shown.map((row) => row.max)),
    step: steps.size === 1 ? shown[0].step : 1,
    valid: true,
  });
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
  id?: string | number;
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
  const mapped = expandGroupsWithConnectedOffers(groups)
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
  return sortListingsByPrice(mapped);
}

export function filterGroupsForListings(
  groups: RawTicketGroup[],
  {
    quantity = 0,
    accessible = false,
    sort = "price",
    offerIds = [],
  }: {
    quantity?: number;
    accessible?: boolean;
    sort?: "price" | "-price";
    offerIds?: Array<string | number>;
  } = {},
): RawTicketGroup[] {
  const offerSet = new Set(offerIds.map(String).filter(Boolean));
  let next = groups.filter((group) => {
    if (accessible && !group.accessible) return false;
    if (offerSet.size && !offerSet.has(String(group.offer?.id ?? ""))) {
      return false;
    }
    if (quantity > 0 && !quantityIsAllowed(quantity, limitsFromTicketGroup(group))) {
      return false;
    }
    return true;
  });
  const dir = sort === "-price" ? -1 : 1;
  next = [...next].sort(
    (a, b) => (Number(a.price || 0) - Number(b.price || 0)) * dir,
  );
  return next;
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
