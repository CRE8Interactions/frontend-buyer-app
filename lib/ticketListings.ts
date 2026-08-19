import type { TicketingListing } from "@/components/organisms/PremiumTicketing";
import type { TicketGroup } from "@/stores/filtersStore";

export type RawTicketGroup = TicketGroup & {
  offer?: TicketGroup["offer"] & {
    minQuantity?: number | null;
    maxQuantity?: number | null;
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

/**
 * Map Strapi ticket groups into PremiumTicketing listings.
 * Skips coded offers and groups with nothing sellable.
 */
export function groupsToListings(groups: RawTicketGroup[]): TicketingListing[] {
  const seen = new Set<string>();
  return groups
    .filter((g) => !g.offer?.accessCode)
    .filter((g) => sellableCount(g) > 0)
    .filter((g) => {
      const key = `${g.id ?? g.ticketGroupUUID}-${g.offer?.id ?? "default"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((g) => {
      const available = sellableCount(g);
      const min = Math.max(1, Number(g.offer?.minQuantity || 1));
      const maxCap = Number(g.offer?.maxQuantity || 0);
      const contiguous = Number(g.maxContiguous || 0);
      const max = Math.max(
        min,
        Math.min(
          maxCap > 0 ? maxCap : available,
          contiguous > 0 ? contiguous : available,
          available,
          20,
        ),
      );
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
        min,
        max,
        price: money(Number(g.price || 0)),
        sectionId: g.sectionId != null ? String(g.sectionId) : undefined,
        cartGroup: g as Record<string, unknown>,
      };
    });
}
