import { formatCurrency } from "@/lib/helpers";

export type EventPricingLevel = {
  id?: string | number;
  name?: string;
  price?: number;
  cost?: number;
  basePrice?: number;
  offerPrice?: number;
};

type TicketPriceRow = {
  price?: number;
  cost?: number;
  availableCount?: number;
  quantity?: number;
  maxContiguous?: number;
  seatIds?: unknown[];
  offer?: { accessCode?: string | null } | null;
};

export type EventPriceSource = {
  minPrice?: number;
  lowestPrice?: number;
  price?: number;
  pricingLevels?:
    | Record<string, EventPricingLevel | undefined>
    | EventPricingLevel[]
    | null;
  priceLevels?:
    | Record<string, EventPricingLevel | undefined>
    | EventPricingLevel[]
    | null;
  pricingTiers?: Array<{ price?: number } | null> | null;
  ticketGroups?: TicketPriceRow[] | null;
  ticket_groups?: TicketPriceRow[] | null;
  tickets?: TicketPriceRow[] | null;
  package_tickets?: TicketPriceRow[] | null;
  offers?: Array<{
    am_pricing_objects?: EventPricingLevel[] | null;
    ticketPrices?: Array<{ price?: number } | null> | null;
  } | null> | null;
};

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function levelPrice(level?: EventPricingLevel | null): number | null {
  if (!level) return null;
  return (
    asNumber(level.offerPrice) ??
    asNumber(level.basePrice) ??
    asNumber(level.price) ??
    asNumber(level.cost)
  );
}

function pricingLevelList(
  event?: EventPriceSource | null,
): EventPricingLevel[] {
  const levels = event?.pricingLevels ?? event?.priceLevels;
  if (!levels) return [];
  return (Array.isArray(levels) ? levels : Object.values(levels)).filter(
    (level): level is EventPricingLevel => Boolean(level),
  );
}

/** Lowest configured pricing level on an event. */
export function lowestPricingLevel(
  event?: EventPriceSource | null,
): EventPricingLevel | undefined {
  const levels = pricingLevelList(event);
  if (!levels.length) return undefined;
  return levels.reduce((lowest, level) => {
    const price = levelPrice(level);
    const current = levelPrice(lowest);
    if (price == null) return lowest;
    if (current == null || price < current) return level;
    return lowest;
  });
}

/** P1 / first pricing level — `pricingLevels[1]` on keyed objects, else `[0]`. */
export function firstPricingLevel(
  event?: EventPriceSource | null,
): EventPricingLevel | undefined {
  const levels = event?.pricingLevels ?? event?.priceLevels;
  if (!levels) return undefined;
  if (Array.isArray(levels)) return levels.find(Boolean);
  return levels[1] ?? levels["1"] ?? Object.values(levels).find(Boolean);
}

/**
 * First pricing level on a single event (P1), not ticket inventory and not
 * the cheapest later level.
 */
export function eventFromPrice(event?: EventPriceSource | null): number | null {
  const fromLevel = levelPrice(firstPricingLevel(event));
  if (fromLevel != null) return fromLevel;

  const offer = event?.offers?.[0];
  const fromOffer =
    levelPrice(offer?.am_pricing_objects?.[0]) ??
    asNumber(offer?.ticketPrices?.[0]?.price);
  if (fromOffer != null) return fromOffer;

  return (
    asNumber(event?.lowestPrice) ??
    asNumber(event?.minPrice) ??
    asNumber(event?.price)
  );
}

export type PackagePriceSource = {
  price?: number;
  pricingTiers?:
    | Array<{ price?: number } | null>
    | Record<string, { price?: number } | undefined>
    | null;
};

function pricingTierList(
  pkg?: PackagePriceSource | null,
): Array<{ price?: number }> {
  const tiers = pkg?.pricingTiers;
  if (!tiers) return [];
  if (Array.isArray(tiers)) {
    return tiers.filter((tier): tier is { price?: number } => Boolean(tier));
  }
  return Object.keys(tiers)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => tiers[key])
    .filter((tier): tier is { price?: number } => Boolean(tier));
}

/**
 * Same source as blocktickets: `pricingTiers[0].price`, then `package.price`.
 * Never package ticket inventory.
 */
export function packageFromPrice(
  pkg?: PackagePriceSource | null,
): number | null {
  return asNumber(pricingTierList(pkg)[0]?.price) ?? asNumber(pkg?.price);
}

export function packageFromPriceLabel(
  pkg?: PackagePriceSource | null,
): string | null {
  const amount = packageFromPrice(pkg);
  return amount == null ? null : formatCurrency(amount);
}

/** Package detail FROM copy — integer amounts skip cents, like blocktickets. */
export function formatPackageFromPrice(amount: number): string {
  const n = Number(amount) || 0;
  if (n % 1 === 0) return `From $${n.toLocaleString("en-US")}`;
  return `From ${formatCurrency(n)}`;
}

/** "$45.00" for the first pricing level, or null when none is published. */
export function eventFromPriceLabel(
  event?: EventPriceSource | null,
): string | null {
  const amount = eventFromPrice(event);
  return amount == null ? null : formatCurrency(amount);
}

/** True when stubs can be filled from GET /events by id or uuid. */
export function eventsNeedPriceEnrichment(
  events?: Array<
    EventPriceSource & { id?: string | number; uuid?: string | null }
  > | null,
): boolean {
  if (!events?.length) return false;
  return events.some(
    (event) =>
      eventFromPrice(event) == null && eventDetailRefs([event]).length > 0,
  );
}

export function eventDetailRefs(
  events: Array<{
    id?: string | number;
    uuid?: string | null;
    shortCode?: string | null;
    shortcode?: string | null;
  }>,
): Array<string | number> {
  const refs: Array<string | number> = [];
  for (const event of events) {
    if (event.id != null && event.id !== "") refs.push(event.id);
    else if (event.uuid) refs.push(event.uuid);
    else {
      const code = event.shortCode || event.shortcode;
      if (code) refs.push(code);
    }
  }
  return refs;
}

export function mergeEventDetails<
  T extends {
    id?: string | number;
    uuid?: string;
    shortCode?: string;
    shortcode?: string;
  },
>(stubs: T[], detailed: T[]): T[] {
  const byId = new Map<string, T>();
  const byUuid = new Map<string, T>();
  const byCode = new Map<string, T>();
  detailed.forEach((event) => {
    if (event.id != null && event.id !== "") byId.set(String(event.id), event);
    if (event.uuid) byUuid.set(String(event.uuid), event);
    const code = event.shortCode || event.shortcode;
    if (code) byCode.set(String(code), event);
  });
  return stubs.map((stub) => {
    const code = stub.shortCode || stub.shortcode;
    const full =
      (stub.id != null && stub.id !== ""
        ? byId.get(String(stub.id))
        : undefined) ||
      (stub.uuid ? byUuid.get(String(stub.uuid)) : undefined) ||
      (code ? byCode.get(String(code)) : undefined);
    return full ? { ...stub, ...full } : stub;
  });
}

export function monthEventCountLabel(count: number): string {
  return count === 1 ? "1 event" : `${count} events`;
}

function asEventCount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Full upcoming total for a venue card — never the 3-event browse preview. */
export function venueUpcomingEventCount(venue?: {
  upcomingEventsCount?: number | string;
  eventsCount?: number | string;
  allEvents?: unknown[];
} | null): number {
  if (venue == null) return 0;
  return (
    asEventCount(venue.upcomingEventsCount) ??
    asEventCount(venue.eventsCount) ??
    0
  );
}
