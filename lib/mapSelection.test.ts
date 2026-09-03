import { describe, expect, it } from "vitest";
import {
  DEMO_SEATED_TICKET_GROUPS,
  demoTicketGroups,
} from "@/lib/demo/fixtures";
import {
  CHECKOUT_UNAVAILABLE_ERROR,
  MIXED_MAP_SELECTION_ERROR,
  checkoutHoldError,
  maxTicketLimitError,
  mixedMapSelectionError,
} from "@/lib/mapSelection";

const fieldClub = DEMO_SEATED_TICKET_GROUPS[0];
const sectionA = DEMO_SEATED_TICKET_GROUPS[1];
const gaGroups = demoTicketGroups().ticketGroups;
const ga = gaGroups.find((group) => group.GA && !group.offer)!;
const vip = gaGroups.find((group) => group.GA && group.offer)!;

describe("mixed and checkout map errors", () => {
  it("closes mixed-row picks and asks the shopper to change the selection", () => {
    expect(MIXED_MAP_SELECTION_ERROR.buttonText).toBe("Close");
    expect(MIXED_MAP_SELECTION_ERROR.message).toMatch(
      /one row or GA section at a time\.\.\. Please change your selection\.$/,
    );
    expect(MIXED_MAP_SELECTION_ERROR.leaveMap).toBe(false);
  });

  it("uses the shared unavailable copy for hold failures", () => {
    expect(checkoutHoldError(new Error("network down"))).toEqual(
      CHECKOUT_UNAVAILABLE_ERROR,
    );
    expect(
      checkoutHoldError(new Error("This event is not ready for checkout yet.")).message,
    ).toBe("This event is not ready for checkout yet.");
    expect(maxTicketLimitError(4).message).toMatch(/ticket limit of 4/);
  });
});

describe("mixedMapSelectionError", () => {
  it("allows another seat in the same row", () => {
    expect(
      mixedMapSelectionError(
        [{ ...fieldClub, seatId: "s1" }],
        { ...fieldClub, seatId: "s2" },
      ),
    ).toBeNull();
  });

  it("blocks seats from a different row", () => {
    expect(
      mixedMapSelectionError(
        [{ ...fieldClub, seatId: "s1" }],
        { ...sectionA, seatId: "a1" },
      ),
    ).toEqual(MIXED_MAP_SELECTION_ERROR);
  });

  it("blocks mixing a seated row with a GA section", () => {
    expect(
      mixedMapSelectionError([{ ...fieldClub, seatId: "s1" }], ga),
    ).toEqual(MIXED_MAP_SELECTION_ERROR);
    expect(
      mixedMapSelectionError([{ ...ga, quantity: 2 }], vip),
    ).toEqual(MIXED_MAP_SELECTION_ERROR);
  });
});
