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
