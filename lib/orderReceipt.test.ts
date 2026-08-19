import { describe, expect, it, vi } from "vitest";
import {
  DEMO_EVENTS,
  DEMO_SEATED_TICKET_GROUPS,
  DEMO_USER,
  demoCompletedFlexPackOrder,
  demoCompletedPackageOrder,
  demoCompletedTicketOrder,
  demoFlexPack,
  demoSeasonPackage,
} from "@/lib/demo/fixtures";
import { formatCurrency } from "@/lib/helpers";
import {
  buildOrderReceipt,
  downloadOrderReceipt,
  formatReceiptPaymentMethod,
  openOrderReceiptPdf,
  printOrderReceiptHtml,
  receiptDownloadFilename,
  resolveOrderReceiptPdfUrl,
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
    const subtotal = ticketCount * listing.price;

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
      { label: "Service charge", amount: formatCurrency(order.serviceFee) },
      {
        label: "Processing fee",
        amount: formatCurrency(order.estimatedProcessingFee),
      },
      { label: "Total", amount: formatCurrency(order.total), strong: true },
      {
        label: "Amount paid",
        amount: formatCurrency(order.total),
        strong: true,
        amountDue: true,
      },
    ]);
  });

  it("builds a package receipt using the season package name and seats", () => {
    const order = demoCompletedPackageOrder();
    const pkg = demoSeasonPackage();
    const listing = DEMO_SEATED_TICKET_GROUPS[0];
    const receipt = buildOrderReceipt(order)!;
    const unit = Number(pkg.pricingTiers[0].price);

    expect(receipt.sellerName).toBe(pkg.organization.name);
    expect(receipt.invoiceNumber).toBe(order.orderId);
    expect(receipt.lines[0].description).toBe(
      `${pkg.name} – Sec ${listing.sectionNumber} – Row ${listing.rowNumber} – Seat 21-22`,
    );
    expect(receipt.lines[0].qty).toBe(String(order.tickets.length));
    expect(receipt.lines[0].unitPrice).toBe(formatCurrency(unit));
    expect(receipt.lines[0].amount).toBe(formatCurrency(unit * order.tickets.length));
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

  it("lists a flex pack as description, qty, unit price, and amount", () => {
    const pack = demoFlexPack();
    const order = demoCompletedFlexPackOrder();
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
