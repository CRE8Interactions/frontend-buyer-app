import type { TicketGroup } from "@/stores/filtersStore";

export type ConnectedOfferSummary = {
  id?: string | number;
  name?: string;
  description?: string | null;
  isConnectedOffer?: boolean | null;
  freeOffer?: boolean | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  multipleOf?: number | null;
  incrementsOf?: number | null;
  limit?: number | null;
  accessCode?: string | null;
  am_pricing_objects?: Array<{
    name?: string;
    totalDue?: number;
    price?: number;
  }>;
};

export type GroupWithConnectedOffers = {
  PLName?: string;
  price?: number;
  availableCount?: number;
  offer?: (TicketGroup["offer"] & {
    connected_offers?: ConnectedOfferSummary[];
  }) | null;
};

/** Price tier on a connected offer that matches the parent group's PLName. */
export function connectedOfferUnitPrice(
  group: GroupWithConnectedOffers,
  connected: ConnectedOfferSummary,
): number | null {
  const plName = group.PLName;
  const pricing = connected.am_pricing_objects;
  if (plName && pricing?.length) {
    const match = pricing.find((po) => po.name === plName);
    if (match?.totalDue != null) return Number(match.totalDue);
  }
  return null;
}

/** Whether this catalog row should get its own filter chip. */
export function isStandaloneCatalogOffer(offer: {
  name?: string | null;
  isConnectedOffer?: boolean | null;
}) {
  return Boolean(offer.name?.trim()) && !offer.isConnectedOffer;
}

/**
 * Fan out parent inventory into one row per connected offer, mirroring
 * blocktickets GATickets / MapTooltip flattening.
 */
export function expandGroupsWithConnectedOffers<
  T extends GroupWithConnectedOffers,
>(groups: T[]): T[] {
  const expanded: T[] = [];

  groups.forEach((group) => {
    expanded.push(group);
    const connected = group.offer?.connected_offers;
    if (!connected?.length) return;

    connected.forEach((child) => {
      if (child.id == null && !child.name) return;
      const unit = connectedOfferUnitPrice(group, child);
      if (unit == null && !child.freeOffer) return;

      expanded.push({
        ...group,
        price: unit ?? 0,
        offer: {
          ...child,
          isConnectedOffer: true,
        },
      } as T);
    });
  });

  return expanded;
}
