export type PopupRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type RevealBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const REVEAL_MARGIN_PX = 12;

/** Shared with seat taps and map pan so a click is not treated as a drag. */
export const SEATMAP_TAP_THRESHOLD_PX = 5;

/** Seat and GA map popovers show this many offer rows before scrolling. */
export const SEATMAP_SEAT_OFFER_ROWS_VISIBLE = 3;

export const SEATMAP_SEAT_OFFER_ROW_HEIGHT_PX = 60;
export const SEATMAP_SEAT_OFFER_ROW_GAP_PX = 8;

/** Max height for a scrollable offer list; null when every row fits without scrolling. */
export function seatmapSeatOfferScrollMaxHeight(
  offerCount: number,
  options?: { pinFirstOffer?: boolean },
): number | null {
  if (offerCount <= SEATMAP_SEAT_OFFER_ROWS_VISIBLE) return null;
  const visibleScrollRows = options?.pinFirstOffer
    ? SEATMAP_SEAT_OFFER_ROWS_VISIBLE - 1
    : SEATMAP_SEAT_OFFER_ROWS_VISIBLE;
  return (
    visibleScrollRows * SEATMAP_SEAT_OFFER_ROW_HEIGHT_PX +
    (visibleScrollRows - 1) * SEATMAP_SEAT_OFFER_ROW_GAP_PX
  );
}

/** @alias seatmapSeatOfferScrollMaxHeight */
export const seatmapOfferScrollMaxHeight = seatmapSeatOfferScrollMaxHeight;

/**
 * Place a cursor-anchored popup so the whole card stays in the viewport. A
 * popup taller or wider than the viewport sits at the margin and scrolls
 * internally rather than hanging off the edge.
 */
export function clampPopupToViewport(
  anchor: { x: number; y: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  { offset = 12, margin = 16 } = {},
): { left: number; top: number } {
  const place = (position: number, length: number, available: number) =>
    Math.max(margin, Math.min(position + offset, available - length - margin));
  return {
    left: place(anchor.x, size.width, viewport.width),
    top: place(anchor.y, size.height, viewport.height),
  };
}

/**
 * How far the map has to pan for a seat-anchored popup to fit inside the map
 * area. The popup keeps pointing at its seat because the seat moves with the
 * same delta, so panning is preferred over clamping the popup off its anchor.
 */
export function panDeltaToRevealPopup(
  rect: PopupRect,
  bounds: RevealBounds,
  margin = REVEAL_MARGIN_PX,
) {
  const minLeft = bounds.left + margin;
  const maxRight = bounds.right - margin;
  const minTop = bounds.top + margin;
  const maxBottom = bounds.bottom - margin;

  let dx = 0;
  if (rect.left < minLeft) {
    dx = minLeft - rect.left;
  } else if (rect.left + rect.width > maxRight) {
    // A popup wider than the map area still starts at the left edge.
    dx = Math.max(maxRight - (rect.left + rect.width), minLeft - rect.left);
  }

  let dy = 0;
  if (rect.top < minTop) {
    dy = minTop - rect.top;
  } else if (rect.top + rect.height > maxBottom) {
    dy = Math.max(maxBottom - (rect.top + rect.height), minTop - rect.top);
  }

  return { dx: Math.round(dx), dy: Math.round(dy) };
}
