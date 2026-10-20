import { describe, expect, it } from "vitest";

import { DEMO_EVENTS } from "@/lib/demo/fixtures";
import {
  eventPromotionalCopy,
  PROMOTIONAL_DESCRIPTION_MAX,
} from "@/lib/promotionalDescription";

const event = DEMO_EVENTS[0];

describe("eventPromotionalCopy", () => {
  it("trims storefront plain text and collapses line breaks", () => {
    expect(
      eventPromotionalCopy({ ...event, promotionalDescription: "  Pink   Night.  " }),
    ).toBe("Pink Night.");
    expect(
      eventPromotionalCopy({
        ...event,
        promotionalDescription: "Free bobblehead\nto the first 1,000 attendees",
      }),
    ).toBe("Free bobblehead to the first 1,000 attendees");
  });

  it("flattens rich-text blocks into one line", () => {
    expect(
      eventPromotionalCopy({
        ...event,
        promotionalDescription: [
          { type: "paragraph", children: [{ type: "text", text: "Pink Night." }] },
          {
            type: "paragraph",
            children: [
              { type: "text", text: "Free" },
              { type: "link", children: [{ type: "text", text: "bobblehead." }] },
            ],
          },
        ],
      }),
    ).toBe("Pink Night. Free bobblehead.");
  });

  it("falls back to promotionalDescriptionText and caps the length", () => {
    const long = "a".repeat(PROMOTIONAL_DESCRIPTION_MAX + 20);
    expect(
      eventPromotionalCopy({ ...event, promotionalDescriptionText: long }),
    ).toHaveLength(PROMOTIONAL_DESCRIPTION_MAX);
  });

  it("returns nothing for a missing, blank, or malformed promo", () => {
    expect(eventPromotionalCopy(event)).toBe("");
    expect(eventPromotionalCopy(null)).toBe("");
    expect(eventPromotionalCopy({ ...event, promotionalDescription: "   " })).toBe("");
    expect(eventPromotionalCopy({ ...event, promotionalDescription: { text: 4 } })).toBe("");
  });
});
