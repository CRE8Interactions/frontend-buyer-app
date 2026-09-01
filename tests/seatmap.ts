import { fireEvent, waitFor } from "@testing-library/react";
import { __resetSeatmapBackgroundCacheForTests } from "@/components/organisms/SeatMapSelectionOverlay";

/**
 * jsdom never fetches images, so the seat map overlay's background preload sits
 * pending forever and the org loader never clears. Stand in for the browser
 * finishing that download.
 */
export async function finishSeatmapBackgroundLoad() {
  const preload = await waitFor(() => {
    const el = document.querySelector("[data-seatmap-background-preload]");
    if (!el) throw new Error("Seat map background preload has not rendered");
    return el;
  });
  fireEvent.load(preload);
}

/** The overlay remembers loaded artwork for the session; keep tests independent. */
export function resetSeatmapBackgroundCache() {
  __resetSeatmapBackgroundCacheForTests();
}
