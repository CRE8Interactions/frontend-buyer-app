import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_EVENTS,
  DEMO_SEATED_TICKET_GROUPS,
  DEMO_USER,
  demoCheckoutCart,
  demoCompletedFlexPackOrder,
  demoCompletedPackageOrder,
  demoCompletedTicketOrder,
  demoItemizedFeeCompletedOrder,
  demoMixedFacePriceCheckoutCart,
  demoFlexPack,
  demoSeasonPackage,
} from "@/lib/demo/fixtures";
import { quoteFlexPackPurchase } from "@/lib/flexPackDisplay";
import { formatCurrency } from "@/lib/helpers";
import * as orderApi from "@/lib/api";
import * as completedOrderApi from "@/lib/completedOrder";
import {
  buildOrderReceipt,
  downloadOrderReceipt,
  formatReceiptPaymentMethod,
  openOrderReceiptPdf,
  printOrderReceiptHtml,
  receiptDownloadFilename,
  receiptPurchaserFromSources,
  resolveOrderReceiptPdfUrl,
  shopperReceiptDownload,
} from "./orderReceipt";
import { renderOrderReceiptHtml } from "./orderReceiptHtml";
import { buildOrderReceiptPdf } from "./orderReceiptPdf";

const raptorsEvent =
  DEMO_EVENTS.find((event) => event.shortCode === "RAPT006") || DEMO_EVENTS[0];

describe("resolveOrderReceiptPdfUrl", () => {
  it("returns the Stripe invoice PDF URL when present", () => {
    expect(
      resolveOrderReceiptPdfUrl({
        stripe_invoices: [
          {
            stripeInvoicePdf: "https://pay.stripe.com/invoice/acct/pdf",
            stripeInvoiceLink: "https://pay.stripe.com/invoice/acct/hosted",
          },
        ],
      }),
    ).toBe("https://pay.stripe.com/invoice/acct/pdf");
  });

  it("falls back to the hosted invoice link when no PDF URL exists", () => {
    expect(
      resolveOrderReceiptPdfUrl({
        stripe_invoices: [
          {
            stripeInvoiceLink: "https://pay.stripe.com/invoice/acct/hosted",
          },
        ],
      }),
    ).toBe("https://pay.stripe.com/invoice/acct/hosted");
  });

  it("returns null when the order has no Stripe invoices", () => {
    expect(resolveOrderReceiptPdfUrl({ stripe_invoices: [] })).toBeNull();
    expect(resolveOrderReceiptPdfUrl(null)).toBeNull();
  });
});

describe("buildOrderReceipt", () => {
  it("builds a single-ticket receipt from the completed order summary", () => {
    const order = demoCompletedTicketOrder();
    const listing = DEMO_SEATED_TICKET_GROUPS[0];
    const receipt = buildOrderReceipt(order)!;
    const line = receipt.lines[0];
    const ticketCount = order.tickets.length;
    const subtotal = ticketCount * (listing.price ?? 0);

    expect(receipt.title).toBe("Receipt");
    expect(receipt.sellerName).toBe(raptorsEvent.organization.name);
    expect(receipt.sellerLogoUrl).toBe(raptorsEvent.organization.image.url);
    expect(receipt.invoiceNumber).toBe(order.orderId);
    expect(receipt.paymentMethod).toBe("Mastercard •••• 5652");
    expect(receipt.billToName).toBe(`${DEMO_USER.firstName} ${DEMO_USER.lastName}`);
    expect(receipt.billToEmail).toBe(DEMO_USER.email);
    expect(line.description).toBe(
      `${raptorsEvent.name} – Sec ${listing.sectionNumber} – Row ${listing.rowNumber} – Seat 7-10`,
    );
    expect(line.qty).toBe(String(ticketCount));
    expect(line.unitPrice).toBe(formatCurrency(listing.price));
    expect(line.amount).toBe(formatCurrency(subtotal));
    expect(receipt.totals).toEqual([
      { label: "Subtotal", amount: formatCurrency(subtotal) },
      {
        label: "Processing Fee",
        amount: formatCurrency(order.estimatedProcessingFee),
      },
      { label: "Service Fee", amount: formatCurrency(order.serviceFee) },
      { label: "Tax", amount: formatCurrency(order.salesTax) },
      { label: "Total", amount: formatCurrency(order.total), strong: true },
      {
        label: "Amount paid",
        amount: formatCurrency(order.total),
        strong: true,
        amountDue: true,
      },
    ]);
  });

  it("prices event ticket lines from the fee-exclusive subtotal", () => {
    const listing = DEMO_SEATED_TICKET_GROUPS[0];
    const order = demoCompletedTicketOrder({
      tickets: [
        {
          sectionName: listing.sectionNumber,
          sectionNumber: listing.sectionNumber,
          rowNumber: listing.rowNumber,
          seatNumber: 7,
          cost: 7.5,
          price: 7.5,
          offerName: listing.offer?.name,
        },
      ],
      total: 7.5,
      serviceFee: 2.5,
      estimatedProcessingFee: 0.5,
      processingFee: 0.5,
      salesTax: 0,
    });
    const receipt = buildOrderReceipt(order)!;
    const subtotal = 4.5;

    expect(receipt.lines[0].qty).toBe("1");
    expect(receipt.lines[0].unitPrice).toBe(formatCurrency(subtotal));
    expect(receipt.lines[0].amount).toBe(formatCurrency(subtotal));
    expect(receipt.totals[0]).toEqual({
      label: "Subtotal",
      amount: formatCurrency(subtotal),
    });
  });

  it("itemizes a profile order from the pricing saved on each ticket", () => {
    const full = demoItemizedFeeCompletedOrder();
    const pricing = full.priceObject;
    const listed = {
      ...full,
      priceObject: undefined,
      am_pricing_objects: undefined,
      tickets: (full.tickets || []).map((ticket) => ({
        ...ticket,
        am_pricing_object: pricing,
      })),
    };

    const fromProfile = buildOrderReceipt(listed)!;
    const fromCheckout = buildOrderReceipt(full)!;

    expect(fromProfile.lines.map((line) => line.unitPrice)).toEqual(
      fromCheckout.lines.map((line) => line.unitPrice),
    );
    expect(fromProfile.totals).toEqual(fromCheckout.totals);
  });

  it("labels one ticket price as the subtotal and lists each fee", () => {
    const order = demoItemizedFeeCompletedOrder();
    const pricing = order.priceObject as { offerPrice: number };
    const receipt = buildOrderReceipt(order)!;
    const face = pricing.offerPrice * order.tickets!.length;

    expect(receipt.lines[0].unitPrice).toBe(formatCurrency(pricing.offerPrice));
    expect(receipt.lines[0].amount).toBe(formatCurrency(face));
    expect(receipt.totals.map((row) => row.label)).toEqual([
      "Subtotal",
      "Processing Fee",
      "Service Fee",
      "Facility Fee",
      "Tax",
      "Total",
      "Amount paid",
    ]);
    expect(receipt.totals.find((row) => row.label === "Subtotal")?.amount).toBe(
      formatCurrency(face),
    );
    expect(receipt.totals.find((row) => row.label === "Tax")?.amount).toBe(
      formatCurrency(0),
    );
    expect(receipt.totals.find((row) => row.label === "Total")?.amount).toBe(
      formatCurrency(order.total),
    );
  });

  it("uses the normal ticket fee rows for a resale purchase", () => {
    const cart = demoCheckoutCart({ ticketCount: 2 });
    const order = demoCompletedTicketOrder({
      type: "resale",
      resaleListing: { id: 574, offer: null },
      tickets: cart.tickets.map((ticket) => ({
        ...ticket,
        resale: false,
        offer: null,
        cost: 0,
        price: 0,
        listingAskingPrice: 350,
      })),
      serviceFee: 70,
      processingFee: 22.94,
      estimatedProcessingFee: 22.94,
      salesTax: 63.52,
      total: 856.46,
    });
    const receipt = buildOrderReceipt(order)!;

    expect(receipt.totals).toEqual([
      { label: "Subtotal", amount: formatCurrency(700) },
      { label: "Processing Fee", amount: formatCurrency(22.94) },
      { label: "Service Fee", amount: formatCurrency(70) },
      { label: "Tax", amount: formatCurrency(63.52) },
      { label: "Total", amount: formatCurrency(856.46), strong: true },
      {
        label: "Amount paid",
        amount: formatCurrency(856.46),
        strong: true,
        amountDue: true,
      },
    ]);
  });

  it("lists each face price on a mixed order receipt", () => {
    const cart = demoMixedFacePriceCheckoutCart();
    const order = demoCompletedTicketOrder({
      tickets: cart.tickets,
      total: cart.total,
      salesTax: 0,
      priceObject: cart.am_pricing_objects,
    });
    const receipt = buildOrderReceipt(order)!;

    expect(receipt.lines.map((line) => line.unitPrice)).toEqual([
      formatCurrency(cart.am_pricing_objects[0].offerPrice),
      formatCurrency(cart.am_pricing_objects[1].offerPrice),
    ]);
    expect(receipt.totals.map((row) => row.label)).toContain("Facility Fee");
    expect(receipt.totals.map((row) => row.label)).not.toContain("Subtotal");
  });

  it("lists the promo name and still foots to the amount paid", () => {
    const listing = DEMO_SEATED_TICKET_GROUPS[0];
    const order = demoCompletedTicketOrder({
      tickets: [
        {
          sectionName: listing.sectionNumber,
          sectionNumber: listing.sectionNumber,
          rowNumber: listing.rowNumber,
          seatNumber: 7,
          cost: 7.5,
          price: 7.5,
          offerName: listing.offer?.name,
        },
      ],
      total: 5.5,
      serviceFee: 2.5,
      estimatedProcessingFee: 0.5,
      processingFee: 0.5,
      salesTax: 0,
      discountApplied: 2,
      discountBreakdown: { name: "Student Night", code: "TESTDIS" },
    });
    const receipt = buildOrderReceipt(order)!;

    expect(receipt.lines[0].unitPrice).toBe(formatCurrency(4.5));
    expect(receipt.totals).toEqual([
      { label: "Subtotal", amount: formatCurrency(4.5) },
      { label: "Processing Fee", amount: formatCurrency(0.5) },
      { label: "Service Fee", amount: formatCurrency(2.5) },
      { label: "Tax", amount: formatCurrency(0) },
      { label: "Student Night", amount: `-${formatCurrency(2)}` },
      { label: "Total", amount: formatCurrency(5.5), strong: true },
      {
        label: "Amount paid",
        amount: formatCurrency(5.5),
        strong: true,
        amountDue: true,
      },
    ]);
  });

  it("builds a package receipt using the season package name and seats", () => {
    const order = demoCompletedPackageOrder({
      total: 452.2,
      serviceFee: 40,
      processingFee: 12.2,
      estimatedProcessingFee: 12.3,
      priceObject: [{ estimatedPaymentProcessingFee: 12.38 }],
      salesTax: 0,
    });
    const pkg = demoSeasonPackage();
    const listing = DEMO_SEATED_TICKET_GROUPS[0];
    const receipt = buildOrderReceipt(order)!;

    expect(receipt.sellerName).toBe(pkg.organization.name);
    expect(receipt.invoiceNumber).toBe(order.orderId);
    expect(receipt.lines[0].description).toBe(
      `${pkg.name} – Sec ${listing.sectionNumber} – Row ${listing.rowNumber} – Seat 21-22`,
    );
    expect(receipt.lines[0].qty).toBe(String(order.tickets.length));
    expect(receipt.lines[0].amount).toBe("$399.82");
    expect(receipt.lines[0].unitPrice).toBe(
      formatCurrency(399.82 / order.tickets.length),
    );
    expect(receipt.totals.slice(0, 4)).toEqual([
      { label: "Subtotal", amount: "$399.82" },
      { label: "Processing Fee", amount: "$12.38" },
      { label: "Service Fee", amount: "$40.00" },
      { label: "Tax", amount: "$0.00" },
    ]);
  });

  it("names the package custom fee instead of Additional Fee", () => {
    const order = demoCompletedPackageOrder({
      total: 507.6,
      serviceFee: 3,
      processingFee: 14.6,
      estimatedProcessingFee: 14.6,
      salesTax: 0,
      totalFeeAmount: 20,
      priceObject: {
        packageCustomFees: [{ name: "Senior Fee", amount: 20 }],
      },
      custom_fees: [{ name: "Senior Fee" }],
    });
    const receipt = buildOrderReceipt(order)!;

    expect(receipt.totals.map((row) => row.label)).toEqual([
      "Subtotal",
      "Processing Fee",
      "Service Fee",
      "Senior Fee",
      "Tax",
      "Total",
      "Amount paid",
    ]);
    expect(receipt.totals.find((row) => row.label === "Senior Fee")?.amount).toBe(
      formatCurrency(20),
    );
    expect(receipt.totals.find((row) => row.label === "Subtotal")?.amount).toBe(
      formatCurrency(470),
    );
    expect(receipt.totals.some((row) => row.label === "Additional Fee")).toBe(false);
  });

  it("prints the seat number without an accessibility suffix", () => {
    const order = demoCompletedTicketOrder();
    const ticket = order.tickets[0] as Record<string, unknown>;
    const receipt = buildOrderReceipt(
      demoCompletedTicketOrder({
        tickets: [{ ...ticket, seatNumber: "15_DA" }],
      }),
    )!;

    expect(receipt.lines[0].description).toContain("Seat 15");
    expect(receipt.lines[0].description).not.toContain("15_DA");
  });

  it("orders accessible seats and collapses consecutive numbers", () => {
    const order = demoCompletedTicketOrder();
    const [first, second] = order.tickets as Array<Record<string, unknown>>;
    const receipt = buildOrderReceipt(
      demoCompletedTicketOrder({
        tickets: [
          { ...first, seatNumber: "13_DA" },
          { ...second, seatNumber: "12_DA" },
        ],
      }),
    )!;

    expect(receipt.lines[0].description).toContain("Seat 12-13");
  });

  it("lists one package line when only one game copy carries the price", () => {
    const pkg = demoSeasonPackage();
    const base = demoCompletedPackageOrder();
    const ticket = (base.tickets as Array<Record<string, unknown>>)[0];
    const section = "Standing Room Right";
    const tickets = Array.from({ length: 10 }, (_, index) => ({
      ...ticket,
      id: index + 1,
      sectionNumber: section,
      sectionName: section,
      rowNumber: undefined,
      seatNumber: undefined,
      generalAdmission: false,
      GA: false,
      offerName: index === 0 ? "Standard Admission" : undefined,
      cost: index === 0 ? 19.02 : 10,
      price: index === 0 ? 19.02 : 10,
    }));
    const receipt = buildOrderReceipt(
      demoCompletedPackageOrder({
        tickets,
        total: 103.2,
        serviceFee: 0,
        processingFee: 3.2,
        estimatedProcessingFee: 3.2,
        salesTax: 0,
      }),
    )!;

    expect(receipt.lines).toHaveLength(1);
    expect(receipt.lines[0].description).toBe(
      `${pkg.name} – Sec ${section} – Row N/A – Seat N/A`,
    );
    expect(receipt.lines[0].qty).toBe("10");
    expect(receipt.lines[0].unitPrice).toBe(formatCurrency(10));
    expect(receipt.lines[0].amount).toBe(formatCurrency(100));
  });

  it("does not repeat a package seat once per game", () => {
    const pkg = demoSeasonPackage();
    const listing = DEMO_SEATED_TICKET_GROUPS[0];
    const base = demoCompletedPackageOrder();
    const ticket = (base.tickets as Array<Record<string, unknown>>)[0];
    const tickets = pkg.events.map(() => ({ ...ticket }));
    const receipt = buildOrderReceipt(
      demoCompletedPackageOrder({ tickets }),
    )!;

    expect(receipt.lines[0].description).toBe(
      `${pkg.name} – Sec ${listing.sectionNumber} – Row ${listing.rowNumber} – Seat ${ticket.seatNumber}`,
    );
    expect(receipt.lines[0].qty).toBe(String(pkg.events.length));
  });

  it("returns no line items when the order has no tickets", () => {
    const receipt = buildOrderReceipt(demoCompletedTicketOrder({ tickets: [] }))!;
    expect(receipt.lines).toEqual([]);
    expect(receipt.emptyLinesMessage).toMatch(/no ticket line items/i);
  });

  it("uses the provided seller name when the order has no organization", () => {
    const receipt = buildOrderReceipt(
      demoCompletedTicketOrder({
        organization: null,
        event: { name: raptorsEvent.name, organization: null },
      }),
      undefined,
      { sellerName: raptorsEvent.organization.name },
    )!;
    expect(receipt.sellerName).toBe(raptorsEvent.organization.name);
  });

  it("falls back to blocktickets when no organization name is available", () => {
    const receipt = buildOrderReceipt(
      demoCompletedTicketOrder({
        organization: null,
        event: { name: raptorsEvent.name, organization: null },
      }),
    )!;
    expect(receipt.sellerName).toBe("blocktickets");
  });

  it("bills the purchaser name from the page when the order omits it", () => {
    const receipt = buildOrderReceipt(
      demoCompletedTicketOrder({
        firstName: undefined,
        lastName: undefined,
      }),
      {
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
        email: DEMO_USER.email,
      },
    )!;
    expect(receipt.billToName).toBe(
      `${DEMO_USER.firstName} ${DEMO_USER.lastName}`,
    );
  });

  it("reads snake_case first and last names from the signed-in user", () => {
    const purchaser = receiptPurchaserFromSources({
      user: {
        first_name: DEMO_USER.firstName,
        last_name: DEMO_USER.lastName,
        email: DEMO_USER.email,
      },
      order: demoCompletedTicketOrder({
        firstName: undefined,
        lastName: undefined,
      }),
    });
    expect(purchaser).toEqual({
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
      email: DEMO_USER.email,
    });
  });

  it("splits a combined order name when first and last are missing", () => {
    const purchaser = receiptPurchaserFromSources({
      order: demoCompletedTicketOrder({
        firstName: undefined,
        lastName: undefined,
        name: `${DEMO_USER.firstName} ${DEMO_USER.lastName}`,
      }),
    });
    expect(purchaser.firstName).toBe(DEMO_USER.firstName);
    expect(purchaser.lastName).toBe(DEMO_USER.lastName);
  });

  it("shows N/A when no purchaser name is available", () => {
    const receipt = buildOrderReceipt(
      demoCompletedTicketOrder({
        firstName: undefined,
        lastName: undefined,
      }),
    )!;
    expect(receipt.billToName).toBe("N/A");
  });

  it("lists a flex pack as description, qty, unit price, and amount", () => {
    const pack = demoFlexPack();
    const order = demoCompletedFlexPackOrder({
      estimatedProcessingFee: 4.25,
    });
    const receipt = buildOrderReceipt(order)!;
    const qty = Number(pack.gameTickets);
    const unit = Number(pack.price) / qty;

    expect(receipt.lines).toEqual([
      {
        description: `${pack.name} - ${qty} Vouchers (includes ${qty} game tickets)`,
        qty: String(qty),
        unitPrice: formatCurrency(unit),
        amount: formatCurrency(pack.price),
      },
    ]);
    expect(receipt.totals.slice(0, 4)).toEqual([
      {
        label: "Subtotal",
        amount: formatCurrency(
          order.total -
            order.serviceFee -
            order.estimatedProcessingFee -
            order.salesTax,
        ),
      },
      {
        label: "Processing Fee",
        amount: formatCurrency(order.estimatedProcessingFee),
      },
      { label: "Service Fee", amount: formatCurrency(order.serviceFee) },
      { label: "Tax", amount: formatCurrency(order.salesTax) },
    ]);
  });

  it("prices a flex pack receipt at the amount paid when a custom fee is charged", () => {
    const pack = demoFlexPack({
      customFees: [{ id: 7, name: "Drink", option: "amount", feeAmount: 8 }],
    });
    const quote = quoteFlexPackPurchase(pack);
    const order = demoCompletedFlexPackOrder({
      flex_pack: pack,
      total: quote.buyerTotal,
      serviceFee: quote.voucherFee,
      processingFee: quote.processingFee,
      estimatedProcessingFee: quote.processingFee,
      priceObject: {
        packageCustomFees: [
          { id: 7, name: "Drink", amount: quote.customFeeAmount },
        ],
        estimatedPaymentProcessingFee: quote.processingFee,
      },
    });
    const receipt = buildOrderReceipt(order)!;
    const qty = Number(pack.gameTickets);

    expect(receipt.lines[0].qty).toBe(String(qty));
    expect(receipt.lines[0].unitPrice).toBe(
      formatCurrency(quote.buyerTotal / qty),
    );
    expect(receipt.lines[0].amount).toBe(formatCurrency(quote.buyerTotal));
    expect(receipt.totals).toEqual(
      expect.arrayContaining([
        { label: "Drink", amount: formatCurrency(quote.customFeeAmount) },
        { label: "Total", amount: formatCurrency(quote.buyerTotal), strong: true },
      ]),
    );
    expect(receipt.lines[0].unitPrice).not.toBe(
      formatCurrency(Number(pack.price) / qty),
    );
  });

  it("lists the voucher service fee when a flex pack order stored the whole remainder as tax", () => {
    const order = demoCompletedFlexPackOrder({
      total: 35.53,
      serviceFee: 0,
      processingFee: 0,
      estimatedProcessingFee: 0,
      salesTax: 5.53,
      flex_pack: demoFlexPack({ name: "Silver Package", price: 30, gameTickets: 2 }),
      vouchers: [{ code: "111111" }, { code: "222222" }],
    });
    const receipt = buildOrderReceipt(order)!;

    expect(receipt.totals).toEqual(
      expect.arrayContaining([
        { label: "Subtotal", amount: formatCurrency(30) },
        { label: "Processing Fee", amount: formatCurrency(0) },
        { label: "Service Fee", amount: formatCurrency(2) },
        { label: "Tax", amount: formatCurrency(3.53) },
        { label: "Total", amount: formatCurrency(35.53), strong: true },
      ]),
    );
  });

  it("still lists a flex pack when only vouchers are on the order", () => {
    const pack = demoFlexPack();
    const order = demoCompletedFlexPackOrder({
      flex_pack: { ...pack, gameTickets: undefined },
    });
    const receipt = buildOrderReceipt(order)!;

    expect(receipt.lines[0].qty).toBe(String(order.vouchers.length));
    expect(receipt.lines[0].description).toContain(pack.name);
    expect(receipt.lines[0].description).toMatch(/vouchers/i);
  });

  it("returns null when there is no order", () => {
    expect(buildOrderReceipt(null)).toBeNull();
  });
});

describe("formatReceiptPaymentMethod", () => {
  it("labels Stripe Link as Link", () => {
    expect(
      formatReceiptPaymentMethod({ paymentMethodType: "link" }),
    ).toBe("Link");
  });

  it("uses the Stripe charge card brand and last4 when present", () => {
    expect(
      formatReceiptPaymentMethod({
        intentDetails: {
          charges: {
            data: [
              {
                payment_method_details: {
                  card: { brand: "visa", last4: "4242" },
                },
              },
            ],
          },
        },
      }),
    ).toBe("Visa •••• 4242");
  });
});

describe("renderOrderReceiptHtml", () => {
  it("renders the blocktickets invoice layout from a completed ticket order", () => {
    const order = demoCompletedTicketOrder();
    const receipt = buildOrderReceipt(order)!;
    const html = renderOrderReceiptHtml(receipt);

    expect(html).toContain('class="invoice-doc"');
    expect(html).toContain("Receipt");
    expect(html).toContain(receipt.sellerName);
    expect(html).toContain(receipt.sellerLogoUrl || "");
    expect(html).toContain(order.orderId);
    expect(html).toContain(receipt.lines[0].description);
    expect(html).toContain(receipt.paymentMethod);
    expect(html).toContain(receipt.billToName);
    expect(html).toContain(receipt.billToEmail);
    expect(html).toContain("Please note our rules and regulations");
  });

  it("shows the empty-line message when the order has no tickets", () => {
    const html = renderOrderReceiptHtml(
      buildOrderReceipt(demoCompletedTicketOrder({ tickets: [] }))!,
    );
    expect(html).toMatch(/no ticket line items/i);
  });
});

describe("downloadOrderReceipt", () => {
  it("downloads a PDF generated from the invoice HTML", async () => {
    const order = demoCompletedTicketOrder();
    const toPdf = vi.fn(async (html: string) => {
      expect(html).toContain('class="invoice-doc"');
      expect(html).toContain(String(order.orderId));
      expect(html).toContain("Receipt");
      expect(html).toContain(raptorsEvent.organization.image.url);
      return new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    });
    const saveFile = vi.fn();
    await downloadOrderReceipt({ order, toPdf, saveFile });
    expect(toPdf).toHaveBeenCalledTimes(1);
    expect(saveFile).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      receiptDownloadFilename(buildOrderReceipt(order)!),
    );
    const bytes = saveFile.mock.calls[0][0] as Uint8Array;
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });

  it("uses the provided organization logo on the receipt", async () => {
    const order = demoCompletedTicketOrder({
      organization: { name: raptorsEvent.organization.name },
      event: {
        name: raptorsEvent.name,
        organization: { name: raptorsEvent.organization.name },
      },
    });
    const toPdf = vi.fn(async (html: string) => {
      expect(html).toContain(raptorsEvent.organization.image.url);
      return new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    });
    await downloadOrderReceipt({
      order,
      sellerLogoUrl: raptorsEvent.organization.image.url,
      toPdf,
      saveFile: vi.fn(),
    });
    expect(toPdf).toHaveBeenCalledTimes(1);
  });

  it("does not download a file when there is no order", async () => {
    const toPdf = vi.fn();
    const saveFile = vi.fn();
    await expect(
      downloadOrderReceipt({ order: null, toPdf, saveFile }),
    ).rejects.toThrow(/receipt unavailable/i);
    expect(toPdf).not.toHaveBeenCalled();
    expect(saveFile).not.toHaveBeenCalled();
  });
});

describe("shopperReceiptDownload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fills an activity invoice from the full order so the receipt matches checkout", async () => {
    const full = demoItemizedFeeCompletedOrder();
    const listed = {
      ...full,
      priceObject: undefined,
      am_pricing_objects: undefined,
    };
    const getOrder = vi
      .spyOn(orderApi, "getOrder")
      .mockResolvedValue({ data: full } as never);

    const prepared = await shopperReceiptDownload({
      order: listed,
      user: DEMO_USER,
      hydratePricing: true,
    });

    expect(getOrder).toHaveBeenCalledWith(full.orderId);
    const fromActivity = buildOrderReceipt(prepared.order, prepared.purchaser, {
      sellerLogoUrl: prepared.sellerLogoUrl,
      sellerName: prepared.sellerName,
    });
    const fromCheckout = buildOrderReceipt(full, prepared.purchaser, {
      sellerLogoUrl: prepared.sellerLogoUrl,
      sellerName: prepared.sellerName,
    });
    expect(fromActivity!.lines).toEqual(fromCheckout!.lines);
    expect(fromActivity!.totals).toEqual(fromCheckout!.totals);
  });

  it("uses the checkout order when the saved order has no fee split", async () => {
    const full = demoItemizedFeeCompletedOrder();
    const listed = {
      ...full,
      priceObject: undefined,
      am_pricing_objects: undefined,
      paymentIntentId: "pi_checkout",
      serviceFee: 0,
      processingFee: 0,
      estimatedProcessingFee: 0,
      salesTax: 0,
    };
    vi.spyOn(orderApi, "getOrder").mockResolvedValue({ data: listed } as never);
    const fetchOrder = vi
      .spyOn(completedOrderApi, "fetchCompletedOrder")
      .mockResolvedValue(full as never);

    const prepared = await shopperReceiptDownload({
      order: listed,
      hydratePricing: true,
    });

    expect(fetchOrder).toHaveBeenCalledWith("pi_checkout");
    const fromProfile = buildOrderReceipt(prepared.order)!;
    const fromCheckout = buildOrderReceipt(full)!;
    expect(fromProfile.lines.map((line) => line.unitPrice)).toEqual(
      fromCheckout.lines.map((line) => line.unitPrice),
    );
    expect(fromProfile.totals).toEqual(fromCheckout.totals);
  });

  it("uses the checkout flex pack fees when activity stored them as tax", async () => {
    const pack = demoFlexPack({ name: "Silver Package", price: 30, gameTickets: 2 });
    const full = demoCompletedFlexPackOrder({
      total: 35.53,
      serviceFee: 2,
      processingFee: 1.2,
      estimatedProcessingFee: 1.2,
      salesTax: 2.33,
      flex_pack: pack,
      vouchers: [{ code: "111111" }, { code: "222222" }],
    });
    const listed = {
      ...full,
      serviceFee: 0,
      processingFee: 0,
      estimatedProcessingFee: 0,
      salesTax: 5.53,
      intentDetails: { id: "pi_flexfees" },
    };
    vi.spyOn(orderApi, "getOrder").mockResolvedValue({ data: listed } as never);
    const fetchOrder = vi
      .spyOn(completedOrderApi, "fetchCompletedOrder")
      .mockResolvedValue(full as never);

    const prepared = await shopperReceiptDownload({
      order: listed,
      hydratePricing: true,
    });

    expect(fetchOrder).toHaveBeenCalledWith("pi_flexfees");
    expect(buildOrderReceipt(prepared.order)!.totals).toEqual(
      buildOrderReceipt(full)!.totals,
    );
  });

  it("finds the payment intent on the saved order wherever it is stored", async () => {
    const full = demoItemizedFeeCompletedOrder();
    const listed = {
      ...full,
      priceObject: undefined,
      am_pricing_objects: undefined,
      serviceFee: 0,
      processingFee: 0,
      estimatedProcessingFee: 0,
      salesTax: 0,
      intentDetails: { id: "pi_3Nested123", charges: { data: [] } },
    };
    vi.spyOn(orderApi, "getOrder").mockResolvedValue({ data: listed } as never);
    const fetchOrder = vi
      .spyOn(completedOrderApi, "fetchCompletedOrder")
      .mockResolvedValue(full as never);

    const prepared = await shopperReceiptDownload({
      order: listed,
      hydratePricing: true,
    });

    expect(fetchOrder).toHaveBeenCalledWith("pi_3Nested123");
    expect(buildOrderReceipt(prepared.order)!.totals).toEqual(
      buildOrderReceipt(full)!.totals,
    );
  });

  it("keeps the activity invoice when the full order cannot be loaded", async () => {
    const full = demoItemizedFeeCompletedOrder();
    const listed = {
      ...full,
      priceObject: undefined,
      am_pricing_objects: undefined,
    };
    vi.spyOn(orderApi, "getOrder").mockRejectedValue(new Error("offline"));

    const prepared = await shopperReceiptDownload({
      order: listed,
      hydratePricing: true,
    });

    expect(prepared.order.priceObject).toBeUndefined();
    const fromActivity = buildOrderReceipt(prepared.order)!;
    const fromCheckout = buildOrderReceipt(full)!;
    expect(fromActivity.lines[0]?.unitPrice).not.toBe(
      fromCheckout.lines[0]?.unitPrice,
    );
  });

  it("loads a missing buyer name without replacing the checkout order", async () => {
    const checkoutOrder = {
      ...demoItemizedFeeCompletedOrder(),
      firstName: undefined,
      lastName: undefined,
    };
    vi.spyOn(orderApi, "getOrder").mockResolvedValue({
      data: demoCompletedTicketOrder({
        firstName: DEMO_USER.firstName,
        lastName: DEMO_USER.lastName,
        priceObject: undefined,
      }),
    } as never);

    const prepared = await shopperReceiptDownload({
      order: checkoutOrder,
      user: { email: DEMO_USER.email },
      sellerName: "Ogden Raptors",
      sellerLogoUrl: "/logo.png",
    });

    expect(prepared.order.priceObject).toEqual(checkoutOrder.priceObject);
    expect(prepared.purchaser).toEqual({
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
      email: DEMO_USER.email,
    });
    expect(prepared.sellerName).toBe("Ogden Raptors");
    expect(prepared.sellerLogoUrl).toBe("/logo.png");
  });

  it("does not load the order again when checkout already has the buyer name", async () => {
    const getOrder = vi.spyOn(orderApi, "getOrder");
    const prepared = await shopperReceiptDownload({
      order: demoCompletedTicketOrder(),
      user: DEMO_USER,
      sellerName: "Ogden Raptors",
    });

    expect(getOrder).not.toHaveBeenCalled();
    expect(prepared.purchaser).toEqual({
      firstName: DEMO_USER.firstName,
      lastName: DEMO_USER.lastName,
      email: DEMO_USER.email,
    });
    expect(prepared.sellerName).toBe("Ogden Raptors");
  });
});

describe("buildOrderReceiptPdf", () => {
  it("creates a PDF document for a ticket receipt", async () => {
    const bytes = await buildOrderReceiptPdf(buildOrderReceipt(demoCompletedTicketOrder())!);
    expect(bytes.byteLength).toBeGreaterThan(100);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("%PDF");
  });
});

describe("openOrderReceiptPdf", () => {
  it("opens the receipt in a new tab", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    openOrderReceiptPdf("https://example.com/receipt.pdf");
    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com/receipt.pdf",
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });
});

describe("printOrderReceiptHtml", () => {
  it("creates a hidden iframe with the receipt HTML", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    printOrderReceiptHtml('<div class="invoice-doc">Receipt</div>');
    expect(appendSpy).toHaveBeenCalled();
    appendSpy.mockRestore();
  });
});
