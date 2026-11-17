/** Shopper-facing accessible seating labels and type detection. */

export const ACCESSIBLE_SEAT_COLOR_DA = "#2DEDB4";
export const ACCESSIBLE_SEAT_COLOR_DB = "#F4BC16";
export const ACCESSIBLE_SEAT_COLOR_GENERIC = "#F4BC16";

export const ACCESSIBLE_LABEL_DA = "Open space for wheelchair";
export const ACCESSIBLE_LABEL_DB = "Chair-back seating";
export const ACCESSIBLE_LABEL_GENERIC = "Accessible seating";

type AccessibleFields = {
  accessible?: unknown;
  accessibleType?: unknown;
  accessiblityType?: unknown;
  accessibilityType?: unknown;
  raw?: unknown;
  cartGroup?: unknown;
  ticketGroup?: unknown;
};

function asRecord(value: unknown): AccessibleFields | null {
  if (!value || typeof value !== "object") return null;
  return value as AccessibleFields;
}

function fieldRecords(source: unknown): AccessibleFields[] {
  const root = asRecord(source);
  if (!root) return [];
  const nested = [root.raw, root.cartGroup, root.ticketGroup]
    .map(asRecord)
    .filter((record): record is AccessibleFields => record != null);
  return [root, ...nested];
}

function typeFromRecord(record: AccessibleFields): string {
  const raw =
    record.accessibleType ||
    record.accessiblityType ||
    record.accessibilityType;
  return typeof raw === "string" ? raw.trim() : "";
}

/** Legacy listings use a truthy `accessible` flag, not only boolean true. */
function accessibleFlag(value: unknown) {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "t" || normalized === "1";
  }
  return false;
}

/** DA / DB / other code from a seat, group, cart ticket, or wallet `raw`. */
export function accessibleTypeOf(source: unknown): string {
  for (const record of fieldRecords(source)) {
    const type = typeFromRecord(record);
    if (type) return type;
  }
  return "";
}

export function isAccessibleSource(source: unknown): boolean {
  if (accessibleTypeOf(source)) return true;
  return fieldRecords(source).some((record) => accessibleFlag(record.accessible));
}

/**
 * Accessible seating copy shared by Ticket details, Your selection, and
 * Apple / Google Wallet passes. Empty when the source is not accessible.
 */
export function getAccessibleLabel(source: unknown): string {
  const type = accessibleTypeOf(source);
  if (type === "DA") return ACCESSIBLE_LABEL_DA;
  if (type === "DB") return ACCESSIBLE_LABEL_DB;
  return isAccessibleSource(source) ? ACCESSIBLE_LABEL_GENERIC : "";
}

/**
 * Listing filter and listing-row icon. Legacy filters on the group's own
 * `accessible` flag only, so a type without the flag does not count.
 */
export function hasAccessibleFlag(source: unknown): boolean {
  return fieldRecords(source).some((record) => accessibleFlag(record.accessible));
}

/**
 * Ticket details and selection copy. Legacy reads the selected seat first,
 * then the group, and shows the label when either one has a type or flag.
 */
export function accessibleLabelForTicket(group: unknown, seat?: unknown): string {
  const type = accessibleTypeOf(seat) || accessibleTypeOf(group);
  if (type === "DA") return ACCESSIBLE_LABEL_DA;
  if (type === "DB") return ACCESSIBLE_LABEL_DB;
  const flagged = hasAccessibleFlag(seat) || hasAccessibleFlag(group);
  return type || flagged ? ACCESSIBLE_LABEL_GENERIC : "";
}

/**
 * A listing whose ticket group isn't flagged can still be accessible seat by
 * seat. The first mapped seat that is accessible names the icon.
 */
export function accessibleLabelFromSeats(
  group: { seatIds?: unknown } | null | undefined,
  mapping: { seats?: Record<string, unknown> } | null | undefined,
) {
  const ids = Array.isArray(group?.seatIds) ? group.seatIds : [];
  const seats = mapping?.seats;
  if (!seats) return "";
  for (const id of ids) {
    const label = getAccessibleLabel(seats[String(id)]);
    if (label) return label;
  }
  return "";
}

export function accessibleSeatColor(accessibleType?: string | null) {
  if (accessibleType === "DA") return ACCESSIBLE_SEAT_COLOR_DA;
  if (accessibleType === "DB") return ACCESSIBLE_SEAT_COLOR_DB;
  return ACCESSIBLE_SEAT_COLOR_GENERIC;
}

export type SeatmapLegendRow = { label: string; color: string };

/** Seats, groups, and the listing or offer nested on a group. */
function legendCandidates(source: unknown): unknown[] {
  const root = asRecord(source);
  if (!root) return [source];
  const nested = ["listing", "offer"]
    .map((key) => (root as Record<string, unknown>)[key])
    .filter((value) => value && typeof value === "object");
  return [source, ...nested];
}

function legendAccessibleType(source: unknown): string {
  for (const candidate of legendCandidates(source)) {
    const type = accessibleTypeOf(candidate).toUpperCase();
    if (type) return type;
  }
  return "";
}

/**
 * Legend accessibility rows, matching the legacy map legend.
 * DA and DB each get a row when that type is on a seat, group, listing, or
 * offer. A generic "Accessible" row appears only when something is flagged
 * accessible with no DA/DB type, and only when neither typed row is present.
 */
export function seatmapAccessibilityLegendRows(
  sources: unknown[] = [],
): SeatmapLegendRow[] {
  let hasDa = false;
  let hasDb = false;
  let hasGeneric = false;
  for (const source of sources) {
    const type = legendAccessibleType(source);
    if (type === "DA") hasDa = true;
    else if (type === "DB") hasDb = true;
    else if (
      legendCandidates(source).some(
        (candidate) =>
          !accessibleTypeOf(candidate) && isAccessibleSource(candidate),
      )
    ) {
      hasGeneric = true;
    }
  }
  const rows: SeatmapLegendRow[] = [];
  if (hasDa) {
    rows.push({
      label: "Accessible - Open space",
      color: ACCESSIBLE_SEAT_COLOR_DA,
    });
  }
  if (hasDb) {
    rows.push({
      label: "Accessible - Chairback",
      color: ACCESSIBLE_SEAT_COLOR_DB,
    });
  }
  if (!hasDa && !hasDb && hasGeneric) {
    rows.push({
      label: "Accessible",
      color: ACCESSIBLE_SEAT_COLOR_GENERIC,
    });
  }
  return rows;
}
