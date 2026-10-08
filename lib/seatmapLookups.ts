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

/** Contiguous offered seats containing the clicked seat, in venue row order. */
export function adjacentSeatWindow(
  mapping: SeatmapMapping | null,
  clickedSeatId: string,
  offeredSeatIds: string[],
  selectedSeatIds: Set<string>,
  quantity: number,
) {
  const clickedRowId = mapping?.seats?.[clickedSeatId]?.rowId;
  const mappedRow =
    (clickedRowId ? mapping?.rows?.[clickedRowId] : undefined) ??
    Object.values(mapping?.rows ?? {}).find((row) =>
      row.seats.map(String).includes(clickedSeatId),
    );
  const rowOrder = (mappedRow?.seats ?? offeredSeatIds).map(String);
  const offered = new Set(offeredSeatIds);
  const eligible = (id: string) =>
    offered.has(id) && !selectedSeatIds.has(id);
  const clickedIndex = rowOrder.indexOf(clickedSeatId);
  if (clickedIndex < 0 || !eligible(clickedSeatId)) return null;

  const firstStart = Math.min(
    clickedIndex,
    Math.max(0, rowOrder.length - quantity),
  );
  for (
    let start = firstStart;
    start >= Math.max(0, clickedIndex - quantity + 1);
    start -= 1
  ) {
    const seats = rowOrder.slice(start, start + quantity);
    if (
      seats.length === quantity &&
      seats.includes(clickedSeatId) &&
      seats.every(eligible)
    ) {
      return seats;
    }
  }
  return null;
}

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

export const UNAVAILABLE_SECTION_FILL = "#E6E8EC";
export const UNAVAILABLE_SECTION_LABEL = "#353945";
const DEFAULT_AVAILABLE_FILL = "#3E8BF7";

export type SectionAvailability = { total: number; available: number };

export type SectionOverlayPaint = {
  kind: "solid" | "gradient";
  fill: string;
  unavailableFill: string;
  soldOut: boolean;
  labelFill: string;
  ratio: number;
};

function seatIdsForRow(
  rowRef: string,
  rows: Record<string, SeatmapRow> | null | undefined,
) {
  const row = rows?.[rowRef] ?? rows?.[String(rowRef)];
  return Array.isArray(row?.seats) ? row.seats : [];
}

/** Physical seats in the section versus seats that currently have a ticket. */
export function countSectionAvailability(
  section: Pick<SeatmapSection, "rows"> | null | undefined,
  rows: Record<string, SeatmapRow> | null | undefined,
  seatLookupTable: Record<string, unknown> | null | undefined,
): SectionAvailability {
  const rowRefs = Array.isArray(section?.rows) ? section.rows : [];
  const lookup = seatLookupTable || {};
  let total = 0;
  let available = 0;

  for (const rowRef of rowRefs) {
    const seatIds = seatIdsForRow(rowRef, rows);
    total += seatIds.length;
    for (const seatId of seatIds) {
      if (lookup[String(seatId)]) available += 1;
    }
  }

  return { total, available };
}

export function isSectionSoldOut(stats: SectionAvailability | null | undefined) {
  return (stats?.total ?? 0) > 0 && (stats?.available ?? 0) <= 0;
}

export function sectionAvailabilityGradientId(sectionId: string) {
  return `sec-avail-${String(sectionId).replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/**
 * Cover paint for a zoomable section.
 * A sold-out section is the unavailable gray. A partial section splits the
 * cover so the available band matches the share of seats still for sale.
 * Sections with no seat geometry stay on the map fill — we can't tell.
 */
export function sectionOverlayPaint(
  section: Pick<SeatmapSection, "coverFill" | "fill"> | null | undefined,
  stats: SectionAvailability | null | undefined,
): SectionOverlayPaint {
  const availableFill =
    section?.coverFill ?? section?.fill ?? DEFAULT_AVAILABLE_FILL;
  const total = stats?.total ?? 0;
  const available = stats?.available ?? 0;

  if (isSectionSoldOut(stats)) {
    return {
      kind: "solid",
      fill: UNAVAILABLE_SECTION_FILL,
      unavailableFill: UNAVAILABLE_SECTION_FILL,
      soldOut: true,
      labelFill: UNAVAILABLE_SECTION_LABEL,
      ratio: 0,
    };
  }

  if (total <= 0 || available >= total) {
    return {
      kind: "solid",
      fill: availableFill,
      unavailableFill: UNAVAILABLE_SECTION_FILL,
      soldOut: false,
      labelFill: "#FFFFFF",
      ratio: 1,
    };
  }

  const ratio = available / total;
  return {
    kind: "gradient",
    fill: availableFill,
    unavailableFill: UNAVAILABLE_SECTION_FILL,
    soldOut: false,
    labelFill: ratio < 0.5 ? UNAVAILABLE_SECTION_LABEL : "#FFFFFF",
    ratio,
  };
}

/** Venues that use SVG section covers + click-to-zoom. */
const SECTION_COVER_SLUG_SUBSTRINGS = [
  "nmsu",
  "aggie",
  "pan-american",
  "deep-south-ice-and-sports-complex",
];

export function isSectionCoverVenue(venueSlug?: string | null) {
  if (!venueSlug || typeof venueSlug !== "string") return false;
  const s = venueSlug.toLowerCase();
  return SECTION_COVER_SLUG_SUBSTRINGS.some((frag) => s.includes(frag));
}

export type ContentRect = { x: number; y: number; width: number; height: number };

/**
 * Legacy fits the map at 80% of the container; this map fits at 100%. The
 * legacy ZoomLevel % is measured from that smaller fit.
 */
const LEGACY_FIT_RATIO = 0.8;
/** Legacy SvgSeatmap `SEAT_REVEAL_MIN_PERCENT`. */
const SEAT_REVEAL_MIN_PERCENT = 22;

/** Legacy SvgSeatmap `calculateScalePercentage`, against this map's fit scale. */
export function legacyZoomPercent(scale: number, fitScale: number) {
  const base = Math.max(fitScale * LEGACY_FIT_RATIO, 0.001);
  return Number((((scale / base) * 100 - 100) / 10).toFixed(0));
}

/** True when zoom alone is enough to open seats under the view (≈2.56× fit). */
export function seatsRevealAtScale(scale: number, fitScale: number) {
  return legacyZoomPercent(scale, fitScale) >= SEAT_REVEAL_MIN_PERCENT;
}

export function viewportContentRect(
  viewport: { scale: number; posX: number; posY: number },
  size: { width: number; height: number },
): ContentRect | null {
  if (!size.width || !size.height || !viewport.scale) return null;
  const left = (0 - viewport.posX) / viewport.scale;
  const top = (0 - viewport.posY) / viewport.scale;
  const right = (size.width - viewport.posX) / viewport.scale;
  const bottom = (size.height - viewport.posY) / viewport.scale;
  return {
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    width: Math.abs(right - left),
    height: Math.abs(bottom - top),
  };
}

function intersectionArea(a: ContentRect, b: ContentRect) {
  const width = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  );
  const height = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  );
  return width * height;
}

/** Zoomable section under the viewport center, else the one filling most of the view. */
export function sectionIdInViewport(
  viewport: ContentRect,
  bounds: Record<string, ContentRect>,
): string | null {
  const ids = Object.keys(bounds);
  if (!ids.length) return null;
  const centerX = viewport.x + viewport.width / 2;
  const centerY = viewport.y + viewport.height / 2;
  const containing = ids.filter((id) => {
    const rect = bounds[id];
    return (
      centerX >= rect.x &&
      centerX <= rect.x + rect.width &&
      centerY >= rect.y &&
      centerY <= rect.y + rect.height
    );
  });
  const pool = containing.length ? containing : ids;
  let bestId: string | null = null;
  let bestScore = -1;
  for (const id of pool) {
    const rect = bounds[id];
    const area = intersectionArea(viewport, rect);
    if (!containing.length && area <= 0) continue;
    const score = area / Math.max(1, rect.width * rect.height);
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  return bestId;
}

function rectanglesIntersect(a: ContentRect, b: ContentRect) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function rectCenterDistanceSq(a: ContentRect, b: ContentRect) {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

/** Zoomable sections that share an edge with the anchor, using the legacy margin. */
export function neighborSectionIds(
  anchorId: string,
  anchorRect: ContentRect,
  bounds: Record<string, ContentRect>,
): string[] {
  if (!anchorId || !anchorRect) return [];
  const margin = Math.max(
    72,
    Math.min(anchorRect.width, anchorRect.height) * 0.55,
  );
  const expanded: ContentRect = {
    x: anchorRect.x - margin,
    y: anchorRect.y - margin,
    width: anchorRect.width + margin * 2,
    height: anchorRect.height + margin * 2,
  };
  const ids = Object.keys(bounds).filter((id) => id !== anchorId);
  const neighbors = ids.filter((id) =>
    rectanglesIntersect(expanded, bounds[id]),
  );
  if (neighbors.length > 0) return neighbors.slice(0, 32);
  return ids
    .map((id) => ({ id, d2: rectCenterDistanceSq(anchorRect, bounds[id]) }))
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, 16)
    .map((entry) => entry.id);
}

/**
 * A single-letter section and its WC twin (Q and WCQ) share a seam.
 * Opening either side opens both. Double letters such as QQ are left alone.
 */
export function expandWcSeamPairSectionIds(
  sectionIds: string[],
  sections: Record<string, Pick<SeatmapSection, "sectionId" | "sectionNumber">> | null | undefined,
): string[] {
  if (!sections || !sectionIds.length) return sectionIds;
  const set = new Set(sectionIds.map(String));
  const letters = new Set<string>();
  const resolve = (id: string) =>
    sections[id] ??
    Object.values(sections).find((section) => String(section.sectionId) === id);

  for (const id of set) {
    const section = resolve(id);
    if (!section?.sectionId) continue;
    const raw = String(section.sectionNumber ?? "")
      .trim()
      .toUpperCase();
    const compact = raw.replace(/\s+/g, "");
    if (/^[A-Z]$/.test(raw)) letters.add(raw);
    const match = compact.match(/^WC([A-Z])$/);
    if (match) letters.add(match[1]);
  }
  if (!letters.size) return [...set];

  for (const section of Object.values(sections)) {
    if (!section?.sectionId) continue;
    const raw = String(section.sectionNumber ?? "")
      .trim()
      .toUpperCase();
    const compact = raw.replace(/\s+/g, "");
    const sid = String(section.sectionId);
    for (const letter of letters) {
      if (raw === letter || compact === `WC${letter}`) {
        set.add(sid);
        break;
      }
    }
  }
  return Array.from(set);
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
