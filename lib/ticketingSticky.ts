/** Gap between the page header and a sticky ticketing card. */
export const TICKETING_STICKY_GAP_PX = 16;

/** Used when the live header has not been measured yet. */
export const TICKETING_HEADER_FALLBACK_PX = 72;

/** Desktop/tablet main padding — small enough not to force a page scrollbar. */
export const TICKETING_MAIN_PAD_TOP_PX = 20;
export const TICKETING_MAIN_PAD_BOTTOM_PX = 24;

/** Listings keep at least this much room; below that the page may scroll. */
export const TICKETING_LISTINGS_MIN_PX = 200;

function resolvedHeaderHeight(headerHeight: number): number {
  return headerHeight > 1 ? headerHeight : TICKETING_HEADER_FALLBACK_PX;
}

/**
 * Viewport `top` for sticky Find-on-map / offers cards so they sit fully
 * below the page header instead of sliding under it and clipping.
 */
export function stickyOffsetBelowHeader(headerHeight: number): number {
  return resolvedHeaderHeight(headerHeight) + TICKETING_STICKY_GAP_PX;
}

/** Header + main padding reserved outside the offers card. */
export function ticketingChromeReservePx(headerHeight: number): number {
  return (
    resolvedHeaderHeight(headerHeight) +
    TICKETING_MAIN_PAD_TOP_PX +
    TICKETING_MAIN_PAD_BOTTOM_PX
  );
}
