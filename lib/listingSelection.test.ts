import { describe, expect, it } from "vitest";
import { DEMO_SEATED_TICKET_GROUPS } from "@/lib/demo/fixtures";
import { cartTicketGroups, listingSeatIds } from "@/lib/listingSelection";

const listing = DEMO_SEATED_TICKET_GROUPS.find((group) => group.listing?.id)!;

describe("listing selection", () => {
  it("keeps both seats from a resale listing", () => {
    expect(listingSeatIds(listing)).toEqual(["a-resale-1", "a-resale-2"]);
  });

  it("sends every seat when the whole listing is selected", () => {
    expect(
      cartTicketGroups([
        { ...listing, seatId: "a-resale-1" },
        { ...listing, seatId: "a-resale-2" },
      ]),
    ).toEqual([
      expect.objectContaining({
        seatIds: ["a-resale-1", "a-resale-2"],
        quantity: 2,
      }),
    ]);
  });

  it("sends the whole listing when one of its seats is selected", () => {
    const [sent] = cartTicketGroups([{ ...listing, seatId: "a-resale-1" }]);
    expect(sent).toMatchObject({
      seatIds: ["a-resale-1", "a-resale-2"],
      quantity: 2,
    });
    expect(sent).not.toHaveProperty("seatId");
  });
});
