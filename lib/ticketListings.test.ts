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
  selectionPaneTicketLimit,
  selectionTicketLimit,
  ticketQuantityCap,
  ticketQuantityOptions,
  DEFAULT_GA_TICKET_LIMIT,
  DEFAULT_SEATED_TICKET_LIMIT,
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
    expect(
      quantityLimits(
        { minQuantity: 3, maxQuantity: 10, incrementsOf: 2 },
        { available: 9, defaultMax: 20 },
      ),
    ).toEqual(limits);
  });

  it("uses the offer max when set and the event cap only when the offer has none", () => {
    expect(
      quantityLimits(
        { ...offer, maxQuantity: 10, multipleOf: 2 },
        { available: 20, defaultMax: 20, globalMax: 5 },
      ),
    ).toEqual({ min: 2, max: 10, step: 2, valid: true });
    expect(
      quantityLimits(
        { ...offer, maxQuantity: null, multipleOf: 2 },
        { available: 20, defaultMax: 20, globalMax: 5 },
      ),
    ).toEqual({ min: 2, max: 4, step: 2, valid: true });
    expect(normalizeGlobalTicketLimit("19")).toBe(19);
    expect(normalizeGlobalTicketLimit(0)).toBeNull();
  });

  it("treats offer.limit as the exact quantity and ignores min, max, and multipleOf", () => {
    const limits = quantityLimits(
      { ...offer, limit: 4, minQuantity: 2, maxQuantity: 8, multipleOf: 2 },
      { available: 20, defaultMax: 20, globalMax: 5 },
    );

    expect(limits).toEqual({ min: 4, max: 4, step: 1, valid: true });
    expect(quantityIsAllowed(4, limits)).toBe(true);
    expect(quantityIsAllowed(2, limits)).toBe(false);
    expect(quantityRestrictionLabel(limits)).toBe("4 per order");
    expect(
      quantityLimits({ limit: 4 }, { available: 2, defaultMax: 20 }).valid,
    ).toBe(false);
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

  it("uses the selected offer max when it is set, not the event cap", () => {
    const offer = DEMO_SEATED_TICKET_GROUPS[1];
    expect(selectionTicketLimit(null, [offer])).toBe(
      offer.offer?.maxQuantity,
    );
    expect(selectionTicketLimit(3, [offer])).toBe(offer.offer?.maxQuantity);
    expect(selectionTicketLimit(10, [{ offer: { maxQuantity: null } }])).toBe(
      10,
    );
    expect(selectionTicketLimit(10, [{ offer: { limit: 4 } }])).toBe(4);
  });

  it("lists the highest offer maxQuantity or limit, else the event limit, else the default", () => {
    const fieldClub = DEMO_SEATED_TICKET_GROUPS[0];
    const sectionAB = DEMO_SEATED_TICKET_GROUPS[1];
    const sectionMN = DEMO_SEATED_TICKET_GROUPS[5];
    expect(ticketQuantityCap(3, [sectionAB, sectionMN])).toBe(
      sectionMN.offer?.maxQuantity,
    );
    expect(
      ticketQuantityCap(3, [
        { ...fieldClub, offer: { ...fieldClub.offer, limit: 10 } },
        sectionAB,
      ]),
    ).toBe(10);
    expect(ticketQuantityCap(3, [fieldClub])).toBe(3);
    expect(ticketQuantityCap(null, [fieldClub], DEFAULT_SEATED_TICKET_LIMIT)).toBe(
      DEFAULT_SEATED_TICKET_LIMIT,
    );
    expect(ticketQuantityCap(null, [sectionAB])).toBe(
      sectionAB.offer?.maxQuantity,
    );
    expect(ticketQuantityOptions(3, [sectionAB, sectionMN])).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(
      ticketQuantityOptions(3, [
        { ...fieldClub, offer: { ...fieldClub.offer, limit: 10 } },
      ]),
    ).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
    expect(ticketQuantityOptions(3, [fieldClub])).toEqual([1, 2, 3]);
    expect(ticketQuantityOptions(null, [fieldClub])).toEqual(
      Array.from({ length: DEFAULT_SEATED_TICKET_LIMIT }, (_, i) => i + 1),
    );
    expect(selectionPaneTicketLimit(8, [sectionAB])).toBe(
      sectionAB.offer?.maxQuantity,
    );
    expect(selectionPaneTicketLimit(8, [fieldClub])).toBe(8);
    expect(selectionPaneTicketLimit(null, [sectionAB, sectionMN])).toBe(
      sectionMN.offer?.maxQuantity,
    );
    expect(selectionPaneTicketLimit(null, [])).toBe(DEFAULT_SEATED_TICKET_LIMIT);
    expect(
      selectionPaneTicketLimit(null, [{ GA: true, offer: { maxQuantity: null } }]),
    ).toBe(DEFAULT_GA_TICKET_LIMIT);
  });

  it("caps listings without an offer max at the event limit and keeps an offer max as-is", () => {
    const listings = groupsToListings(DEMO_SEATED_TICKET_GROUPS, {
      globalMax: 3,
    });
    const fieldClub = listings.find((listing) => listing.zone === "Field Club");
    const sectionAB = listings.find((listing) => listing.zone === "Section A-B");

    expect(fieldClub?.max).toBe(3);
    expect(sectionAB?.max).toBe(DEMO_SEATED_TICKET_GROUPS[1].offer?.maxQuantity);
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

  it("caps max at the seated default and falls back to section labels when no offer name", () => {
    const listings = groupsToListings([
      {
        id: 9,
        sectionNumber: "C",
        rowNumber: "1",
        price: 10,
        availableCount: 80,
        maxContiguous: 80,
        seatIds: Array.from({ length: 80 }, (_, i) => `s${i}`),
      },
    ]);
    expect(listings[0].zone).toBe("Section C");
    expect(listings[0].max).toBe(DEFAULT_SEATED_TICKET_LIMIT);
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
