import { describe, expect, it } from "vitest";
import {
  DEMO_SEATED_TICKET_GROUPS,
  demoCheckoutCart,
  demoFlexPackCheckoutCart,
  demoPackageCheckoutCart,
  demoSeasonPackage,
} from "@/lib/demo/fixtures";
import {
  packageOrderSummary,
  packageSeatLines,
  resolveFlexPackCheckoutTotals,
  resolvePackageCheckoutTotals,
  selectionOfferName,
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
