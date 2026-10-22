import { describe, expect, it } from "vitest";
import { DEMO_SEATED_TICKET_GROUPS } from "@/lib/demo/fixtures";
import { cartTicketGroups, listingSeatIds } from "@/lib/listingSelection";

const listing = DEMO_SEATED_TICKET_GROUPS.find((group) => group.listing?.id)!;

describe("listing selection", () => {
  it("keeps both seats from a resale listing", () => {
    expect(listingSeatIds(listing)).toEqual(["a-resale-1", "a-resale-2"]);
  });

  it("sends every seat when the whole listing is selected", () => {
    const result = cartTicketGroups([
      { ...listing, seatId: "a-resale-1", seatNumber: "17" },
      { ...listing, seatId: "a-resale-2", seatNumber: "18" },
    ]);
    expect(result).toEqual([
      expect.objectContaining({
        seatIds: ["a-resale-1", "a-resale-2"],
        quantity: 2,
      }),
    ]);
    expect(result[0]).not.toHaveProperty("seatNumber");
  });

  it("sends only the clicked seat when part of the listing is selected", () => {
    const [sent] = cartTicketGroups([{ ...listing, seatId: "a-resale-1" }]);
    expect(sent).toMatchObject({
      seatIds: ["a-resale-1"],
      quantity: 1,
    });
    expect(sent).not.toHaveProperty("seatId");
  });

  it("keeps a quick pick that already chose the whole listing", () => {
    expect(cartTicketGroups([{ ...listing, quantity: 2 }])).toEqual([
      expect.objectContaining({
        seatIds: ["a-resale-1", "a-resale-2"],
        quantity: 2,
      }),
    ]);
  });

  it("sends a short seat list when a quick pick quantity is not the whole listing", () => {
    expect(cartTicketGroups([{ ...listing, quantity: 1 }])).toEqual([
      expect.objectContaining({
        seatIds: ["a-resale-1"],
        quantity: 1,
      }),
    ]);
  });
});
