import { getTicketGroups } from "@/lib/api";
import {
  gaTicketsNeedGroupSection,
  withGaTicketGroupSections,
} from "@/lib/ticketSummary";

/**
 * GA holds and orders come back with a generic "ga" section. The event's
 * ticket groups carry the name the shopper picked (e.g. "GA Floor").
 */
export async function ticketsWithGaSections(
  tickets: Array<Record<string, unknown>>,
  event: unknown,
): Promise<Array<Record<string, unknown>>> {
  if (!event || !gaTicketsNeedGroupSection(tickets)) return tickets;
  try {
    const res = await getTicketGroups({
      event,
      quantity: 0,
      offerIds: [],
      priceRange: [0, 500],
      accessCodes: [],
      accessible: false,
      sort: "price",
      returnLocked: true,
    });
    return withGaTicketGroupSections(
      tickets,
      (res.data?.ticketGroups || []) as Array<Record<string, unknown>>,
    );
  } catch {
    return tickets;
  }
}
