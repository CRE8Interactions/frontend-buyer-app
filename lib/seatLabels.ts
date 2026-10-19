function labelText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readSource(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const source = value as { additionalLabel?: unknown; seatId?: unknown };
  return source;
}

function seatIdOf(source: { seatId?: unknown } | null) {
  const seatId = source?.seatId;
  if (seatId == null || seatId === "") return "";
  return String(seatId);
}

/**
 * Custom seat copy. Ticket wins, then the ticket group, the map seat, and
 * finally the seatmap's seatLabels index.
 */
export function getSeatAdditionalLabel({
  mapSeat,
  ticket,
  ticketGroup,
  seatLabels,
}: {
  mapSeat?: unknown;
  ticket?: unknown;
  ticketGroup?: unknown;
  seatLabels?: Record<string, unknown> | null;
} = {}) {
  const ticketSource = readSource(ticket);
  const groupSource = readSource(ticketGroup);
  const mapSource = readSource(mapSeat);
  const direct =
    labelText(ticketSource?.additionalLabel) ||
    labelText(groupSource?.additionalLabel) ||
    labelText(mapSource?.additionalLabel);
  if (direct) return direct;
  const seatId =
    seatIdOf(ticketSource) || seatIdOf(groupSource) || seatIdOf(mapSource);
  if (!seatId || !seatLabels) return "";
  return labelText(seatLabels[seatId]);
}
