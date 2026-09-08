import { describe, expect, it } from "vitest";
import { mobileSeatPopupPosition } from "@/components/organisms/InteractiveSeatmap/SeatmapTooltip";

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
