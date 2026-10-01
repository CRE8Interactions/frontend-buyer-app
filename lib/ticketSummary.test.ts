import { describe, expect, it } from "vitest";
import {
  DEMO_SEATED_TICKET_GROUPS,
  demoCheckoutCart,
  demoCompletedFlexPackOrder,
  demoCompletedPackageOrder,
  demoCompletedTicketOrder,
  demoFlexPack,
  demoFlexPackCheckoutCart,
  demoPackageCheckoutCart,
  demoSeasonPackage,
  demoTicketGroups,
} from "@/lib/demo/fixtures";
import {
  completedOrderPromoCode,
  gaTierSubtitle,
  gaTicketsNeedGroupSection,
  alignPackageSeatPrices,
  packageCustomFeeLines,
  checkoutIncludedPriceBreakdown,
  checkoutTaxLine,
  includedTicketPriceBreakdown,
  packageOrderSummary,
  packageSeatLines,
  promoSummaryLabel,
  resolveCompletedOrderFees,
  sumIncludedSalesTax,
  resolveFlexPackCheckoutTotals,
  resolvePackageCheckoutTotals,
  selectionOfferDescription,
  selectionOfferName,
  selectionTicketCards,
  ticketSelectionSummary,
  withGaTicketGroupSections,
  withPackageCheckoutSeatPrices,
} from "@/lib/ticketSummary";

const listing = DEMO_SEATED_TICKET_GROUPS[0];

describe("selectionOfferName", () => {
  it("returns the ticket offer name", () => {
    expect(selectionOfferName(listing)).toBe(listing.offer?.name);
  });

  it("does not use the package name when the ticket has no offer", () => {
    const pkg = demoSeasonPackage();
    const group: {
      offer?: { name?: string };
      package?: { name?: string };
    } = { package: { name: pkg.name } };
    expect(selectionOfferName(group)).toBe("Standard admission");
  });

  it("reads a nested Strapi offer name", () => {
    expect(
      selectionOfferName({
        offer: { data: { attributes: { name: listing.offer?.name } } },
      }),
    ).toBe(listing.offer?.name);
  });
});

describe("selectionOfferDescription", () => {
  it("returns the ticket offer description", () => {
    expect(selectionOfferDescription(listing)).toBe(
      listing.offer?.description,
    );
  });

  it("reads a nested Strapi offer description", () => {
    expect(
      selectionOfferDescription({
        offer: {
          data: {
            attributes: { description: "VIP lounge and in-seat service." },
          },
        },
      }),
    ).toBe("VIP lounge and in-seat service.");
  });

  it("strips HTML from the offer description", () => {
    expect(
      selectionOfferDescription({
        offer: { description: "<p>Premium <strong>club</strong> access.</p>" },
      }),
    ).toBe("Premium club access.");
  });

  it("keeps line breaks in the offer description", () => {
    expect(
      selectionOfferDescription({
        offer: {
          description: "Includes club access.\n\nNo re-entry.",
        },
      }),
    ).toBe("Includes club access.\n\nNo re-entry.");
  });
});

describe("gaTierSubtitle", () => {
  it("uses the quick-pick section name when set", () => {
    expect(
      gaTierSubtitle({
        sectionName: "General Admission",
        sectionNumber: "GA",
      }),
    ).toBe("General Admission · unreserved seating");
  });

  it("uses sectionNumber when sectionName is missing or generic GA", () => {
    expect(
      gaTierSubtitle({
        sectionNumber: "O-Town",
        offer: { description: "Section M-N & GA" },
      }),
    ).toBe("O-Town · unreserved seating");
    expect(
      gaTierSubtitle({
        sectionName: "GA",
        sectionNumber: "O-Town",
      }),
    ).toBe("O-Town · unreserved seating");
  });

  it("shows Ga when that is the section name on GA-only offers", () => {
    expect(
      gaTierSubtitle({
        sectionName: "GA",
        sectionNumber: "GA",
      }),
    ).toBe("Ga · unreserved seating");
    expect(gaTierSubtitle({ sectionName: "GA" })).toBe(
      "Ga · unreserved seating",
    );
    expect(gaTierSubtitle({ sectionNumber: "GA" })).toBe(
      "Ga · unreserved seating",
    );
  });

  it("falls back to the offer description then General Admission", () => {
    expect(
      gaTierSubtitle({
        offer: {
          description: "Premium club access + in-seat service.",
        },
      }),
    ).toBe("Premium club access + in-seat service. · unreserved seating");
    expect(gaTierSubtitle({})).toBe("General Admission · unreserved seating");
  });
});

describe("selectionTicketCards", () => {
  it("expands a GA quantity into one card per ticket", () => {
    const cards = selectionTicketCards([
      { ...listing, GA: true, quantity: 2 },
    ]);
    expect(cards).toHaveLength(2);
    expect(cards[0].groupIndex).toBe(0);
    expect(cards[1].unitIndex).toBe(1);
  });

  it("expands package quantity the same way and leaves reserved seats as one card", () => {
    const pkg = demoSeasonPackage();
    const reserved = { ...listing, GA: false, quantity: 1 };
    expect(
      selectionTicketCards([
        { ...listing, GA: false, package: { name: pkg.name }, quantity: 3 },
        reserved,
      ]),
    ).toHaveLength(4);
    expect(selectionTicketCards([reserved])).toHaveLength(1);
  });
});

describe("ticketSelectionSummary", () => {
  it("uses the ticket offer name from the checkout cart", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const summary = ticketSelectionSummary(cart.tickets);
    expect(summary.offerName).toBe(listing.offer?.name);
    expect(summary.accessibleLabel).toBe("");
  });

  it("carries the accessible seating label for ADA tickets", () => {
    const adaGroup = DEMO_SEATED_TICKET_GROUPS.find((group) => group.accessible)!;
    const summary = ticketSelectionSummary([
      {
        ...adaGroup,
        cost: adaGroup.price,
        sectionName: adaGroup.sectionNumber,
      },
    ]);
    expect(summary.accessibleLabel).toBe(
      "Open space for wheelchair",
    );
  });

  it("falls back to Accessible seating when mixed types are selected", () => {
    const summary = ticketSelectionSummary([
      { accessible: true, accessibleType: "DA", cost: 10, sectionName: "A" },
      { accessible: true, accessibleType: "DB", cost: 10, sectionName: "A" },
    ]);
    expect(summary.accessibleLabel).toBe("Accessible seating");
  });

  it("has no offer name when tickets omit the offer", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const summary = ticketSelectionSummary(
      cart.tickets.map((ticket) => ({ ...ticket, offerName: undefined })),
    );
    expect(summary.offerName).toBe("");
  });

  it("defaults package tickets without an offer to Standard admission", () => {
    const cart = demoPackageCheckoutCart();
    const summary = ticketSelectionSummary(
      cart.tickets.map((ticket) => ({ ...ticket, offerName: undefined })),
      { defaultOffer: "Standard admission" },
    );
    expect(summary.offerName).toBe("Standard admission");
    expect(
      ticketSelectionSummary(cart.tickets, { defaultOffer: "Standard admission" })
        .offerName,
    ).toBe(cart.tickets[0].offerName);
  });

  it("uses the GA offer subtitle instead of a ticket count", () => {
    const cart = demoCheckoutCart({ ga: true });
    const group = demoTicketGroups().ticketGroups[0];
    expect(ticketSelectionSummary(cart.tickets).subtitle).toBe(
      gaTierSubtitle(group),
    );
    expect(ticketSelectionSummary(cart.tickets).subtitle).not.toBe("1 ticket");
  });

  it("copies the ticket-group section name onto a GA cart ticket that only has ga", () => {
    const group = demoTicketGroups().ticketGroups[0];
    const ticket = {
      ...demoCheckoutCart({ ga: true }).tickets[0],
      sectionName: undefined,
      sectionNumber: "ga",
      ticketGroup: group.id,
    };
    expect(ticketSelectionSummary([ticket]).subtitle).toBe(
      "Ga · unreserved seating",
    );
    expect(gaTicketsNeedGroupSection([ticket])).toBe(true);

    const enriched = withGaTicketGroupSections(
      [ticket],
      demoTicketGroups().ticketGroups as unknown as Array<
        Record<string, unknown>
      >,
    );
    expect(ticketSelectionSummary(enriched).subtitle).toBe(
      gaTierSubtitle(group),
    );
    expect(gaTicketsNeedGroupSection(enriched)).toBe(false);
  });

  it("does not look up ticket groups for reserved seats", () => {
    const cart = demoCheckoutCart();
    expect(gaTicketsNeedGroupSection(cart.tickets)).toBe(false);
    expect(
      withGaTicketGroupSections(
        cart.tickets,
        demoTicketGroups().ticketGroups as unknown as Array<
          Record<string, unknown>
        >,
      ),
    ).toEqual(cart.tickets);
  });

  it("puts a single reserved seat beside the ticket count", () => {
    const cart = demoCheckoutCart();
    const ticket = cart.tickets[0];
    const summary = ticketSelectionSummary(cart.tickets);
    expect(summary.seatLine).toBe(
      `Sec ${ticket.sectionNumber} · Row ${ticket.rowNumber}`,
    );
    expect(summary.subtitle).toBe(`1 ticket · Seat ${ticket.seatNumber}`);
  });

  it("shows the seat number without an accessibility suffix", () => {
    const cart = demoCheckoutCart();
    const summary = ticketSelectionSummary([
      { ...cart.tickets[0], seatNumber: "13_DA" },
    ]);
    expect(summary.subtitle).toBe("1 ticket · Seat 13");
  });

  it("keeps seats-are-together copy when selected seats are consecutive", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const summary = ticketSelectionSummary(cart.tickets);
    expect(summary.subtitle).toBe("2 tickets · seats are together");
    expect(summary.seatLine).toBe(
      `Sec ${cart.tickets[0].sectionNumber} · Row ${cart.tickets[0].rowNumber}`,
    );
  });

  it("treats accessible seat labels as together when their numbers are consecutive", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const summary = ticketSelectionSummary([
      { ...cart.tickets[0], seatNumber: "2_DA" },
      { ...cart.tickets[1], seatNumber: "3_DA" },
    ]);
    expect(summary.subtitle).toBe("2 tickets · seats are together");
  });

  it("lists accessible seat labels when their numbers have a gap", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const summary = ticketSelectionSummary([
      { ...cart.tickets[0], seatNumber: "2_DA" },
      { ...cart.tickets[1], seatNumber: "4_DA" },
    ]);
    expect(summary.subtitle).toBe("2 tickets · Seats 2, 4");
  });

  it("lists seat numbers instead of together copy when seats in the same row have a gap", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const summary = ticketSelectionSummary([
      { ...cart.tickets[0], seatNumber: 3 },
      { ...cart.tickets[1], seatNumber: 5 },
    ]);
    expect(summary.subtitle).toBe("2 tickets · Seats 3, 5");
    expect(summary.subtitle).not.toMatch(/together/i);
  });

  it("drops the together copy when the tickets carry no seat numbers", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const summary = ticketSelectionSummary(
      cart.tickets.map((ticket) => ({ ...ticket, seatNumber: undefined })),
    );
    expect(summary.subtitle).toBe("2 tickets");
  });

  it("uses seat numbers and game count for a package order subtitle", () => {
    const order = demoCompletedPackageOrder();
    const games = (order.package as { events: unknown[] }).events.length;
    const summary = ticketSelectionSummary(
      order.tickets as Array<Record<string, unknown>>,
      { gameCount: games },
    );
    expect(summary.subtitle).toBe(`Seats 21-22 · all ${games} games`);
  });

  it("keeps the package game count when tickets have no seat numbers", () => {
    const order = demoCompletedPackageOrder();
    const games = (order.package as { events: unknown[] }).events.length;
    const summary = ticketSelectionSummary(
      (order.tickets as Array<Record<string, unknown>>).map((ticket) => ({
        ...ticket,
        seatNumber: undefined,
      })),
      { gameCount: games },
    );
    expect(summary.subtitle).toBe(`all ${games} games`);
  });

  it("groups the checkout price breakdown by offer name and unit price", () => {
    const cart = demoCheckoutCart({ ticketCount: 3 });
    const summary = ticketSelectionSummary([
      { ...cart.tickets[0], offerName: "Standard Admission", cost: 51.75, price: 51.75 },
      { ...cart.tickets[1], offerName: "Early Bird", cost: 50, price: 50 },
      { ...cart.tickets[2], offerName: "Early Bird", cost: 50, price: 50 },
    ]);

    expect(summary.offerName).toBe("");
    expect(summary.offerLines).toEqual([
      {
        offerName: "Standard Admission",
        count: 1,
        unit: 51.75,
        subtotal: 51.75,
      },
      {
        offerName: "Early Bird",
        count: 2,
        unit: 50,
        subtotal: 100,
      },
    ]);
    expect(summary.subtotal).toBe(151.75);
  });

  it("keeps a single offer line when every ticket shares one offer", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const summary = ticketSelectionSummary(cart.tickets);
    expect(summary.offerLines).toHaveLength(1);
    expect(summary.offerLines[0]?.offerName).toBe(summary.offerName);
    expect(summary.offerLines[0]?.count).toBe(2);
  });
});

describe("packageSeatLines", () => {
  it("lists one season seat with the offer name and game count", () => {
    const cart = demoPackageCheckoutCart();
    const ticket = cart.tickets[0];
    const lines = packageSeatLines(cart.tickets, cart.package.events.length);

    expect(lines).toHaveLength(1);
    expect(lines[0].seatLine).toBe(
      `Sec ${ticket.sectionNumber} · Row ${ticket.rowNumber} · Seat ${ticket.seatNumber}`,
    );
    expect(lines[0].context).toBe(
      `${ticket.offerName} · all ${cart.package.events.length} games`,
    );
    expect(lines[0].price).toBe(Number(ticket.price));
    expect(lines[0].accessibleLabel).toBe("");
  });

  it("labels accessible package seats", () => {
    const cart = demoPackageCheckoutCart();
    const ticket = cart.tickets[0];
    const lines = packageSeatLines(
      [{ ...ticket, accessible: true, accessibleType: "DA" }],
      cart.package.events.length,
    );

    expect(lines[0].accessibleLabel).toBe("Open space for wheelchair");
  });

  it("collapses per-game tickets for the same seat and never uses the package name", () => {
    const pkg = demoSeasonPackage();
    const cart = demoPackageCheckoutCart();
    const ticket = cart.tickets[0];
    const lines = packageSeatLines(
      [
        { ...ticket, offerName: undefined, package: { name: pkg.name } },
        { ...ticket, offerName: undefined, package: { name: pkg.name } },
      ],
      pkg.events.length,
    );

    expect(lines).toHaveLength(1);
    expect(lines[0].context).toBe(
      `Standard admission · all ${pkg.events.length} games`,
    );
    expect(lines[0].context.includes(pkg.name)).toBe(false);
    expect(lines[0].price).toBe(Number(ticket.price));
  });

  it("combines adjacent seats in the same row into one line with a range and subtotal", () => {
    const cart = demoPackageCheckoutCart();
    const ticket = cart.tickets[0];
    const unit = Number(ticket.price);
    const lines = packageSeatLines(
      [
        { ...ticket, seatNumber: 18 },
        { ...ticket, seatNumber: 19 },
      ],
      cart.package.events.length,
    );

    expect(lines).toHaveLength(1);
    expect(lines[0].seatLine).toBe(
      `Sec ${ticket.sectionNumber} · Row ${ticket.rowNumber} · Seats 18-19`,
    );
    expect(lines[0].price).toBe(unit * 2);
  });

  it("lists non-adjacent seats in the same row as a comma list with a subtotal", () => {
    const cart = demoPackageCheckoutCart();
    const ticket = cart.tickets[0];
    const unit = Number(ticket.price);
    const lines = packageSeatLines(
      [
        { ...ticket, seatNumber: 17 },
        { ...ticket, seatNumber: 20 },
      ],
      cart.package.events.length,
    );

    expect(lines).toHaveLength(1);
    expect(lines[0].seatLine).toBe(
      `Sec ${ticket.sectionNumber} · Row ${ticket.rowNumber} · Seats 17, 20`,
    );
    expect(lines[0].price).toBe(unit * 2);
  });

  it("keeps seats in different rows on separate lines", () => {
    const cart = demoPackageCheckoutCart();
    const ticket = cart.tickets[0];
    const other = DEMO_SEATED_TICKET_GROUPS[1];
    const lines = packageSeatLines(
      [
        { ...ticket, seatNumber: 18 },
        {
          ...ticket,
          sectionNumber: other.sectionNumber,
          sectionName: other.sectionNumber,
          rowNumber: other.rowNumber,
          seatNumber: 18,
        },
      ],
      cart.package.events.length,
    );

    expect(lines).toHaveLength(2);
    expect(lines[0].seatLine).not.toBe(lines[1].seatLine);
  });

  it("uses the package tier price when cart tickets have no cost", () => {
    const pkg = demoSeasonPackage();
    const cart = demoPackageCheckoutCart();
    const ticket = { ...cart.tickets[0], cost: 0, price: 0 };
    const lines = packageSeatLines(
      [ticket],
      pkg.events.length,
      Number(pkg.pricingTiers[0].price),
    );

    expect(lines).toHaveLength(1);
    expect(lines[0].price).toBe(Number(pkg.pricingTiers[0].price));
  });

  it("keeps a later game ticket's price when earlier copies are zero", () => {
    const cart = demoPackageCheckoutCart();
    const ticket = cart.tickets[0];
    const lines = packageSeatLines(
      [
        { ...ticket, cost: 0, price: 0 },
        { ...ticket, cost: 0, price: Number(ticket.price) },
      ],
      cart.package.events.length,
    );

    expect(lines).toHaveLength(1);
    expect(lines[0].price).toBe(Number(ticket.price));
  });
});

describe("sumIncludedSalesTax", () => {
  it("totals tax already included in each ticket price by price level", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const unit = Number(cart.tickets[0].cost);
    const tickets = [
      { ...cart.tickets[0], cost: unit },
      { ...cart.tickets[1], cost: unit, pricingLevelId: 2 },
    ];
    const pricingObjects = [
      { id: 1, totalDue: unit, taxPerTicket: 0.85, salesTax: 0.85 },
      { id: 2, name: "Senior", totalDue: unit, taxPerTicket: 0.4 },
    ];

    expect(sumIncludedSalesTax(tickets, pricingObjects)).toBe(1.25);
  });

  it("returns 0 when tickets or pricing objects are missing", () => {
    const cart = demoCheckoutCart();
    expect(sumIncludedSalesTax(cart.tickets, [])).toBe(0);
    expect(sumIncludedSalesTax([], [{ id: 1, taxPerTicket: 0.85 }])).toBe(0);
  });
});

describe("includedTicketPriceBreakdown", () => {
  it("sums tax, processing, and service fees from each ticket's price level", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const unit = Number(cart.tickets[0].cost);
    const tickets = [
      { ...cart.tickets[0], cost: unit },
      { ...cart.tickets[1], cost: unit, pricingLevelId: 2 },
    ];
    const pricingObjects = [
      {
        id: 1,
        totalDue: unit,
        taxPerTicket: 1.4,
        estimatedPaymentProcessingFee: 0.83,
        serviceFee: 2,
      },
      { id: 2, totalDue: unit, salesTax: 0.4, paymentProcessingFee: 0.5, serviceFee: 1 },
    ];

    expect(includedTicketPriceBreakdown(tickets, pricingObjects)).toEqual({
      tax: 1.8,
      processingFee: 1.33,
      serviceFee: 3,
    });
  });
});

describe("checkoutIncludedPriceBreakdown", () => {
  it("returns nothing when tax is charged on top or the price level has no amounts", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const unit = Number(cart.tickets[0].cost);
    const pricingObjects = [{ id: 1, totalDue: unit, taxPerTicket: 1.4 }];

    expect(
      checkoutIncludedPriceBreakdown({
        ...cart,
        totalTax: 2.5,
        am_pricing_objects: pricingObjects,
      }),
    ).toBeNull();
    expect(
      checkoutIncludedPriceBreakdown({
        ...cart,
        totalTax: 0,
        am_pricing_objects: [{ id: 1, totalDue: unit }],
      }),
    ).toBeNull();
    expect(
      checkoutIncludedPriceBreakdown({
        ...cart,
        totalTax: 0,
        am_pricing_objects: pricingObjects,
      }),
    ).toEqual({ tax: 2.8, processingFee: 0, serviceFee: 0 });
  });
});

describe("checkoutTaxLine", () => {
  it("keeps additive cart tax labeled Tax when the price also includes tax", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const unit = Number(cart.tickets[0].cost);
    const withIncluded = {
      ...cart,
      totalTax: 0,
      am_pricing_objects: [{ id: 1, totalDue: unit, taxPerTicket: 0.85 }],
    };

    expect(checkoutTaxLine({ ...withIncluded, totalTax: 2.5 })).toEqual({
      label: "Tax",
      amount: 2.5,
    });
    expect(
      checkoutTaxLine({
        ...withIncluded,
        totalTax: 0,
        salesTax: 3.5,
      }),
    ).toEqual({ label: "Tax (included)", amount: 1.7 });
  });

  it("shows a $0.00 Tax row for a flex pack and ignores cart.salesTax like legacy", () => {
    const cart = demoFlexPackCheckoutCart();

    expect(checkoutTaxLine({ ...cart, totalTax: 0, salesTax: 3.5 })).toEqual({
      label: "Tax",
      amount: 0,
    });
  });
});

describe("resolvePackageCheckoutTotals", () => {
  it("uses the seat subtotal when the cart total is missing", () => {
    const cart = demoPackageCheckoutCart({ total: 0 });
    const summary = packageOrderSummary(cart.package, cart.tickets);
    const totals = resolvePackageCheckoutTotals(cart, summary.subtotal);

    expect(totals.subtotal).toBe(summary.subtotal);
    expect(totals.serviceFee).toBe(Number(cart.serviceFee));
    expect(totals.processingFee).toBe(Number(cart.processingFee));
    expect(totals.total).toBe(
      summary.subtotal + Number(cart.serviceFee) + Number(cart.processingFee),
    );
  });

  it("does not add cart.salesTax or included tax onto a package total", () => {
    const cart = demoPackageCheckoutCart({ total: 0 });
    const seatSubtotal = 46;
    const totals = resolvePackageCheckoutTotals(
      { ...cart, totalTax: 0, salesTax: 3.5 },
      seatSubtotal,
    );

    expect(totals.total).toBe(
      seatSubtotal + Number(cart.serviceFee) + Number(cart.processingFee),
    );
    expect(
      checkoutTaxLine({ ...cart, totalTax: 0, salesTax: 3.5 }),
    ).toEqual({ label: "Tax", amount: 0 });
  });
});

describe("package custom fees", () => {
  it("reads each named fee on the cart snapshot", () => {
    expect(
      packageCustomFeeLines({
        customFeeLines: [
          { name: "Senior Fee", amount: 20 },
          { name: "  ", amount: 0 },
          { name: "Facility fee", amount: 5 },
        ],
      }),
    ).toEqual([
      { name: "Senior Fee", amount: 20 },
      { name: "Facility fee", amount: 5 },
    ]);
  });

  it("falls back to the single custom fee amount", () => {
    expect(
      packageCustomFeeLines(
        JSON.stringify({ customFeeName: "Senior Fee", customFeeAmount: 20 }),
      ),
    ).toEqual([{ name: "Senior Fee", amount: 20 }]);
  });

  it("lists a custom fee that was folded into an inferred seat price", () => {
    const cart = demoPackageCheckoutCart({
      tickets: [
        {
          sectionNumber: "113",
          rowNumber: "B",
          seatNumber: 3,
          cost: 0,
          price: 0,
        },
        {
          sectionNumber: "113",
          rowNumber: "B",
          seatNumber: 4,
          cost: 0,
          price: 0,
        },
      ],
      serviceFee: 3,
      processingFee: 14.6,
      total: 507.6,
    });
    const priced = {
      ...cart,
      package: { ...cart.package, pricingTiers: [], price: 0 },
      packageWebsiteFeeSnapshot: {
        customFeeLines: [{ id: 1, name: "Senior Fee", amount: 20 }],
      },
    };
    const totals = resolvePackageCheckoutTotals(priced, 0);

    expect(totals.customFeeLines).toEqual([{ name: "Senior Fee", amount: 20 }]);
    expect(totals.subtotal).toBe(470);
    expect(totals.serviceFee).toBe(3);
    expect(totals.processingFee).toBe(14.6);
    expect(totals.total).toBe(507.6);
    expect(
      alignPackageSeatPrices(
        withPackageCheckoutSeatPrices(
          packageOrderSummary(priced.package, priced.tickets).seats,
          totals.subtotal,
        ),
        totals.subtotal,
      )[0].price,
    ).toBe(470);
  });

  it("keeps ticket prices when the custom fee is already outside the subtotal", () => {
    const cart = demoPackageCheckoutCart({
      serviceFee: 3,
      processingFee: 14.6,
      total: 0,
    });
    const unit = Number(cart.package.pricingTiers[0].price);
    const totals = resolvePackageCheckoutTotals(
      {
        ...cart,
        total: unit + 3 + 14.6 + 20,
        packageWebsiteFeeSnapshot: {
          customFeeName: "Senior Fee",
          customFeeAmount: 20,
        },
      },
      unit,
    );

    expect(totals.subtotal).toBe(unit);
    expect(totals.customFeeLines).toEqual([{ name: "Senior Fee", amount: 20 }]);
    expect(totals.total).toBe(unit + 3 + 14.6 + 20);
  });
});

describe("resolveFlexPackCheckoutTotals", () => {
  it("uses $1 per voucher when the cart omits a service fee", () => {
    const cart = demoFlexPackCheckoutCart({ serviceFee: 0 });
    const totals = resolveFlexPackCheckoutTotals(cart);

    expect(totals.subtotal).toBe(Number(cart.flex_pack.price));
    expect(totals.serviceFee).toBe(Number(cart.flex_pack.gameTickets));
    expect(totals.processingFee).toBe(Number(cart.processingFee));
    expect(totals.total).toBe(
      Number(cart.flex_pack.price) +
        Number(cart.flex_pack.gameTickets) +
        Number(cart.processingFee),
    );
  });

  it("adds cart.totalTax onto the flex pack total like legacy", () => {
    const base = demoFlexPackCheckoutCart({ processingFee: 1.85 });
    const totals = resolveFlexPackCheckoutTotals({ ...base, totalTax: 3.5 });

    expect(totals.total).toBe(
      Number(base.flex_pack.price) + Number(base.serviceFee) + 1.85 + 3.5,
    );
  });
});

describe("resolveCompletedOrderFees", () => {
  it("matches Blocktickets by preferring the price-object processing estimate", () => {
    const fees = resolveCompletedOrderFees({
      total: 452.2,
      serviceFee: 40,
      processingFee: 12.2,
      estimatedProcessingFee: 12.3,
      salesTax: 0,
      priceObject: [{ estimatedPaymentProcessingFee: 12.38 }],
    });

    expect(fees).toEqual({
      subtotal: 399.82,
      tax: 0,
      processingFee: 12.38,
      serviceFee: 40,
      additionalFee: 0,
      customFeeLines: [],
      discount: 0,
      total: 452.2,
    });
  });

  it("names a package custom fee instead of folding it into the subtotal", () => {
    const fees = resolveCompletedOrderFees({
      total: 507.6,
      serviceFee: 3,
      processingFee: 14.6,
      salesTax: 0,
      totalFeeAmount: 20,
      priceObject: {
        packageCustomFees: [{ id: 4, name: "Senior Fee", amount: 20 }],
      },
    });

    expect(fees.customFeeLines).toEqual([{ name: "Senior Fee", amount: 20 }]);
    expect(fees.subtotal).toBe(470);
    expect(fees.additionalFee).toBe(20);
    expect(
      fees.subtotal +
        fees.tax +
        fees.processingFee +
        fees.serviceFee +
        fees.additionalFee,
    ).toBe(fees.total);
  });

  it("uses the order custom-fee name when the price object has no lines", () => {
    const fees = resolveCompletedOrderFees({
      total: 507.6,
      serviceFee: 3,
      processingFee: 14.6,
      salesTax: 0,
      totalFeeAmount: 20,
      custom_fees: [{ attributes: { name: "Senior Fee" } }],
    });

    expect(fees.customFeeLines).toEqual([{ name: "Senior Fee", amount: 20 }]);
    expect(fees.subtotal).toBe(470);
  });

  it("keeps a promo out of the subtotal so the breakdown foots to the amount paid", () => {
    const fees = resolveCompletedOrderFees({
      total: 5.5,
      serviceFee: 2.5,
      processingFee: 0.5,
      estimatedProcessingFee: 0.5,
      salesTax: 0,
      discountApplied: 2,
    });

    expect(fees.subtotal).toBe(4.5);
    expect(fees.discount).toBe(2);
    expect(
      fees.subtotal +
        fees.tax +
        fees.processingFee +
        fees.serviceFee -
        fees.discount,
    ).toBe(fees.total);
  });

  it("uses completed-order fallbacks for flex packs without price-object fees", () => {
    const cart = demoFlexPackCheckoutCart();
    const fees = resolveCompletedOrderFees({
      ...cart,
      estimatedProcessingFee: 4.25,
    });

    expect(fees.processingFee).toBe(4.25);
    expect(fees.serviceFee).toBe(cart.serviceFee);
    expect(fees.subtotal).toBe(
      cart.total - cart.serviceFee - 4.25,
    );
  });

  it("keeps flex pack tax out of the subtotal when the order only stores the pack price", () => {
    const order = demoCompletedFlexPackOrder({
      total: 55.35,
      serviceFee: 4,
      processingFee: 1.85,
      estimatedProcessingFee: 1.85,
      salesTax: 0,
      flex_pack: demoFlexPack({ price: 46, gameTickets: 4 }),
    });
    const fees = resolveCompletedOrderFees(order);

    expect(fees.tax).toBe(3.5);
    expect(fees.subtotal).toBe(46);
    expect(fees.subtotal + fees.tax + fees.processingFee + fees.serviceFee).toBe(
      55.35,
    );
  });

  it("keeps package snapshot tax out of the subtotal", () => {
    const order = demoCompletedPackageOrder({
      total: 100,
      serviceFee: 3,
      processingFee: 2,
      estimatedProcessingFee: 2,
      salesTax: 0,
      priceObject: {
        estimatedPaymentProcessingFee: 2,
        packageWebsiteFeeSnapshot: { tax: 7, subtotal: 88 },
      },
    });
    const fees = resolveCompletedOrderFees(order);

    expect(fees.tax).toBe(7);
    expect(fees.subtotal).toBe(88);
  });

  it("keeps included single-event tax out of the subtotal when salesTax is 0", () => {
    const order = demoCompletedTicketOrder({
      salesTax: 0,
      priceObject: { taxPerTicket: 1.4, estimatedPaymentProcessingFee: 3.92 },
    });
    const fees = resolveCompletedOrderFees(order);

    expect(fees.tax).toBe(5.6);
    expect(fees.subtotal).toBe(128.76);
  });
});

describe("completedOrderPromoCode", () => {
  it("labels the summary row with the redeemed code", () => {
    expect(
      completedOrderPromoCode({ discountBreakdown: { code: "TESTDIS" } }),
    ).toBe("TESTDIS");
    expect(completedOrderPromoCode({ promoCode: [{ code: "5OFFFEB7" }] })).toBe(
      "5OFFFEB7",
    );
    expect(promoSummaryLabel("TESTDIS")).toBe("Promo (TESTDIS)");
  });

  it("falls back to a plain Promo label when the order has no code", () => {
    expect(completedOrderPromoCode({})).toBe("");
    expect(completedOrderPromoCode(null)).toBe("");
    expect(promoSummaryLabel("")).toBe("Promo");
  });
});

describe("withPackageCheckoutSeatPrices", () => {
  it("puts the inferred subtotal on a $0 season seat line", () => {
    const cart = demoPackageCheckoutCart();
    const ticket = cart.tickets[0];
    const lines = packageSeatLines(
      [
        { ...ticket, seatNumber: 22, cost: 0, price: 0 },
        { ...ticket, seatNumber: 23, cost: 0, price: 0 },
      ],
      cart.package.events.length,
    );
    const priced = withPackageCheckoutSeatPrices(lines, 400);

    expect(priced).toHaveLength(1);
    expect(priced[0].price).toBe(400);
  });

  it("leaves priced seat lines unchanged", () => {
    const cart = demoPackageCheckoutCart();
    const lines = packageSeatLines(cart.tickets, cart.package.events.length);
    expect(withPackageCheckoutSeatPrices(lines, 400)).toEqual(lines);
  });
});
