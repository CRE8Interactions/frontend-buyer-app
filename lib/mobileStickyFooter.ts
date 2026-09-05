/** Scrollable content padding above a typical mobile sticky footer bar. */
export function mobileStickyFooterReservePx(
  barHeightPx = 96,
  extraPx = 0,
): string {
  return `calc(${barHeightPx + extraPx}px + env(safe-area-inset-bottom, 0px))`;
}
