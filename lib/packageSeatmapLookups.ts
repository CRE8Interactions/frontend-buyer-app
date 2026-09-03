import type { TicketGroup } from "@/stores/filtersStore";
import type { SeatmapMapping } from "@/lib/seatmapLookups";

export type PackagePurchaseLog = {
  sold_package_tickets?: Array<string | number>;
  section_sold_counts?: Array<{
    sectionId?: string | number;
    soldCount?: number;
  }>;
};

export type PackageForSeatmap = {
  id?: string | number;
  name?: string;
  minQuantity?: number;
  maxQuantity?: number;
  multipleOf?: number;
  incrementsOf?: number;
  limit?: number;
  pricingTiers?: { price?: number }[];
  package_tickets?: TicketGroup[];
};

function packageQuantitySource(eventPackage: PackageForSeatmap) {
  return {
    id: eventPackage.id,
    name: eventPackage.name,
    minQuantity: eventPackage.minQuantity,
    maxQuantity: eventPackage.maxQuantity,
    multipleOf: eventPackage.multipleOf ?? eventPackage.incrementsOf,
    incrementsOf: eventPackage.incrementsOf,
    limit: eventPackage.limit,
  };
}

export { packageQuantitySource };

/**
 * Build seat + section lookup tables for season packages.
 * Mirrors the CRA PackageSeatmapWrapper logic (availability + sibling sold inventory).
 */
export function createPackageLookupTables(
  eventPackage: PackageForSeatmap,
  purchaseLog: PackagePurchaseLog | null | undefined,
  mapping: SeatmapMapping | null | undefined,
) {
  const packageTickets = eventPackage.package_tickets || [];
  const unsold = packageTickets.filter(
    (ticket) => !ticket.on_sale_status || ticket.on_sale_status === "available",
  );
  const seatedTickets = unsold.filter(
    (ticket) => !(ticket.GA || ticket.generalAdmission),
  );

  return {
    seatLookupTable: createPackageSeatLookupTable(
      seatedTickets,
      eventPackage,
      purchaseLog,
    ),
    seatOffersLookupTable: {} as Record<string, TicketGroup[]>,
    sectionLookupTable: createPackageSectionLookupTable(
      unsold,
      eventPackage,
      purchaseLog,
      mapping,
    ),
  };
}

function createPackageSeatLookupTable(
  seatedTickets: TicketGroup[],
  eventPackage: PackageForSeatmap,
  purchaseLog: PackagePurchaseLog | null | undefined,
) {
  const packageTierPrice = eventPackage.pricingTiers?.[0]?.price;
  const lookupTable: Record<string, TicketGroup> = {};

  seatedTickets.forEach((ticket) => {
    if (ticket.seatId == null) return;
    lookupTable[String(ticket.seatId)] = {
      ...ticket,
      GA: false,
      price: packageTierPrice ?? ticket.price,
      resale: false,
      package: packageQuantitySource(eventPackage),
    };
  });

  (purchaseLog?.sold_package_tickets || []).forEach((soldSeatId) => {
    delete lookupTable[String(soldSeatId)];
  });

  return lookupTable;
}

function createPackageSectionLookupTable(
  tickets: TicketGroup[],
  eventPackage: PackageForSeatmap,
  purchaseLog: PackagePurchaseLog | null | undefined,
  mapping: SeatmapMapping | null | undefined,
) {
  const packageTierPrice = eventPackage.pricingTiers?.[0]?.price;
  const lookupTable: Record<string, TicketGroup[]> = {};

  tickets.forEach((ticket) => {
    const isGA = Boolean(ticket.GA || ticket.generalAdmission);
    if (!isGA || ticket.sectionId == null) return;
    const sectionId = String(ticket.sectionId);

    if (!lookupTable[sectionId]) {
      lookupTable[sectionId] = [
        {
          ...ticket,
          GA: true,
          price: packageTierPrice ?? ticket.price,
          package: packageQuantitySource(eventPackage),
          availableCount: 1,
        },
      ];
    } else {
      const entry = lookupTable[sectionId][0];
      entry.availableCount = (entry.availableCount || 0) + 1;
    }
  });

  const soldCounts = purchaseLog?.section_sold_counts;
  if (soldCounts?.length) {
    Object.keys(lookupTable).forEach((sectionId) => {
      const sectionEntry = lookupTable[sectionId][0];
      const sold = soldCounts.find(
        (row) => String(row.sectionId) === sectionId,
      );
      if (!sold) return;

      const sectionCapacity = mapping?.sections?.[sectionId]?.spots?.length;
      if (!sectionCapacity) return;

      const remainingCapacity = sectionCapacity - (sold.soldCount || 0);
      if (remainingCapacity < (sectionEntry.availableCount || 0)) {
        sectionEntry.availableCount = Math.max(0, remainingCapacity);
      }
    });
  }

  return lookupTable;
}
