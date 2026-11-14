import { getOrder } from "@/lib/api";
import {
  resolveBrandLogo,
  resolvePrimaryColor,
  type BrandingOrganization,
} from "@/lib/branding";
import {
  checkoutBrandingFromCart,
  type CheckoutCartBrandingSource,
} from "@/lib/checkoutBranding";
import {
  fetchCompletedOrder,
  normalizeOrderPayload,
} from "@/lib/completedOrder";
import { formatCurrency, toIanaTimezone, type TimezoneLike } from "@/lib/helpers";
import { flexPackVoucherCount } from "@/lib/flexPackDisplay";
import { formatOrderPaymentMethodSummary, resolveCardLast4 } from "@/lib/orderPayment";
import {
  receiptHasInvoiceDoc,
  renderOrderReceiptHtml,
} from "@/lib/orderReceiptHtml";
import { htmlToReceiptPdf } from "@/lib/orderReceiptHtmlToPdf";
import { saveReceiptPdf } from "@/lib/orderReceiptPdf";
import {
  completedOrderPromoName,
  completedOrderResaleSummary,
  orderPrimaryFeeBreakdown,
  primaryTicketFeeSummaryRows,
  type PrimaryTicketFeeBreakdown,
  promoSummaryLabel,
  resolveCompletedOrderFees,
  ticketUnitAmount,
} from "@/lib/ticketSummary";
import {
  formatSeatNumberRanges,
  seatNumberDigits,
  ticketRowValue,
  ticketSeatValue,
  ticketSectionValue,
} from "@/lib/wallet";
import moment from "moment-timezone";

export type OrderReceiptPerson = {
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
};

export type OrderReceiptPurchaser = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export type OrderReceiptSource = {
  id?: string | number;
  orderId?: string | number;
  invoiceUUID?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  purchaserEmail?: string;
  user?: OrderReceiptPerson | null;
  purchaser?: OrderReceiptPerson | null;
  paymentMethodType?: string | number | null;
  last4?: string | number | null;
  paymentProcessor?: string | null;
  paymentType?: string | null;
  paymentStatus?: string | null;
  intentDetails?: {
    id?: string;
    charges?: {
      data?: Array<{
        payment_method_details?: {
          card?: { brand?: string; last4?: string | number };
        };
      }>;
    };
  };
  total?: number;
  serviceFee?: number;
  processingFee?: number;
  estimatedProcessingFee?: number;
  salesTax?: number;
  totalTax?: number;
  totalFeeAmount?: number;
  discountApplied?: number;
  discountBreakdown?: { code?: string } | null;
  promoPricingDetails?: { code?: string } | null;
  promoCode?: Array<{ code?: string } | null> | { code?: string } | null;
  promo_code?: { code?: string } | null;
  priceObject?:
    | Record<string, unknown>
    | Array<Record<string, unknown> | null | undefined>
    | null;
  dateOfIssue?: string;
  processedAt?: string;
  paidAt?: string;
  datePaid?: string;
  dueDate?: string;
  tickets?: Array<Record<string, unknown>>;
  event?: {
    name?: string;
    venue?: { timezone?: TimezoneLike };
    organization?: BrandingOrganization | null;
  } | null;
  package?: {
    name?: string;
    venue?: { timezone?: TimezoneLike };
    organization?: BrandingOrganization | null;
    events?: Array<{ venue?: { timezone?: TimezoneLike } }>;
  } | null;
  flex_pack?: {
    name?: string;
    price?: number;
    gameTickets?: number;
    organization?: BrandingOrganization | null;
    venue?: { timezone?: TimezoneLike };
  } | null;
  vouchers?: Array<{ code?: string }>;
  access_pass_template?: {
    name?: string;
    organization?: BrandingOrganization | null;
    venue?: { timezone?: TimezoneLike };
  } | null;
  organization?: BrandingOrganization | null;
  stripe_invoices?: Array<{ stripeInvoiceId?: string }>;
};

export type OrderReceiptLine = {
  description: string;
  qty: string;
  unitPrice: string;
  amount: string;
};

export type OrderReceiptTotal = {
  label: string;
  amount: string;
  strong?: boolean;
  amountDue?: boolean;
  note?: string;
};

export type OrderReceipt = {
  title: string;
  sellerName: string;
  sellerLogoUrl?: string;
  sellerInitials: string;
  sellerAccent: string;
  sellerAddressLine1?: string;
  sellerAddressLine2?: string;
  sellerCountry?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerTaxId?: string;
  sellerTiname?: string;
  sellerTincode?: string;
  inquiryEmail: string;
  invoiceNumber: string;
  paymentMethod: string;
  issueDate: string;
  dueDate: string;
  paidOnLabel: string;
  supportNote: string;
  billToLabel: string;
  billToName: string;
  billToEmail: string;
  lines: OrderReceiptLine[];
  emptyLinesMessage: string;
  totals: OrderReceiptTotal[];
};

type ReceiptSellerOrg = BrandingOrganization & {
  address?: Array<{
    address?: string;
    address_1?: string;
    city?: string;
    state?: string;
    zip?: string;
    zipcode?: string;
    country?: string;
  }>;
  phoneNumber?: string;
  email?: string;
  taxId?: string;
  tiname?: string;
  tincode?: string;
  display_tin?: boolean;
};

function namePart(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function splitPersonName(value?: string) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function personFirstName(person?: OrderReceiptPerson | null) {
  return namePart(person?.firstName, person?.first_name);
}

function personLastName(person?: OrderReceiptPerson | null) {
  return namePart(person?.lastName, person?.last_name);
}

/** Buyer name/email from the success page, guest session, or completed order. */
export function receiptPurchaserFromSources({
  user,
  guest,
  purchaser,
  order,
}: {
  user?: OrderReceiptPerson | null;
  guest?: OrderReceiptPerson | null;
  purchaser?: OrderReceiptPerson | null;
  order?: OrderReceiptSource | null;
} = {}): OrderReceiptPurchaser {
  let firstName = namePart(
    personFirstName(user),
    personFirstName(guest),
    personFirstName(purchaser),
    order?.firstName,
    order?.first_name,
    personFirstName(order?.user),
    personFirstName(order?.purchaser),
  );
  let lastName = namePart(
    personLastName(user),
    personLastName(guest),
    personLastName(purchaser),
    order?.lastName,
    order?.last_name,
    personLastName(order?.user),
    personLastName(order?.purchaser),
  );
  if (!firstName || !lastName) {
    const combined = splitPersonName(
      namePart(
        user?.name,
        guest?.name,
        purchaser?.name,
        order?.name,
        order?.user?.name,
        order?.purchaser?.name,
      ),
    );
    firstName = firstName || combined.firstName;
    lastName = lastName || combined.lastName;
  }
  return {
    firstName,
    lastName,
    email: namePart(
      user?.email,
      guest?.email,
      purchaser?.email,
      order?.email,
      order?.purchaserEmail,
      order?.user?.email,
      order?.purchaser?.email,
    ),
  };
}

function titleCaseName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "BT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function receiptTimezone(order: OrderReceiptSource): TimezoneLike {
  return (
    order.event?.venue?.timezone ||
    order.package?.venue?.timezone ||
    order.package?.events?.[0]?.venue?.timezone ||
    order.flex_pack?.venue?.timezone ||
    order.access_pass_template?.venue?.timezone
  );
}

export function formatReceiptDate(dateLike?: string | null, timezone?: TimezoneLike) {
  if (!dateLike) return "N/A";
  const tz = toIanaTimezone(timezone) || "UTC";
  const parsed = moment.tz(dateLike, tz);
  return parsed.isValid() ? parsed.format("MMMM D, YYYY") : "N/A";
}

export function formatReceiptPaymentMethod(order: OrderReceiptSource | null) {
  if (!order) return "—";
  const card =
    order.intentDetails?.charges?.data?.[0]?.payment_method_details?.card;
  if (card?.brand && card?.last4) {
    return `${titleCaseName(String(card.brand))} •••• ${resolveCardLast4({ last4: card.last4 }) || card.last4}`;
  }
  const type = String(order.paymentMethodType ?? "").trim();
  if (type.toLowerCase() === "link") return "Link";
  if (
    order.paymentProcessor === "free" ||
    type.toLowerCase() === "complimentary"
  ) {
    return "Complimentary";
  }
  const last4 = resolveCardLast4(order);
  if (last4) {
    const brand = /^\d{4}$/.test(type)
      ? "Card"
      : type
        ? type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
        : "Card";
    return `${brand} •••• ${last4}`;
  }
  const status = String(order.paymentStatus || "").toLowerCase();
  const paymentType = String(order.paymentType || "").toLowerCase();
  const statusLabels: Record<string, string> = {
    cash: "Cash",
    e_transfer: "E-transfer",
    check: "Check",
    team_credit: "Team credit",
    payroll_deduction: "Payroll deduction",
    plan: "Payment plan",
    released: "Complimentary",
    draft: "Draft",
  };
  if (statusLabels[status]) return statusLabels[status];
  if (
    paymentType === "card" ||
    paymentType === "credit_card" ||
    paymentType === "credit-card"
  ) {
    return "Credit/Debit Card";
  }
  return formatOrderPaymentMethodSummary(order) || "—";
}

/** Receipts print the seat number only. `13_DA` counts as 13. */
function receiptSeatNumber(seat: string | number): number | null {
  const value = seatNumberDigits(seat);
  return value != null && value > 0 ? value : null;
}

function formatSeatRange(seatNumbers: Array<string | number>) {
  return formatSeatNumberRanges(
    seatNumbers
      .map(receiptSeatNumber)
      .filter((seat): seat is number => seat != null),
  );
}

function allocateCents(totalCents: number, weights: number[]): number[] {
  const total = Math.round(totalCents);
  const safe = weights.map((weight) => Math.max(0, Math.round(weight)));
  const weightSum = safe.reduce((sum, weight) => sum + weight, 0);
  if (total === 0 || weightSum <= 0) return safe.map(() => 0);
  let allocated = 0;
  return safe.map((weight, index) => {
    if (index === safe.length - 1) return total - allocated;
    const share = Math.floor((total * weight) / weightSum);
    allocated += share;
    return share;
  });
}

/**
 * One receipt line per season seat. Game copies of that seat stay together
 * even when only one copy carries the offer name or the package price.
 * The line is priced from the package subtotal, matching the legacy invoice.
 */
function packageReceiptLines(
  tickets: Array<Record<string, unknown>>,
  title: string,
  subtotal: number,
): OrderReceiptLine[] {
  const groups = new Map<
    string,
    {
      ga: boolean;
      section: string;
      row: string;
      seats: Array<string | number>;
      count: number;
    }
  >();

  for (const ticket of tickets) {
    const ga = Boolean(
      ticket.generalAdmission || ticket.GA || ticket.general_admission,
    );
    const section = ticketSectionValue(ticket);
    const row = ticketRowValue(ticket);
    const key = ga ? `ga:${section}` : `seat:${section}:${row}`;
    const seat = ticketSeatValue(ticket);
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (seat) existing.seats.push(seat);
      continue;
    }
    groups.set(key, {
      ga,
      section,
      row,
      seats: seat ? [seat] : [],
      count: 1,
    });
  }

  const grouped = [...groups.values()];
  const amounts = allocateCents(
    Math.max(0, Math.round(subtotal * 100)),
    grouped.map((group) => group.count),
  );

  return grouped.map((group, index) => {
    const amount = amounts[index] / 100;
    const fallback = group.ga ? "GA" : "N/A";
    const seats = formatSeatRange(group.seats);
    return {
      description: `${title} – Sec ${group.section || fallback} – Row ${group.row || fallback} – Seat ${seats || fallback}`,
      qty: String(group.count),
      unitPrice: formatCurrency(group.count > 0 ? amount / group.count : amount),
      amount: formatCurrency(amount),
    };
  });
}

function groupReceiptTickets(tickets: Array<Record<string, unknown>>) {
  const groups = new Map<
    string,
    {
      section: string;
      row: string;
      ga: boolean;
      seats: Array<string | number>;
      count: number;
      amount: number;
    }
  >();

  tickets.forEach((ticket) => {
    const ga = Boolean(ticket.generalAdmission || ticket.GA || ticket.general_admission);
    const section = ticketSectionValue(ticket) || "GA";
    const row = ticketRowValue(ticket) || (ga ? "GA" : "");
    const offer = String(
      ticket.offerName ||
        (ticket.offer as { name?: string } | undefined)?.name ||
        "",
    );
    const key = ga ? `ga:${section}:${offer}` : `${section}:${row}:${offer}`;
    const existing = groups.get(key);
    const price = ticketUnitAmount(ticket);
    const seat = ticketSeatValue(ticket);
    if (existing) {
      existing.count += 1;
      existing.amount += price;
      if (seat) existing.seats.push(seat);
      return;
    }
    groups.set(key, {
      section,
      row: ga ? ticketRowValue(ticket) || "GA" : row || "GA",
      ga,
      seats: seat ? [seat] : [],
      count: 1,
      amount: price,
    });
  });

  return [...groups.values()];
}

function flexPackReceiptLine(
  order: OrderReceiptSource,
  subtotal: number,
): OrderReceiptLine | null {
  if (!order.flex_pack && !(order.vouchers?.length && !order.event && !order.package)) {
    return null;
  }
  const qty = Math.max(
    flexPackVoucherCount(
      order.flex_pack?.gameTickets ?? order.vouchers?.length,
    ),
    order.vouchers?.length || 0,
    order.flex_pack ? 1 : 0,
  );
  if (!qty) return null;

  const name = order.flex_pack?.name || "Flex pack";
  const voucherWord = qty === 1 ? "Voucher" : "Vouchers";
  const ticketWord = qty === 1 ? "game ticket" : "game tickets";
  const amount = Number(order.flex_pack?.price);
  const fees = resolveCompletedOrderFees(order);
  // A custom fee is part of what each voucher costs. Price the line at the
  // amount paid so the unit price matches checkout, not the pack price alone.
  const lineAmount =
    fees.customFeeLines.length > 0 && fees.total > 0
      ? fees.total
      : Number.isFinite(amount) && amount > 0
        ? amount
        : subtotal;
  const unit = lineAmount / qty;

  return {
    description: `${name} - ${qty} ${voucherWord} (includes ${qty} ${ticketWord})`,
    qty: String(qty),
    unitPrice: formatCurrency(unit),
    amount: formatCurrency(lineAmount),
  };
}

function lineItemTitle(order: OrderReceiptSource) {
  return (
    order.package?.name ||
    order.flex_pack?.name ||
    order.access_pass_template?.name ||
    order.event?.name ||
    "Tickets"
  );
}

function sellerOrganization(order: OrderReceiptSource): ReceiptSellerOrg | null {
  return (
    (order.event?.organization as ReceiptSellerOrg | undefined) ||
    (order.package?.organization as ReceiptSellerOrg | undefined) ||
    (order.flex_pack?.organization as ReceiptSellerOrg | undefined) ||
    (order.access_pass_template?.organization as ReceiptSellerOrg | undefined) ||
    (order.organization as ReceiptSellerOrg | undefined) ||
    null
  );
}

function sellerAddress(org: ReceiptSellerOrg | null) {
  const row = org?.address?.[0];
  if (!row) {
    return { line1: "", line2: "", country: "" };
  }
  return {
    line1: row.address || row.address_1 || "",
    line2: [row.city, row.state, row.zip || row.zipcode].filter(Boolean).join(" "),
    country: row.country || "",
  };
}

export function receiptDownloadFilename(receipt: OrderReceipt) {
  const slug = receipt.invoiceNumber.replace(/[^\w.-]+/g, "-");
  return `receipt-${slug || "order"}.pdf`;
}

export function buildOrderReceipt(
  order?: OrderReceiptSource | null,
  purchaser?: OrderReceiptPurchaser,
  options?: { sellerLogoUrl?: string | null; sellerName?: string | null },
): OrderReceipt | null {
  if (!order) return null;

  const org = sellerOrganization(order);
  const sellerName = options?.sellerName?.trim() || org?.name || "blocktickets";
  const timezone = receiptTimezone(order);
  const issueSource = order.dateOfIssue || order.processedAt || order.paidAt;
  const dueSource = order.dueDate || issueSource;
  const paidSource = order.paidAt || order.datePaid || order.processedAt || issueSource;
  const issueDate = formatReceiptDate(issueSource, timezone);
  const tickets = Array.isArray(order.tickets) ? order.tickets : [];
  const groups = groupReceiptTickets(tickets);

  const {
    processingFee,
    serviceFee,
    tax,
    customFeeLines,
    discount,
    total,
    subtotal,
  } = resolveCompletedOrderFees(order);
  const feeBreakdown = orderPrimaryFeeBreakdown(order);
  const qty = groups.reduce((sum, group) => sum + group.count, 0);
  const unitFromTickets = groups.every((group) => group.count > 0)
    ? groups[0] && groups.every((group) => group.amount / group.count === groups[0].amount / groups[0].count)
      ? groups[0].amount / groups[0].count
      : qty > 0
        ? subtotal / qty
        : 0
    : 0;
  // Event ticket `cost` often includes fees; line items must match the
  // fee-exclusive subtotal shown on checkout success. An itemized order
  // prices the lines at face value and lists each fee on its own row.
  const faceUnit =
    feeBreakdown?.groups.length === 1 ? feeBreakdown.groups[0].unitPrice : null;
  const unitPrice = faceUnit != null
    ? faceUnit
    : qty > 0
      ? order.package
        ? unitFromTickets || subtotal / qty
        : subtotal / qty
      : 0;
  const title = lineItemTitle(order);
  const ticketLines = order.package
    ? packageReceiptLines(tickets, title, subtotal)
    : feeBreakdown && feeBreakdown.groups.length > 1
      ? feeBreakdown.groups.map((group) => ({
          description: `${title} – ${group.label}`,
          qty: String(group.quantity),
          unitPrice: formatCurrency(group.unitPrice),
          amount: formatCurrency(group.subtotal),
        }))
      : groups.map((group) => {
          const seats = group.ga ? "GA" : formatSeatRange(group.seats) || "GA";
          return {
            description: `${title} – Sec ${group.section} – Row ${group.row} – Seat ${seats}`,
            qty: String(group.count),
            unitPrice: formatCurrency(unitPrice),
            amount: formatCurrency(unitPrice * group.count),
          };
        });
  const flexLine = ticketLines.length ? null : flexPackReceiptLine(order, subtotal);
  const lines = ticketLines.length ? ticketLines : flexLine ? [flexLine] : [];

  const billTo = receiptPurchaserFromSources({ order, purchaser });
  const first = billTo.firstName;
  const last = billTo.lastName;
  const billToName =
    first && last
      ? titleCaseName(`${first} ${last}`)
      : first || last
        ? titleCaseName(String(first || last))
        : "N/A";
  const billToEmail = billTo.email || "N/A";

  const invoiceNumber = String(
    order.stripe_invoices?.[0]?.stripeInvoiceId ||
      order.invoiceUUID ||
      order.orderId ||
      order.id ||
      "",
  );

  // A resale order's fees sit on top of the asking price, so the pricing
  // object does not itemize. Reuse the normal ticket rows anyway.
  const receiptBreakdown: PrimaryTicketFeeBreakdown | null =
    feeBreakdown ??
    (completedOrderResaleSummary(order).resale
      ? {
          groups: [
            {
              label: "Tickets",
              unitPrice: subtotal,
              quantity: 1,
              subtotal,
            },
          ],
          serviceFee,
          facilityFee: 0,
          salesTax: tax,
          processingFee,
          chargeBackProtection: 0,
        }
      : null);
  // Packages and single-event tickets list tax last. Flex packs list it
  // directly under the service fee.
  const taxRow: OrderReceiptTotal = { label: "Tax", amount: formatCurrency(tax) };
  const deferTax = !receiptBreakdown && !order.flex_pack;
  const totals: OrderReceiptTotal[] = receiptBreakdown
    ? primaryTicketFeeSummaryRows(receiptBreakdown).map((row) => ({
        label: row.label,
        amount: formatCurrency(row.amount),
      }))
    : [
        { label: "Subtotal", amount: formatCurrency(subtotal) },
        { label: "Processing Fee", amount: formatCurrency(processingFee) },
        { label: "Service Fee", amount: formatCurrency(serviceFee) },
        ...(deferTax ? [] : [taxRow]),
      ];
  if (!feeBreakdown) {
    const customRows = customFeeLines.map((line) => ({
      label: line.name,
      amount: formatCurrency(line.amount),
    }));
    const taxIndex = totals.findIndex((row) => row.label === "Tax");
    // Flex packs list custom fees after the tax row; other orders list them before it.
    if (taxIndex >= 0) {
      totals.splice(order.flex_pack ? taxIndex + 1 : taxIndex, 0, ...customRows);
    } else totals.push(...customRows);
  }
  if (deferTax) totals.push(taxRow);
  if (discount) {
    totals.push({
      label: promoSummaryLabel(completedOrderPromoName(order)),
      amount: `-${formatCurrency(discount)}`,
    });
  }
  totals.push(
    { label: "Total", amount: formatCurrency(total), strong: true },
    {
      label: "Amount paid",
      amount: formatCurrency(total),
      strong: true,
      amountDue: true,
    },
  );

  if (org?.display_tin && subtotal > 0) {
    const includedTax = +(subtotal - subtotal / 1.13).toFixed(2);
    const subtotalRow = totals.find((row) => row.label === "Subtotal");
    if (subtotalRow) {
      subtotalRow.note = `includes ${formatCurrency(includedTax)} HST (13%)`;
    }
  }

  const address = sellerAddress(org);

  return {
    title: "Receipt",
    sellerName,
    sellerLogoUrl:
      options?.sellerLogoUrl ||
      resolveBrandLogo(order.event, org) ||
      undefined,
    sellerInitials: initialsFromName(sellerName),
    sellerAccent: resolvePrimaryColor(order.event, org),
    sellerAddressLine1: address.line1 || undefined,
    sellerAddressLine2: address.line2 || undefined,
    sellerCountry: address.country || undefined,
    sellerPhone: org?.phoneNumber || undefined,
    sellerEmail: org?.email || undefined,
    sellerTaxId: org?.taxId || undefined,
    sellerTiname: org?.tiname || undefined,
    sellerTincode: org?.tincode || undefined,
    inquiryEmail: org?.email || "info@blocktickets.net",
    invoiceNumber,
    paymentMethod: formatReceiptPaymentMethod(order),
    issueDate,
    dueDate: formatReceiptDate(dueSource, timezone),
    paidOnLabel: `Marked as paid on ${formatReceiptDate(paidSource, timezone)}`,
    supportNote: "We appreciate your support",
    billToLabel: "Bill to",
    billToName,
    billToEmail,
    lines,
    emptyLinesMessage: "No ticket line items found for this order.",
    totals,
  };
}

export type OrderStripeInvoice = {
  stripeInvoicePdf?: string | null;
  stripeInvoiceLink?: string | null;
};

export type OrderWithStripeInvoices = {
  stripe_invoices?: OrderStripeInvoice[] | null;
};

export function resolveOrderReceiptPdfUrl(
  order: OrderWithStripeInvoices | null | undefined,
): string | null {
  const invoices = order?.stripe_invoices;
  if (!Array.isArray(invoices) || invoices.length === 0) return null;

  const invoice = invoices[0];
  const pdfUrl = invoice?.stripeInvoicePdf?.trim();
  if (pdfUrl) return pdfUrl;

  const hostedUrl = invoice?.stripeInvoiceLink?.trim();
  return hostedUrl || null;
}

export function openOrderReceiptPdf(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function printOrderReceiptHtml(html: string) {
  if (typeof document === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.setAttribute("aria-hidden", "true");

  const cleanup = () => {
    try {
      iframe.parentNode?.removeChild(iframe);
    } catch {
      /* ignore cleanup errors */
    }
  };

  let didTriggerPrint = false;

  const tryTriggerPrint = () => {
    if (didTriggerPrint) return;
    const doc = iframe.contentDocument;
    if (!doc?.querySelector(".invoice-doc")) return;

    didTriggerPrint = true;
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
      } catch {
        /* ignore focus errors */
      }
      try {
        iframe.contentWindow?.print();
      } catch {
        /* ignore print errors */
      }
      setTimeout(cleanup, 5_000);
    }, 250);
  };

  iframe.addEventListener("load", () => {
    tryTriggerPrint();
    let retries = 0;
    const interval = window.setInterval(() => {
      retries += 1;
      tryTriggerPrint();
      if (didTriggerPrint || retries >= 20) {
        window.clearInterval(interval);
      }
    }, 50);
  });

  let usedSrcDoc = false;
  try {
    iframe.srcdoc = html;
    usedSrcDoc = true;
  } catch {
    /* fall back to document.write */
  }

  document.body.appendChild(iframe);

  if (!usedSrcDoc) {
    try {
      const doc = iframe.contentWindow?.document;
      if (!doc) return;
      doc.open();
      doc.write(html);
      doc.close();
    } catch {
      cleanup();
    }
  }
}

const STRIPE_INTENT_ID = /^pi_[A-Za-z0-9]+$/;

/**
 * The saved order does not always name its payment intent the same way, so
 * look for a Stripe intent id anywhere on it (intentDetails, invoices, ...).
 */
function paymentIntentIdFromOrder(order: unknown, depth = 0): string {
  if (typeof order === "string") {
    return STRIPE_INTENT_ID.test(order.trim()) ? order.trim() : "";
  }
  if (!order || typeof order !== "object" || depth > 4) return "";
  const values = Array.isArray(order)
    ? order
    : Object.values(order as Record<string, unknown>);
  for (const value of values) {
    const found = paymentIntentIdFromOrder(value, depth + 1);
    if (found) return found;
  }
  return "";
}

/**
 * Higher when the order can show the same fee split as checkout.
 * A flex pack that only has a tax lump scores below one that lists the
 * service fee and the processing fee.
 */
function receiptPricingScore(order: OrderReceiptSource): number {
  if (orderPrimaryFeeBreakdown(order)) return 5;
  const fees = resolveCompletedOrderFees(order);
  let score = 0;
  if (fees.serviceFee > 0) score += 2;
  if (fees.processingFee > 0) score += 2;
  if (score === 0 && fees.tax > 0) score = 1;
  return score;
}

function mergeReceiptOrder(
  base: OrderReceiptSource,
  full: OrderReceiptSource,
): OrderReceiptSource {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(full)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    merged[key] = value;
  }
  return merged as OrderReceiptSource;
}

/**
 * Arguments for the checkout-success receipt download.
 * Profile activity passes `hydratePricing` so a short invoice is filled
 * from the same order record before that download runs.
 */
export async function shopperReceiptDownload({
  order,
  user,
  guest,
  sellerLogoUrl,
  sellerName,
  hydratePricing = false,
}: {
  order?: OrderReceiptSource | null;
  user?: OrderReceiptPerson | null;
  guest?: OrderReceiptPerson | null;
  sellerLogoUrl?: string | null;
  sellerName?: string | null;
  hydratePricing?: boolean;
}): Promise<{
  order: OrderReceiptSource;
  purchaser: OrderReceiptPurchaser;
  sellerLogoUrl?: string | null;
  sellerName?: string | null;
}> {
  if (!order) throw new Error("Receipt unavailable");
  let source = order;
  let purchaser = receiptPurchaserFromSources({ user, guest, order });
  const needsName = !purchaser.firstName && !purchaser.lastName;
  const orderId = String(order.orderId || "");
  if (orderId && (hydratePricing || needsName)) {
    try {
      const res = await getOrder(orderId);
      const fetched = normalizeOrderPayload(res.data) as OrderReceiptSource;
      if (hydratePricing) {
        const merged = mergeReceiptOrder(order, fetched);
        if (receiptPricingScore(merged) >= receiptPricingScore(source)) {
          source = merged;
        }
      }
      purchaser = receiptPurchaserFromSources({
        user,
        guest,
        order: hydratePricing ? source : fetched,
      });
    } catch {
      /* keep the order already on the page */
    }
  }
  if (hydratePricing && receiptPricingScore(source) < 4) {
    const intentId =
      paymentIntentIdFromOrder(source) || paymentIntentIdFromOrder(order);
    if (intentId) {
      try {
        const fetched = (await fetchCompletedOrder(intentId)) as OrderReceiptSource;
        const merged = mergeReceiptOrder(source, fetched);
        if (receiptPricingScore(merged) > receiptPricingScore(source)) {
          source = merged;
          purchaser = receiptPurchaserFromSources({ user, guest, order: source });
        }
      } catch {
        /* the list invoice is still enough to download */
      }
    }
  }
  const branding = checkoutBrandingFromCart(
    source as CheckoutCartBrandingSource,
  );
  return {
    order: source,
    purchaser,
    sellerLogoUrl:
      sellerLogoUrl !== undefined ? sellerLogoUrl : branding.theme.brandLogoSrc,
    sellerName: sellerName !== undefined ? sellerName : branding.orgLabel,
  };
}

/** Builds a PDF from the invoice HTML and downloads it. */
export async function downloadOrderReceipt({
  order,
  purchaser,
  sellerLogoUrl,
  sellerName,
  toPdf = htmlToReceiptPdf,
  saveFile = saveReceiptPdf,
}: {
  order?: OrderReceiptSource | null;
  purchaser?: OrderReceiptPurchaser;
  sellerLogoUrl?: string | null;
  sellerName?: string | null;
  toPdf?: (html: string) => Promise<Uint8Array>;
  saveFile?: (bytes: Uint8Array, filename: string) => void;
}) {
  const receipt = buildOrderReceipt(order, purchaser, {
    sellerLogoUrl,
    sellerName,
  });
  if (!receipt) throw new Error("Receipt unavailable");
  const html = renderOrderReceiptHtml(receipt);
  if (!html.trim() || !receiptHasInvoiceDoc(html)) {
    throw new Error("Receipt unavailable");
  }
  const bytes = await toPdf(html);
  if (!bytes?.length) throw new Error("Receipt PDF unavailable");
  saveFile(bytes, receiptDownloadFilename(receipt));
}
