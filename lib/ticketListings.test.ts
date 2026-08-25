import { describe, expect, it } from "vitest";
import {
  groupsToListings,
  lockedZonesFromGroups,
  normalizeGlobalTicketLimit,
  offerChipNames,
  clampQuantity,
  quantityIsAllowed,
  quantityLimits,
  quantityRestrictionLabel,
  sellableCount,
} from "@/lib/ticketListings";
import { DEMO_SEATED_TICKET_GROUPS } from "@/lib/demo/fixtures";

const CODED_GROUP = DEMO_SEATED_TICKET_GROUPS.find(
  (g) => g.offer?.accessCode,
);
if (!CODED_GROUP?.offer?.name || !CODED_GROUP.offer.accessCode) {
  throw new Error("demo fixtures need an access-coded ticket group");
}
const CODED_OFFER = {
  name: CODED_GROUP.offer.name,
  code: CODED_GROUP.offer.accessCode,
};

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

describe("offer quantity restrictions", () => {
  const offer = DEMO_SEATED_TICKET_GROUPS[1].offer;

  it("combines minimum, maximum, multiple, and available inventory", () => {
    const limits = quantityLimits(
      { ...offer, minQuantity: 3, maxQuantity: 10, multipleOf: 2 },
      { available: 9, defaultMax: 20 },
    );

    expect(limits).toEqual({ min: 4, max: 8, step: 2, valid: true });
    expect(quantityIsAllowed(4, limits)).toBe(true);
    expect(quantityIsAllowed(5, limits)).toBe(false);
    expect(clampQuantity(7, limits)).toBe(6);
    expect(quantityRestrictionLabel(limits)).toBe(
      "4–8 per order · multiples of 2",
    );
  });

  it("applies the event's global limit before aligning to the offer multiple", () => {
    const limits = quantityLimits(
      { ...offer, maxQuantity: 10, multipleOf: 2 },
      { available: 20, defaultMax: 20, globalMax: 5 },
    );

    expect(limits).toEqual({ min: 2, max: 4, step: 2, valid: true });
    expect(normalizeGlobalTicketLimit("19")).toBe(19);
    expect(normalizeGlobalTicketLimit(0)).toBeNull();
  });

  it("marks an offer unavailable when no permitted multiple fits", () => {
    expect(
      quantityLimits(
        { ...offer, minQuantity: 5, maxQuantity: 5, multipleOf: 2 },
        { available: 10, defaultMax: 20 },
      ).valid,
    ).toBe(false);
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
    expect(listings.some((l) => l.zone === CODED_OFFER.name)).toBe(false);
    expect(listings.some((l) => l.zone === "Sold Out Row")).toBe(false);
    expect(listings.filter((l) => l.zone === "Section A-B")).toHaveLength(1);
  });

  it("keeps access-coded offers when the caller gates them behind a code", () => {
    const listings = groupsToListings(DEMO_SEATED_TICKET_GROUPS, {
      includeLocked: true,
    });
    expect(listings.some((l) => l.zone === CODED_OFFER.name)).toBe(true);
    expect(listings.some((l) => l.zone === "Sold Out Row")).toBe(false);
  });

  it("maps offer multiples into seated listing limits", () => {
    const source = DEMO_SEATED_TICKET_GROUPS[1];
    const listings = groupsToListings([
      {
        ...source,
        offer: {
          ...source.offer,
          minQuantity: 3,
          maxQuantity: 10,
          multipleOf: 2,
        },
      },
    ]);

    expect(listings[0]).toMatchObject({
      min: 4,
      max: 6,
      multipleOf: 2,
    });
  });

  it("caps every seated offer at the event's global ticket limit", () => {
    const listings = groupsToListings(DEMO_SEATED_TICKET_GROUPS, {
      globalMax: 3,
    });

    expect(listings.every((listing) => listing.max <= 3)).toBe(true);
  });
});

describe("lockedZonesFromGroups", () => {
  it("pairs each coded offer with the code that opens it", () => {
    expect(lockedZonesFromGroups(DEMO_SEATED_TICKET_GROUPS)).toEqual([
      { zone: CODED_OFFER.name, code: CODED_OFFER.code },
    ]);
  });
});

describe("offerChipNames", () => {
  it("lists locked offers that have inventory to unlock", () => {
    const offers = [
      { name: "Standard Admission", isLocked: false },
      { name: CODED_OFFER.name, isLocked: true },
    ];

    expect(
      offerChipNames(offers, lockedZonesFromGroups(DEMO_SEATED_TICKET_GROUPS)),
    ).toEqual(["Standard Admission", CODED_OFFER.name]);
  });

  it("drops locked offers with no inventory and unnamed offers", () => {
    const offers = [
      { name: "Standard Admission", isLocked: false },
      { name: "Free Offer", isLocked: true },
      { isLocked: false },
    ];

    expect(offerChipNames(offers, [])).toEqual(["Standard Admission"]);
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
