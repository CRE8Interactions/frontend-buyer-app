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
    expect(MIXED_MAP_SELECTION_ERROR.message).toBe(
      "You can only select tickets from one row or GA section at a time.",
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
    expect(maxTicketLimitError(4).message).toBe(
      "Adding these tickets would exceed the ticket limit of 4.",
    );
  });

  it("shows the API explanation when a hold is rejected", () => {
    const rejected = checkoutHoldError({
      response: {
        status: 410,
        data: {
          data: null,
          error: {
            status: 410,
            name: "GoneError",
            message:
              'Invalid quantity selected. Offer "BOGO OFFER" requires exactly 4 item(s).',
          },
        },
      },
    });
    expect(rejected.title).toBe(CHECKOUT_UNAVAILABLE_ERROR.title);
    expect(rejected.message).toBe(
      'Invalid quantity selected. Offer "BOGO OFFER" requires exactly 4 item(s).',
    );
  });

  it("falls back to the unavailable copy for an empty body or a 500", () => {
    expect(
      checkoutHoldError({ response: { status: 409, data: { data: null } } }).message,
    ).toBe(CHECKOUT_UNAVAILABLE_ERROR.message);
    expect(
      checkoutHoldError({
        response: {
          status: 500,
          data: { error: { status: 500, message: "Internal server error" } },
        },
      }).message,
    ).toBe(CHECKOUT_UNAVAILABLE_ERROR.message);
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
