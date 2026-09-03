import { describe, expect, it } from "vitest";
import {
  DEMO_SEATED_TICKET_GROUPS,
  demoCheckoutCart,
  demoFlexPackCheckoutCart,
  demoPackageCheckoutCart,
  demoSeasonPackage,
} from "@/lib/demo/fixtures";
import {
  completedOrderPromoCode,
  packageOrderSummary,
  packageSeatLines,
  promoSummaryLabel,
  resolveCompletedOrderFees,
  resolveFlexPackCheckoutTotals,
  resolvePackageCheckoutTotals,
  selectionOfferName,
  selectionTicketCards,
  ticketSelectionSummary,
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
      discount: 0,
      total: 452.2,
    });
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
