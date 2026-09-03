import type { TicketGroup } from "@/stores/filtersStore";
import { expandGroupsWithConnectedOffers } from "@/lib/connectedOffers";

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
  sectionNumber?: string | number;
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

/**
 * Background images reach us in several shapes: a bare URL, a Strapi media
 * object, a `data.attributes` relation, or only a `formats` derivative. Any of
 * them is enough to draw the map, so accept them all.
 */
export function normalizeSeatmapBackground(
  raw: unknown,
): SeatmapBackground | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    return { url: raw, width: 1000, height: 1000 };
  }

  type MediaLike = {
    url?: string;
    width?: number | string;
    height?: number | string;
    formats?: Record<string, { url?: string; width?: number; height?: number }>;
    attributes?: MediaLike;
    data?: MediaLike | MediaLike[];
    image?: MediaLike;
    background?: MediaLike;
  };

  const seen = new Set<MediaLike>();
  const resolve = (node?: MediaLike | MediaLike[] | null): SeatmapBackground | null => {
    if (!node) return null;
    if (Array.isArray(node)) {
      for (const entry of node) {
        const found = resolve(entry);
        if (found) return found;
      }
      return null;
    }
    if (seen.has(node)) return null;
    seen.add(node);

    const derivative =
      node.formats?.large ||
      node.formats?.medium ||
      node.formats?.small ||
      node.formats?.thumbnail;
    const url = node.url || derivative?.url;
    if (url) {
      return {
        url,
        width: Number(node.width) || Number(derivative?.width) || 1000,
        height: Number(node.height) || Number(derivative?.height) || 1000,
      };
    }

    return (
      resolve(node.attributes) ||
      resolve(node.data) ||
      resolve(node.image) ||
      resolve(node.background)
    );
  };

  return resolve(raw as MediaLike);
}

/**
 * Drawing extents of the mapping itself, so a venue with geometry but no
 * background image still gets a usable stage instead of an error state.
 */
export function mappingStageSize(mapping?: SeatmapMapping | null) {
  let width = 0;
  let height = 0;

  Object.values(mapping?.seats || {}).forEach((seat) => {
    width = Math.max(width, (seat.cx || 0) + (seat.w || 0));
    height = Math.max(height, (seat.cy || 0) + (seat.h || 0));
  });

  Object.values(mapping?.sections || {}).forEach((section) => {
    const path = section.path || section.coverPath || "";
    const numbers = path.match(/-?\d+(?:\.\d+)?/g);
    if (!numbers) return;
    numbers.forEach((value, index) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return;
      // Path data alternates x, y — good enough for overall extents.
      if (index % 2 === 0) width = Math.max(width, n);
      else height = Math.max(height, n);
    });
  });

  if (!width || !height) return null;
  // Small margin so edge seats and strokes are not clipped.
  return { width: Math.ceil(width * 1.02), height: Math.ceil(height * 1.02) };
}

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

  expandGroupsWithConnectedOffers(ticketGroups).forEach((ticketGroup) => {
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

  expandGroupsWithConnectedOffers(ticketGroups).forEach((ticketGroup) => {
    if (!ticketGroup.GA) return;
    const sectionId = String(ticketGroup.sectionId ?? "");
    if (!sectionId) return;
    if (!lookupTable[sectionId]) lookupTable[sectionId] = [];
    lookupTable[sectionId].push(ticketGroup);
  });

  return lookupTable;
}

/**
 * Which sections still have something to sell. GA sections carry their
 * inventory on the section itself, while seated sections only carry it on the
 * seats inside their rows — so a section can be sold out even though the
 * mapping gives it a designer-authored fill.
 */
export function createSectionInventoryTable(
  mapping: SeatmapMapping | null | undefined,
  sectionLookupTable: Record<string, TicketGroup[]>,
  seatLookupTable: Record<string, TicketGroup>,
): Record<string, boolean> {
  const table: Record<string, boolean> = {};
  const rows = mapping?.rows || {};

  Object.values(mapping?.sections || {}).forEach((section) => {
    const sectionId = String(section.sectionId ?? "");
    if (!sectionId || table[sectionId]) return;

    if ((sectionLookupTable[sectionId] || []).length > 0) {
      table[sectionId] = true;
      return;
    }

    table[sectionId] = (section.rows || []).some((rowId) =>
      (rows[rowId]?.seats || []).some((seatId) =>
        Boolean(seatLookupTable[String(seatId)]),
      ),
    );
  });

  return table;
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
