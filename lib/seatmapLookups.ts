import type { TicketGroup } from "@/stores/filtersStore";

export type SeatmapBackground = {
  url: string;
  width: number;
  height: number;
};

export type SeatmapSeat = {
  seatId: string;
  seatNumber?: string | number;
  rowId?: string;
  sectionId?: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  selected?: boolean;
  accessible?: boolean;
  accessibleType?: string;
  accessiblityType?: string;
  accessibilityType?: string;
};

export type SeatmapRow = {
  rowId: string;
  sectionId?: string;
  seats: string[];
};

export type SeatmapSection = {
  sectionId: string;
  sectionNumber?: string | number;
  path?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  zoomable?: boolean;
  spots?: string[];
  rows?: string[];
  coverPath?: string;
  coverFill?: string;
  coverStroke?: string;
  coverStrokeWidth?: number;
  uncoveredFill?: string;
  identifier?: {
    path?: string;
    fill?: string;
    opacity?: number;
    evenodd?: boolean;
  };
  overlay?: { path?: string };
  svg?: { coverPath?: string };
};

export type SeatmapMapping = {
  sections?: Record<string, SeatmapSection>;
  rows?: Record<string, SeatmapRow>;
  seats?: Record<string, SeatmapSeat>;
};

export function pickTicketGroupForSeat(
  groups: TicketGroup[],
  offerIds?: Array<string | number>,
): TicketGroup {
  if (groups.length === 1) return groups[0];

  if (offerIds?.length) {
    const matching = groups.filter((group) =>
      offerIds.includes(group.offer?.id as string | number),
    );
    if (matching.length > 0) {
      return [...matching].sort(
        (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
      )[0];
    }
  }

  const defaultGroup = groups.find(
    (group) => (group.offer as { isDefaultOffer?: boolean } | undefined)?.isDefaultOffer,
  );
  if (defaultGroup) return defaultGroup;

  return [...groups].sort(
    (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
  )[0];
}

export function getSeatOfferCandidates(
  groups: TicketGroup[],
  offerIds?: Array<string | number>,
): TicketGroup[] {
  if (offerIds?.length) {
    const matching = groups.filter((group) =>
      offerIds.includes(group.offer?.id as string | number),
    );
    if (matching.length > 0) return matching;
  }
  return groups;
}

export function createSeatLookupTables(
  ticketGroups: TicketGroup[],
  offerIds: Array<string | number> = [],
) {
  const candidatesBySeat: Record<string, TicketGroup[]> = {};

  ticketGroups.forEach((ticketGroup) => {
    if (ticketGroup.GA === false) {
      const seatIds = (ticketGroup.seatIds as string[] | undefined) || [];
      seatIds.forEach((seatId) => {
        if (!candidatesBySeat[seatId]) candidatesBySeat[seatId] = [];
        candidatesBySeat[seatId].push(ticketGroup);
      });
    }
  });

  const lookupTable: Record<string, TicketGroup> = {};
  const offersLookupTable: Record<string, TicketGroup[]> = {};

  Object.entries(candidatesBySeat).forEach(([seatId, groups]) => {
    const offers = getSeatOfferCandidates(groups, offerIds).sort(
      (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
    );
    offersLookupTable[seatId] = offers;
    lookupTable[seatId] = pickTicketGroupForSeat(groups, offerIds);
  });

  return { lookupTable, offersLookupTable };
}

export function createSectionLookupTable(ticketGroups: TicketGroup[]) {
  const lookupTable: Record<string, TicketGroup[]> = {};

  ticketGroups.forEach((ticketGroup) => {
    if (!ticketGroup.GA) return;
    const sectionId = String(ticketGroup.sectionId ?? "");
    if (!sectionId) return;
    if (!lookupTable[sectionId]) lookupTable[sectionId] = [];
    lookupTable[sectionId].push(ticketGroup);
  });

  return lookupTable;
}

/** Venues that use SVG section covers + click-to-zoom. */
const SECTION_COVER_SLUG_SUBSTRINGS = ["nmsu", "aggie", "pan-american"];

export function isSectionCoverVenue(venueSlug?: string | null) {
  if (!venueSlug || typeof venueSlug !== "string") return false;
  const s = venueSlug.toLowerCase();
  return SECTION_COVER_SLUG_SUBSTRINGS.some((frag) => s.includes(frag));
}

export function zoomableCoverPathD(section: SeatmapSection) {
  return (
    section.coverPath ||
    section.overlay?.path ||
    section.svg?.coverPath ||
    section.path ||
    ""
  );
}
