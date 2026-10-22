import type { TicketGroup } from "@/stores/filtersStore";

/** Seats that belong to a resale listing. Empty when the group is not a listing. */
export function listingSeatIds(ticketGroup?: TicketGroup | null): string[] {
  if (!ticketGroup?.listing?.id) return [];
  return [
    ...new Set(
      (ticketGroup.seatIds || [])
        .filter((seatId) => seatId != null && seatId !== "")
        .map(String),
    ),
  ];
}

function clickedSeatIds(groups: TicketGroup[]) {
  return [
    ...new Set(
      groups
        .map((group) => group?.seatId)
        .filter((seatId) => seatId != null && seatId !== "")
        .map(String),
    ),
  ];
}

/**
 * A resale listing is sold only as a complete set. Send the seats the fan
 * actually selected so a partial click is rejected, instead of quietly
 * substituting every seat on the listing.
 */
export function cartTicketGroups<T extends TicketGroup>(
  selectedGroups?: T[] | null,
): T[] {
  const groups = selectedGroups || [];
  const listingGroups = groups.filter((group) => group?.listing?.id);
  if (!listingGroups.length) return groups;

  const listingGroup = { ...listingGroups[0] };
  delete listingGroup.seatId;

  const selectedSeatIds = clickedSeatIds(listingGroups);
  const listingSeats = listingSeatIds(listingGroup);
  const requestedQuantity = Number(listingGroup.quantity);
  const fullQuickPick =
    !selectedSeatIds.length &&
    listingSeats.length > 0 &&
    requestedQuantity === listingSeats.length;

  const seatIds = selectedSeatIds.length
    ? selectedSeatIds
    : fullQuickPick
      ? listingSeats
      : listingSeats.slice(
          0,
          Number.isFinite(requestedQuantity) ? requestedQuantity : 0,
        );

  const quantity = selectedSeatIds.length
    ? selectedSeatIds.length
    : Number.isFinite(requestedQuantity)
      ? requestedQuantity
      : seatIds.length || Number(listingGroup.listing?.quantity) || 0;

  // A multi-seat listing is identified by seatIds. A leftover seatNumber
  // belongs to whichever seat was clicked first and makes the cart look
  // like a single seat.
  if (seatIds.length !== 1) delete listingGroup.seatNumber;

  return [
    {
      ...listingGroup,
      seatIds,
      quantity,
    },
  ];
}
