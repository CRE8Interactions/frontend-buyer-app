import { describe, expect, it } from "vitest";
import {
  groupsToGaTiers,
  groupsToListings,
  filterGroupsForListings,
  sortListingsByPrice,
  limitsFromTicketGroup,
  limitsFromSeatedOfferRow,
  offerAllowedOnSeatedMap,
  hasSeatedMapSelectableOffers,
  seatedMapSelectableOffers,
  shouldShowSeatedMapOfferRow,
  offerListRestrictionLabel,
  seatedOfferRowRestrictionLabel,
  lockedZonesFromGroups,
  offerChipNames,
  validQuantityOptions,
  listingAvailabilityRange,
  listingDetailAvailabilityLabel,
  normalizeGlobalTicketLimit,
  clampQuantity,
  quantityIsAllowed,
  quantityLimits,
  offerRestrictionLimits,
  gaOfferRowRestrictionLabel,
  gaPopoverDefaultLimitLabel,
  quantityRestrictionLabel,
  selectionPaneTicketLimit,
  selectionPaneRestrictionLabel,
  selectionTicketLimit,
  ticketQuantityCap,
  ticketQuantityOptions,
  DEFAULT_GA_TICKET_LIMIT,
  DEFAULT_SEATED_TICKET_LIMIT,
  sellableCount,
} from "@/lib/ticketListings";
import { DEMO_SEATED_TICKET_GROUPS, demoTicketGroups } from "@/lib/demo/fixtures";

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
      "4–8 per order · Increments of 2",
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

  it("treats an equal maximum and multiple as an exact limit", () => {
    const limits = quantityLimits(
      { maxQuantity: 3, multipleOf: 3, minQuantity: 1 },
      { available: 20, defaultMax: 20, globalMax: 10 },
    );

    expect(limits).toEqual({ min: 3, max: 3, step: 1, valid: true });
    expect(quantityIsAllowed(3, limits)).toBe(true);
    expect(quantityIsAllowed(6, limits)).toBe(false);
    expect(
      quantityLimits(
        { maxQuantity: 3, incrementsOf: 3 },
        { available: 20, defaultMax: 20 },
      ),
    ).toEqual(limits);
    expect(
      quantityLimits(
        { maxQuantity: 3, multipleOf: 3 },
        { available: 2, defaultMax: 20 },
      ).valid,
    ).toBe(false);
    expect(seatedOfferRowRestrictionLabel({ maxQuantity: 3, multipleOf: 3 })).toBe(
      "Exact of 3",
    );
    expect(
      offerRestrictionLimits(
        { maxQuantity: 3, multipleOf: 3 },
        { min: 3, max: 0, step: 1, valid: false },
      ),
    ).toEqual({ min: 3, max: 3, step: 1, valid: true });
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
    expect(
      offerRestrictionLimits({ limit: 4 }, {
        min: 4,
        max: 2,
        step: 1,
        valid: false,
      }),
    ).toEqual({ min: 4, max: 4, step: 1, valid: true });
    expect(
      offerRestrictionLimits({ maxQuantity: 1 }, {
        min: 1,
        max: 1,
        step: 1,
        valid: true,
      }),
    ).toEqual({ min: 1, max: 1, step: 1, valid: true });
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

    expect(listings).toHaveLength(4);
    expect(listings.map((listing) => listing.zone)).toEqual([
      "Section M-N & GA",
      "Companion Seat",
      "Section A-B",
      "Field Club",
    ]);
    expect(listings.find((listing) => listing.zone === "Field Club")).toMatchObject({
      zone: "Field Club",
      sec: "M",
      row: "M3",
      min: 1,
      max: 4,
      price: "$33.59",
    });
    expect(listings.find((listing) => listing.zone === "Section A-B")).toMatchObject({
      zone: "Section A-B",
      min: 2,
      max: 6,
      price: "$21.94",
    });
    expect(listings.find((listing) => listing.zone === "Companion Seat")).toMatchObject({
      zone: "Companion Seat",
      min: 1,
      max: 2,
      price: "$12.00",
    });
    expect(listings.find((listing) => listing.zone === "Section M-N & GA")).toMatchObject({
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

    expect(
      listings.find((listing) => listing.zone === "Section A-B"),
    ).toMatchObject({
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

  it("lists the highest offer maxQuantity or limit when every offer sets one, else the event limit or default", () => {
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
    expect(ticketQuantityCap(3, [fieldClub, sectionAB])).toBe(3);
    expect(ticketQuantityCap(null, [fieldClub], DEFAULT_SEATED_TICKET_LIMIT)).toBe(
      DEFAULT_SEATED_TICKET_LIMIT,
    );
    expect(ticketQuantityCap(null, [fieldClub, sectionAB], DEFAULT_SEATED_TICKET_LIMIT)).toBe(
      DEFAULT_SEATED_TICKET_LIMIT,
    );
    expect(ticketQuantityCap(null, [sectionAB])).toBe(
      sectionAB.offer?.maxQuantity,
    );
    expect(ticketQuantityOptions(3, [sectionAB, sectionMN])).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(ticketQuantityOptions(null, [fieldClub, sectionAB])).toEqual(
      Array.from({ length: DEFAULT_SEATED_TICKET_LIMIT }, (_, i) => i + 1),
    );
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

describe("listingAvailabilityRange", () => {
  it("shows the min–max ticket count", () => {
    expect(listingAvailabilityRange(1, 4)).toBe("1 – 4 Tickets");
  });

  it("uses singular copy for a single available ticket", () => {
    expect(listingAvailabilityRange(1, 1)).toBe("1 Ticket");
  });
});

describe("listingDetailAvailabilityLabel", () => {
  it("shows lowercase tickets available", () => {
    expect(listingDetailAvailabilityLabel(1, 4)).toBe("1-4 tickets available");
  });

  it("appends Increments of with the step size", () => {
    expect(listingDetailAvailabilityLabel(2, 20, 2)).toBe(
      "2-20 tickets available · Increments of 2",
    );
  });

  it("uses singular copy for one ticket", () => {
    expect(listingDetailAvailabilityLabel(1, 1)).toBe("1 ticket available");
  });
});

describe("selectionPaneRestrictionLabel", () => {
  it("includes min and multiples when the selected offer sets them", () => {
    const sectionAB = DEMO_SEATED_TICKET_GROUPS[1];
    expect(
      selectionPaneRestrictionLabel(null, [
        sectionAB,
      ]),
    ).toBe("2–6 per order");
  });

  it("caps a group offer at the row inventory the map popover shows", () => {
    const sectionAB = DEMO_SEATED_TICKET_GROUPS[1];
    const openEnded = {
      ...sectionAB,
      offer: { ...sectionAB.offer, minQuantity: 2, maxQuantity: null },
    };

    expect(selectionPaneRestrictionLabel(null, [openEnded])).toBe(
      `2–${sectionAB.seatIds!.length} per order`,
    );
  });

  it("states the seats left in the row when the offer sets no limit", () => {
    const sectionAB = DEMO_SEATED_TICKET_GROUPS[1];

    expect(
      selectionPaneRestrictionLabel(null, [
        { ...sectionAB, offer: { minQuantity: 1, maxQuantity: null } },
      ]),
    ).toBe(`1–${sectionAB.seatIds!.length} per order`);
  });

  it("falls back to the seated default when the selection has no row inventory", () => {
    expect(
      selectionPaneRestrictionLabel(null, [{ offer: { maxQuantity: null } }]),
    ).toBe(`1–${DEFAULT_SEATED_TICKET_LIMIT} per order`);
  });

  it("uses exact limit copy when the offer sets limit", () => {
    expect(
      selectionPaneRestrictionLabel(null, [
        {
          offer: {
            limit: 4,
            minQuantity: 2,
            maxQuantity: 8,
            multipleOf: 2,
          },
        },
      ]),
    ).toBe("4 per order");
  });

  it("shows the event cap range when only a global limit is set", () => {
    expect(selectionPaneRestrictionLabel(6, [])).toBe("1–6 per order");
  });

  it("uses the GA default max when all selected seats are GA", () => {
    expect(
      selectionPaneRestrictionLabel(null, [{ GA: true, offer: {} }]),
    ).toBe(`1–${DEFAULT_GA_TICKET_LIMIT} per order`);
  });

  it("caps a GA selection at the tickets that offer has left, like its popover row", () => {
    const ga = demoTicketGroups().ticketGroups.find((group) => group.GA);
    if (!ga) throw new Error("demo fixtures need a GA ticket group");
    const offer = { id: "off-early-3", name: "early bird 3", maxQuantity: null };

    expect(
      selectionPaneRestrictionLabel(null, [
        { ...ga, availableCount: 26, quantity: 1, offer },
      ]),
    ).toBe("1–26 per order");
  });

  it("uses the higher GA offer limit when both offers are selected", () => {
    const ga = demoTicketGroups().ticketGroups.find((group) => group.GA);
    if (!ga) throw new Error("demo fixtures need a GA ticket group");

    expect(
      selectionPaneRestrictionLabel(null, [
        {
          ...ga,
          availableCount: 200,
          quantity: 1,
          offer: { id: "off-early", name: "Early Bird", maxQuantity: 50 },
        },
        {
          ...ga,
          availableCount: 26,
          quantity: 1,
          offer: { id: "off-early-3", name: "early bird 3", maxQuantity: null },
        },
      ]),
    ).toBe("1–50 per order");

    expect(
      selectionPaneRestrictionLabel(null, [
        {
          ...ga,
          availableCount: 50,
          quantity: 1,
          offer: { id: "off-early", name: "Early Bird", maxQuantity: null },
        },
        {
          ...ga,
          availableCount: 26,
          quantity: 1,
          offer: { id: "off-early-3", name: "early bird 3", maxQuantity: null },
        },
      ]),
    ).toBe("1–50 per order");
  });

  it("reads package incrementsOf from the fallback source", () => {
    expect(
      selectionPaneRestrictionLabel(
        null,
        [{}],
        { minQuantity: 2, maxQuantity: 6, incrementsOf: 2 },
      ),
    ).toBe("2–6 per order");
  });

  it("states the row's seats and the strictest minimum across two offers", () => {
    const sectionAB = DEMO_SEATED_TICKET_GROUPS[1];
    const [first, second, third, ...rest] = sectionAB.seatIds!;
    const bogo = {
      ...sectionAB,
      seatIds: [first, second, third],
      offer: { id: "off-bogo", name: "BOGO", minQuantity: 2, maxQuantity: null },
    };
    const standard = {
      ...sectionAB,
      seatIds: rest,
      offer: { id: "off-standard", name: "Standard", maxQuantity: null },
    };

    // Each offer covers part of the row; the pane states the whole row.
    expect(selectionPaneRestrictionLabel(null, [bogo, standard])).toBe(
      `2–${sectionAB.seatIds!.length} per order`,
    );

    expect(
      selectionPaneRestrictionLabel(null, [
        { ...bogo, offer: { ...bogo.offer, minQuantity: null } },
        standard,
      ]),
    ).toBe(`1–${sectionAB.seatIds!.length} per order`);
  });

  it("states the row's total when only one of the two offers caps quantity", () => {
    const sectionAB = DEMO_SEATED_TICKET_GROUPS[1];
    const capped = {
      ...sectionAB,
      offer: { id: "off-bogo", name: "BOGO", maxQuantity: 5 },
    };
    const uncapped = {
      ...sectionAB,
      offer: { id: "off-standard", name: "Standard", maxQuantity: null },
    };

    expect(selectionPaneRestrictionLabel(null, [capped, uncapped])).toBe(
      `1–${sectionAB.seatIds!.length} per order`,
    );
  });

  it("keeps the tightest maximum when both offers cap quantity", () => {
    const sectionAB = DEMO_SEATED_TICKET_GROUPS[1];
    const bogo = {
      ...sectionAB,
      offer: { id: "off-bogo", name: "BOGO", maxQuantity: 5 },
    };
    const premium = {
      ...sectionAB,
      offer: { id: "off-premium", name: "Premium", maxQuantity: 3 },
    };

    expect(selectionPaneRestrictionLabel(null, [bogo, premium])).toBe(
      "1–3 per order",
    );
  });

  it("keeps the offer's own limits when every selected seat shares that offer", () => {
    const ga = demoTicketGroups().ticketGroups.find((group) => group.GA);
    if (!ga) throw new Error("demo fixtures need a GA ticket group");
    const offer = { minQuantity: 2, maxQuantity: 5 };

    expect(
      selectionPaneRestrictionLabel(null, [
        { ...ga, offer },
        { ...ga, offer },
      ]),
    ).toBe("2–5 per order");
  });

  it("uses the event cap when the selected offer has no max", () => {
    const fieldClub = DEMO_SEATED_TICKET_GROUPS[0];
    expect(
      selectionPaneRestrictionLabel(4, [
        fieldClub,
      ]),
    ).toBe("1–4 per order");
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
      max: DEFAULT_GA_TICKET_LIMIT,
    });
  });

  it("uses the GA default max on seated-event GA listings without an offer max", () => {
    const listings = groupsToListings([
      {
        id: "grp-ga-otown",
        GA: true,
        sectionNumber: "O-Town",
        rowNumber: "GA",
        price: 14.71,
        availableCount: 742,
        offer: {
          id: "off-mn-ga",
          name: "Section M-N & GA",
          minQuantity: 2,
        },
      },
    ]);

    expect(listings[0]).toMatchObject({
      sec: "O-Town",
      row: "GA",
      min: 2,
      max: DEFAULT_GA_TICKET_LIMIT,
    });
  });
});

describe("groupsToGaTiers", () => {
  const groups = demoTicketGroups().ticketGroups;

  it("includes access-coded offers as locked tiers when includeLocked is set", () => {
    const tiers = groupsToGaTiers(groups, { includeLocked: true });
    const presale = tiers.find((tier) => tier.name === "STH Presale");

    expect(presale).toMatchObject({
      state: "locked",
      price: "$30.00",
    });
  });

  it("drops access-coded offers by default", () => {
    const tiers = groupsToGaTiers(groups);
    expect(tiers.some((tier) => tier.name === "STH Presale")).toBe(false);
  });

  it("cards drained inventory as sold out even when the offer is coded", () => {
    const codedSoldOut = {
      ...groups[0],
      id: "grp-coded-out",
      availableCount: 0,
      offer: {
        id: "off-coded-out",
        name: "Members Only",
        accessCode: "MEMBER",
      },
    };
    const tiers = groupsToGaTiers([codedSoldOut], { includeLocked: true });

    expect(tiers[0]).toMatchObject({ name: "Members Only", state: "soldout" });
  });

  it("fans out connected child offers as their own live tiers", () => {
    const tiers = groupsToGaTiers(groups, { includeLocked: true });
    const student = tiers.find((tier) => tier.name === "Student Rate");

    expect(student).toMatchObject({
      state: "live",
      price: "$15.00",
      note: "Ticket limit: 2–6 per order · Increments of 2",
      min: 2,
      max: 6,
      multipleOf: 2,
    });
  });
});

describe("groupsToListings connected offers", () => {
  it("lists connected seated inventory beside the parent offer", () => {
    const group = DEMO_SEATED_TICKET_GROUPS.find((g) => g.id === 2)!;
    const listings = groupsToListings([group], { includeLocked: true });

    expect(listings.map((l) => l.tier)).toEqual([
      "Companion Seat",
      "Section A-B",
    ]);
    expect(listings.find((listing) => listing.tier === "Companion Seat")).toMatchObject({
      price: "$12.00",
      min: 1,
      max: 2,
    });
  });
});

describe("limitsFromTicketGroup", () => {
  it("matches connected offer limits for GA and seated inventory", () => {
    const gaGroups = demoTicketGroups().ticketGroups;
    const parent = gaGroups[0];
    const connected = parent.offer!.connected_offers![0];

    expect(
      limitsFromTicketGroup(
        {
          ...parent,
          offer: connected,
          availableCount: 240,
          GA: true,
        } as Parameters<typeof limitsFromTicketGroup>[0],
        null,
      ),
    ).toMatchObject({ min: 2, max: 6, step: 2, valid: true });

    const seated = DEMO_SEATED_TICKET_GROUPS.find(
      (g) => g.offer?.connected_offers?.length,
    );
    expect(seated).toBeTruthy();
    const companionLimits = limitsFromTicketGroup(
      {
        ...seated!,
        offer: seated!.offer!.connected_offers![0],
      } as Parameters<typeof limitsFromTicketGroup>[0],
      null,
    );
    expect(companionLimits).toMatchObject({ min: 1, max: 2, step: 1, valid: true });
  });

  it("still rejects a GA quantity of 1 when the offer min is above 1", () => {
    const ga = demoTicketGroups().ticketGroups.find((group) => group.GA);
    expect(ga).toBeTruthy();
    const limits = limitsFromTicketGroup(
      {
        ...ga!,
        offer: { ...ga!.offer, minQuantity: 2, maxQuantity: 6, multipleOf: 2 },
        availableCount: 20,
        GA: true,
      } as Parameters<typeof limitsFromTicketGroup>[0],
      null,
    );
    expect(quantityIsAllowed(1, limits)).toBe(false);
    expect(quantityIsAllowed(2, limits)).toBe(true);
  });
});

describe("limitsFromSeatedOfferRow", () => {
  it("locks a group-restricted seated offer to its required quantity", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    expect(parent).toBeTruthy();

    expect(
      limitsFromSeatedOfferRow({
        ...parent!,
        offer: { id: "off-scheduled", name: "scheduled", limit: 3 },
      }),
    ).toMatchObject({ min: 3, max: 3, step: 1, valid: true });

    expect(
      limitsFromSeatedOfferRow({
        ...parent!,
        offer: {
          id: "off-min-2",
          name: "Pair required",
          minQuantity: 2,
          maxQuantity: 6,
          multipleOf: 2,
        },
      }),
    ).toMatchObject({ min: 2, max: 2, step: 1, valid: true });
  });
});

describe("shouldShowSeatedMapOfferRow", () => {
  it("lists seated offers even when min, max, step, or exact limit is above 1", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    expect(parent).toBeTruthy();

    expect(
      shouldShowSeatedMapOfferRow({
        ...parent!,
        offer: { id: "off-scheduled", name: "scheduled", limit: 3 },
      }),
    ).toBe(true);

    expect(
      shouldShowSeatedMapOfferRow({
        ...parent!,
        offer: {
          id: "off-min-2",
          name: "Pair required",
          minQuantity: 2,
          maxQuantity: 6,
        },
      }),
    ).toBe(true);
  });
});

describe("offerAllowedOnSeatedMap", () => {
  it("allows seated map picks regardless of offer min, max, step, or exact limit", () => {
    expect(offerAllowedOnSeatedMap(null)).toBe(true);
    expect(offerAllowedOnSeatedMap({ minQuantity: 2 })).toBe(true);
    expect(offerAllowedOnSeatedMap({ maxQuantity: 2 })).toBe(true);
    expect(offerAllowedOnSeatedMap({ multipleOf: 2 })).toBe(true);
    expect(offerAllowedOnSeatedMap({ limit: 3 })).toBe(true);
  });
});

describe("hasSeatedMapSelectableOffers", () => {
  it("returns true for seated offers whose listing min is above 1", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    expect(parent).toBeTruthy();

    expect(
      hasSeatedMapSelectableOffers([
        {
          ...parent!,
          offer: { id: "off-scheduled", name: "scheduled", limit: 3 },
        },
      ]),
    ).toBe(true);
  });

  it("returns true when at least one offer can be picked on the map", () => {
    const parent = DEMO_SEATED_TICKET_GROUPS.find((g) => g.seatIds?.includes("a1"));
    expect(parent).toBeTruthy();

    expect(
      hasSeatedMapSelectableOffers([
        {
          ...parent!,
          offer: { id: "off-scheduled", name: "scheduled", limit: 3 },
        },
        {
          ...parent!,
          offer: {
            id: "off-standard",
            name: "Standard Admission",
            maxQuantity: 1,
          },
        },
      ]),
    ).toBe(true);

    expect(
      seatedMapSelectableOffers([
        {
          ...parent!,
          offer: { id: "off-scheduled", name: "scheduled", limit: 3 },
        },
        {
          ...parent!,
          offer: {
            id: "off-standard",
            name: "Standard Admission",
            maxQuantity: 1,
          },
        },
      ]),
    ).toHaveLength(2);
  });
});

describe("seatedOfferRowRestrictionLabel", () => {
  it("states the group a BOGO or exact-limit offer has to be bought in", () => {
    expect(
      seatedOfferRowRestrictionLabel(
        { minQuantity: 2, maxQuantity: 14, multipleOf: 2 },
        { min: 2, max: 14, step: 2, valid: true },
      ),
    ).toBe("Minimum of 2");

    expect(
      seatedOfferRowRestrictionLabel(
        { limit: 3 },
        { min: 3, max: 3, step: 1, valid: false },
      ),
    ).toBe("Exact of 3");
  });

  it("raises the minimum to the multiple the stepper jumps to", () => {
    expect(
      seatedOfferRowRestrictionLabel(
        { minQuantity: 2, maxQuantity: 6, multipleOf: 3 },
        { min: 3, max: 6, step: 3, valid: true },
      ),
    ).toBe("Minimum of 3");

    expect(
      seatedOfferRowRestrictionLabel(
        { maxQuantity: 6, multipleOf: 3 },
        { min: 3, max: 6, step: 3, valid: true },
      ),
    ).toBe("Minimum of 3");
  });

  it("says nothing for an offer that sells the clicked seat on its own", () => {
    expect(
      seatedOfferRowRestrictionLabel(
        { maxQuantity: 19 },
        { min: 1, max: 1, step: 1, valid: true },
      ),
    ).toBeNull();
  });
});

describe("offerListRestrictionLabel", () => {
  it("states a shared limit once for every offer in the list", () => {
    expect(
      offerListRestrictionLabel([
        { min: 2, max: 6, step: 2, valid: true },
        { min: 2, max: 6, step: 2, valid: true },
      ]),
    ).toBe("2–6 per order · Increments of 2");
  });

  it("spans offers with different limits and ignores offers without one", () => {
    expect(
      offerListRestrictionLabel([
        { min: 3, max: 3, step: 1, valid: true },
        null,
        { min: 1, max: 1, step: 1, valid: true },
      ]),
    ).toBe("1–3 per order");
    expect(offerListRestrictionLabel([null])).toBeNull();
  });
});

describe("gaOfferRowRestrictionLabel", () => {
  it("hides the unconstrained GA default of 1–100", () => {
    expect(
      gaOfferRowRestrictionLabel(null, {
        min: 1,
        max: DEFAULT_GA_TICKET_LIMIT,
        step: 1,
        valid: true,
      }),
    ).toBeNull();
  });

  it("states a configured GA limit that is not the 1–100 default", () => {
    expect(
      gaOfferRowRestrictionLabel(
        { minQuantity: 2, maxQuantity: 6, multipleOf: 2 },
        { min: 2, max: 6, step: 2, valid: true },
      ),
    ).toBe("2–6 per order · Increments of 2");
  });
});

describe("gaPopoverDefaultLimitLabel", () => {
  it("states 1–100 when any offer still uses the unconstrained default", () => {
    expect(
      gaPopoverDefaultLimitLabel([
        { min: 1, max: DEFAULT_GA_TICKET_LIMIT, step: 1, valid: true },
        { min: 2, max: 5, step: 1, valid: true },
      ]),
    ).toBe("1–100 per order");
  });

  it("stays off when every offer has its own limit", () => {
    expect(
      gaPopoverDefaultLimitLabel([
        { min: 2, max: 5, step: 1, valid: true },
        { min: 1, max: 1, step: 1, valid: true },
      ]),
    ).toBeNull();
  });
});

describe("validQuantityOptions", () => {
  it("steps quantities the same way blocktickets getValidQuantitiesForTicketGroup does", () => {
    const connected = demoTicketGroups().ticketGroups[0].offer!.connected_offers![0];

    expect(
      validQuantityOptions(connected, {
        available: 240,
        defaultMax: 100,
        globalMax: null,
      }),
    ).toEqual([2, 4, 6]);
  });
});

describe("offerChipNames connected offers", () => {
  it("hides connected child offers from filter chips", () => {
    const offers = [
      { name: "Standard Admission" },
      { name: "Student Rate", isConnectedOffer: true },
      { name: "VIP Club" },
    ];

    expect(offerChipNames(offers)).toEqual(["Standard Admission", "VIP Club"]);
  });
});

describe("listing filters", () => {
  it("sorts listings cheapest to highest and can reverse", () => {
    const listings = groupsToListings(DEMO_SEATED_TICKET_GROUPS);
    expect(listings.map((listing) => listing.price)).toEqual([
      "$11.64",
      "$12.00",
      "$21.94",
      "$33.59",
    ]);
    const reversed = sortListingsByPrice(listings, "-price");
    expect(reversed[0]?.price).toBe("$33.59");
    expect(reversed[reversed.length - 1]?.price).toBe("$11.64");
  });

  it("keeps only accessible groups when the ADA listing filter is on", () => {
    const filtered = filterGroupsForListings(DEMO_SEATED_TICKET_GROUPS, {
      accessible: true,
    });
    expect(filtered.every((group) => group.accessible)).toBe(true);
    expect(filtered.some((group) => group.offer?.name === "Section A-B")).toBe(
      true,
    );
    expect(filtered.some((group) => group.offer?.name === "Field Club")).toBe(
      false,
    );
  });

  it("returns no groups when nothing matches the accessible filter", () => {
    const none = DEMO_SEATED_TICKET_GROUPS.map((group) => ({
      ...group,
      accessible: false,
    }));
    expect(filterGroupsForListings(none, { accessible: true })).toEqual([]);
  });
});
