import { describe, expect, it } from "vitest";
import { mobileSeatPopupPosition } from "@/components/organisms/InteractiveSeatmap/SeatmapTooltip";
import { panDeltaToRevealPopup } from "@/lib/seatmapPopup";

describe("mobileSeatPopupPosition", () => {
  it("places the caret tip on the anchor y when card height is known", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 390,
    });

    const cardHeight = 120;
    const anchorY = 400;
    const position = mobileSeatPopupPosition({ x: 200, y: anchorY }, 280, cardHeight);

    expect(position.top).toBe(anchorY - cardHeight - 10);
    expect(position.caretLeft + position.left + 10).toBe(200);
  });
});

describe("panDeltaToRevealPopup", () => {
  const bounds = { left: 0, top: 0, right: 1000, bottom: 800 };

  it("leaves the map alone when the popup already fits", () => {
    expect(
      panDeltaToRevealPopup({ left: 300, top: 200, width: 280, height: 140 }, bounds),
    ).toEqual({ dx: 0, dy: 0 });
  });

  it("pans down and left so a popup off the top-right corner fits", () => {
    expect(
      panDeltaToRevealPopup({ left: 900, top: -40, width: 280, height: 140 }, bounds),
    ).toEqual({ dx: -192, dy: 52 });
  });

  it("aligns a popup taller than the map to the top margin", () => {
    expect(
      panDeltaToRevealPopup({ left: 300, top: 100, width: 280, height: 900 }, bounds),
    ).toEqual({ dx: 0, dy: -88 });
  });
});
