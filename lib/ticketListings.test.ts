import { describe, expect, it } from "vitest";
import { groupsToListings, sellableCount } from "@/lib/ticketListings";
import { DEMO_SEATED_TICKET_GROUPS } from "@/lib/demo/fixtures";

describe("sellableCount", () => {
  it("takes the maximum of seat ids, availableCount, and maxContiguous", () => {
    expect(
      sellableCount({
        seatIds: ["a", "b"],
        availableCount: 5,
        maxContiguous: 3,
      }),
    ).toBe(5);
    expect(
      sellableCount({
        seatIds: ["a", "b", "c", "d"],
        availableCount: 2,
        maxContiguous: 3,
      }),
    ).toBe(4);
  });
});

describe("groupsToListings", () => {
  it("maps sellable DEMO groups into listing rows with min/max and zone names", () => {
    const listings = groupsToListings(DEMO_SEATED_TICKET_GROUPS);

    expect(listings).toHaveLength(3);
    expect(listings[0]).toMatchObject({
      zone: "Field Club",
      sec: "M",
      row: "M3",
      min: 1,
      max: 4,
      price: "$33.59",
    });
    expect(listings[1]).toMatchObject({
      zone: "Section A-B",
      min: 2,
      max: 6,
      price: "$21.94",
    });
    expect(listings[2]).toMatchObject({
      zone: "Section M-N & GA",
      sec: "N",
      row: "I",
      min: 1,
      max: 8,
      price: "$11.64",
    });
  });

  it("skips access-coded offers, empty inventory, and duplicate groups", () => {
    const listings = groupsToListings(DEMO_SEATED_TICKET_GROUPS);
    expect(listings.some((l) => l.zone === "VIP Coded")).toBe(false);
    expect(listings.some((l) => l.zone === "Sold Out Row")).toBe(false);
    expect(listings.filter((l) => l.zone === "Section A-B")).toHaveLength(1);
  });

  it("caps max at 20 and falls back to section labels when no offer name", () => {
    const listings = groupsToListings([
      {
        id: 9,
        sectionNumber: "C",
        rowNumber: "1",
        price: 10,
        availableCount: 40,
        maxContiguous: 40,
        seatIds: Array.from({ length: 40 }, (_, i) => `s${i}`),
      },
    ]);
    expect(listings[0].zone).toBe("Section C");
    expect(listings[0].max).toBe(20);
  });

  it("labels GA groups without an offer as General admission", () => {
    const listings = groupsToListings([
      {
        id: 8,
        GA: true,
        price: 12,
        availableCount: 100,
        maxContiguous: 100,
        seatIds: ["g1"],
      },
    ]);
    expect(listings[0]).toMatchObject({
      zone: "General admission",
      sec: "GA",
      row: "GA",
      min: 1,
    });
  });
});
