import type { TicketGroup } from "@/stores/filtersStore";

/** Seats that belong to a resale listing. Empty when the group is not a listing. */
export function listingSeatIds(ticketGroup?: TicketGroup | null): string[] {
  if (!ticketGroup?.listing?.id) return [];
  return [
    ...new Set(
      (ticketGroup.seatIds || []).filter(
        (seatId) => seatId != null && seatId !== "",
      ),
    ),
  ];
}

/**
 * A listing is sold only as a complete set. One clicked seat still sends
 * every seat in that listing.
 */
export function cartTicketGroups<T extends TicketGroup>(
  selectedGroups?: T[] | null,
): T[] {
  const groups = selectedGroups || [];
  const listingGroups = groups.filter((group) => group?.listing?.id);
  if (!listingGroups.length) return groups;

  const listingGroup = { ...listingGroups[0] };
  delete listingGroup.seatId;
  const seatIds = listingSeatIds(listingGroup);

  return [
    {
      ...listingGroup,
      seatIds,
      quantity:
        seatIds.length ||
        Number(listingGroup.listing?.quantity) ||
        listingGroup.quantity,
    },
  ];
}
