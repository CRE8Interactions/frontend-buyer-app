import { checkAccessCode } from "@/lib/api";
import {
  createSeatLookupTables,
  createSectionLookupTable,
} from "@/lib/seatmapLookups";
import type { TicketGroup } from "@/stores/filtersStore";

/** Explicit yes from POST /tickets/unlock-style responses. */
function serverAccepted(body: unknown) {
  if (body === true) return true;
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    b.valid === true ||
    b.unlocked === true ||
    b.success === true ||
    b.data === true
  );
}

/**
 * Whether the shopper's code opens an access-coded offer.
 *
 * The backend is asked first so a code rotated after page load still resolves.
 * When it gives no verdict, the code that came down with the locked inventory
 * decides, which keeps unlocking working on events the endpoint doesn't cover.
 */
export async function verifyOfferAccessCode({
  eventId,
  code,
  expected,
}: {
  eventId?: string | number;
  code: string;
  expected?: string;
}) {
  const typed = code.trim();
  if (!typed) return false;
  try {
    const res = await checkAccessCode({ eventId, accessCode: typed });
    if (serverAccepted(res?.data)) return true;
  } catch {
    // Fall through to the code from the inventory payload.
  }
  return !!expected && typed.toUpperCase() === expected.trim().toUpperCase();
}

/** Mark every access-coded inventory row for this offer name as unlocked. */
export function unlockOfferInTicketGroups(
  groups: TicketGroup[],
  offerName: string,
): TicketGroup[] {
  const zone = offerName.trim();
  if (!zone) return groups;
  return groups.map((group) => {
    const name = group.offer?.name?.trim();
    if (name !== zone || !group.offer?.accessCode?.trim()) return group;
    return {
      ...group,
      offer: { ...group.offer, unlocked: true },
    };
  });
}

/** Rebuild map lookups after ticket-group inventory changes. */
export function seatmapLookupsFromTicketGroups(
  groups: TicketGroup[],
  selectedOfferIds: Array<string | number> = [],
) {
  const { lookupTable, offersLookupTable } = createSeatLookupTables(
    groups,
    selectedOfferIds,
  );
  return {
    seatLookupTable: lookupTable,
    seatOffersLookupTable: offersLookupTable,
    sectionLookupTable: createSectionLookupTable(groups),
  };
}
