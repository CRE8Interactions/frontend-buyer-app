/** Shopper-facing accessible seating labels and type detection. */

export const ACCESSIBLE_SEAT_COLOR_DA = "#2DEDB4";
export const ACCESSIBLE_SEAT_COLOR_DB = "#F4BC16";
export const ACCESSIBLE_SEAT_COLOR_GENERIC = "#F4BC16";

export const ACCESSIBLE_LABEL_DA = "Accessible: Open space for wheelchair";
export const ACCESSIBLE_LABEL_DB = "Accessible: Chair-back seating";
export const ACCESSIBLE_LABEL_GENERIC = "Accessible seating";

export const WALLET_ACCESSIBLE_LABEL_DA = "Open space for wheelchair";
export const WALLET_ACCESSIBLE_LABEL_DB = "Chair-back seating";

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
  return fieldRecords(source).some((record) => record.accessible === true);
}

/**
 * Ticket details / Your selection copy, matching legacy `getAccessibleLabel`.
 * Empty when the source is not accessible.
 */
export function getAccessibleLabel(source: unknown): string {
  const type = accessibleTypeOf(source);
  if (type === "DA") return ACCESSIBLE_LABEL_DA;
  if (type === "DB") return ACCESSIBLE_LABEL_DB;
  return isAccessibleSource(source) ? ACCESSIBLE_LABEL_GENERIC : "";
}

/** Shorter strings used on Apple / Google Wallet passes. */
export function getWalletAccessibleLabel(source: unknown): string {
  const type = accessibleTypeOf(source);
  if (type === "DA") return WALLET_ACCESSIBLE_LABEL_DA;
  if (type === "DB") return WALLET_ACCESSIBLE_LABEL_DB;
  return isAccessibleSource(source) ? ACCESSIBLE_LABEL_GENERIC : "";
}

export function accessibleSeatColor(accessibleType?: string | null) {
  if (accessibleType === "DA") return ACCESSIBLE_SEAT_COLOR_DA;
  if (accessibleType === "DB") return ACCESSIBLE_SEAT_COLOR_DB;
  return ACCESSIBLE_SEAT_COLOR_GENERIC;
}

export type SeatmapLegendRow = { label: string; color: string };

/**
 * Legend accessibility rows: DA / DB when those types exist on seats or
 * groups; otherwise a single generic Accessibility row.
 */
export function seatmapAccessibilityLegendRows(
  sources: unknown[] = [],
): SeatmapLegendRow[] {
  let hasDa = false;
  let hasDb = false;
  for (const source of sources) {
    const type = accessibleTypeOf(source);
    if (type === "DA") hasDa = true;
    else if (type === "DB") hasDb = true;
  }
  if (hasDa || hasDb) {
    const rows: SeatmapLegendRow[] = [];
    if (hasDa) {
      rows.push({ label: "DA", color: ACCESSIBLE_SEAT_COLOR_DA });
    }
    if (hasDb) {
      rows.push({ label: "DB", color: ACCESSIBLE_SEAT_COLOR_DB });
    }
    return rows;
  }
  return [{ label: "Accessibility", color: ACCESSIBLE_SEAT_COLOR_GENERIC }];
}
