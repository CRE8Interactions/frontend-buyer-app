/** Seat, tier, and price summary shared by checkout and the order confirmation. */

import { packageFromPrice } from "@/lib/eventFromPrice";
import { flexPackVoucherFee } from "@/lib/flexPackDisplay";
import {
  descriptionPlainText,
  formatEventWhen,
  type TimezoneLike,
} from "@/lib/helpers";
import {
  formatSeatNumberRanges,
  gaTicketSeatLine,
  ticketRowValue,
  ticketSeatValue,
  ticketSectionValue,
} from "@/lib/wallet";

export type TicketOfferPriceLine = {
  /** Offer label shown on the checkout price row (e.g. "Early Bird"). */
  offerName: string;
  count: number;
  unit: number;
  subtotal: number;
};

export type TicketSelectionSummary = {
  count: number;
  offerName: string;
  unit: number;
  subtotal: number;
  seatLine: string;
  subtitle: string;
  qtyLabel: string;
  /** One row per distinct offer + unit price in the cart. */
  offerLines: TicketOfferPriceLine[];
};

type OfferNameSource = {
  name?: string;
  description?: string;
  offerName?: string;
  offer?:
    | string
    | {
        name?: string;
        description?: string;
        data?: {
          name?: string;
          description?: string;
          attributes?: { name?: string; description?: string };
        };
      }
    | null;
};

function stripRichText(value?: string | null): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function offerNameFromSource(source?: OfferNameSource | null): string {
  if (!source) return "";
  const offer = source.offer;
  if (typeof offer === "string" && offer.trim()) return offer.trim();
  if (offer && typeof offer === "object") {
    const nested =
      offer.name || offer.data?.attributes?.name || offer.data?.name || "";
    if (String(nested).trim()) return String(nested).trim();
  }
  return String(source.offerName || "").trim();
}

/** Badge / tooltip label: offer name only — never the season package name. */
export function selectionOfferName(
  group?: OfferNameSource | null,
  fallback = "Standard admission",
): string {
  return offerNameFromSource(group) || fallback;
}

function offerDescriptionFromSource(source?: OfferNameSource | null): string {
  if (!source) return "";
  if (String(source.description || "").trim()) {
    return descriptionPlainText(source.description);
  }
  const offer = source.offer;
  if (offer && typeof offer === "object") {
    const nested =
      offer.description ||
      offer.data?.attributes?.description ||
      offer.data?.description ||
      "";
    if (String(nested).trim()) return descriptionPlainText(String(nested));
  }
  return "";
}

/** Listing / map detail copy from the ticket group's offer description. */
export function selectionOfferDescription(
  group?: OfferNameSource | null,
): string {
  return offerDescriptionFromSource(group);
}

type GaTierSubtitleSource = {
  sectionName?: string | null;
  sectionNumber?: string | null;
  offer?: { description?: string | null } | null;
};

function isGenericGaLabel(value: string) {
  return value.trim().toUpperCase() === "GA";
}

function ticketGroupLookupKeys(source?: Record<string, unknown> | null) {
  return [
    source?.ticketGroupUUID,
    source?.ticketGroup,
    source?.ticketGroupId,
    source?.uuid,
    source?.id,
    source?.sectionId,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

/** True when a GA cart ticket has no real section name — only a generic "ga". */
export function gaTicketsNeedGroupSection(
  tickets: Array<Record<string, unknown>>,
) {
  if (!tickets.length) return false;
  const allGa = tickets.every((ticket) =>
    Boolean(ticket.generalAdmission || ticket.GA),
  );
  if (!allGa) return false;
  return tickets.some((ticket) => {
    const name = String(ticket.sectionName ?? "").trim();
    return !name || isGenericGaLabel(name);
  });
}

/** Copy ticket-group section names (e.g. "GA Floor") onto held GA tickets. */
export function withGaTicketGroupSections(
  tickets: Array<Record<string, unknown>>,
  groups: Array<Record<string, unknown>>,
) {
  if (!tickets.length || !groups.length) return tickets;
  const byKey = new Map<string, Record<string, unknown>>();
  for (const group of groups) {
    for (const key of ticketGroupLookupKeys(group)) {
      byKey.set(key, group);
    }
  }
  return tickets.map((ticket) => {
    const group =
      ticketGroupLookupKeys(ticket)
        .map((key) => byKey.get(key))
        .find(Boolean) ||
      groups.find(
        (row) =>
          ticket.sectionId != null &&
          String(row.sectionId ?? "") === String(ticket.sectionId),
      );
    const sectionName = String(group?.sectionName ?? "").trim();
    if (!sectionName) return ticket;
    return { ...ticket, sectionName };
  });
}

/** GA quick-pick card subtitle: section name, else offer description, else General Admission. */
export function gaTierSubtitle(source?: GaTierSubtitleSource | null): string {
  const sectionName = String(source?.sectionName ?? "").trim();
  const sectionNumber = String(source?.sectionNumber ?? "").trim();
  const offerDesc = stripRichText(source?.offer?.description);

  let label = "";
  if (sectionName && !isGenericGaLabel(sectionName)) {
    label = sectionName;
  } else if (sectionNumber && !isGenericGaLabel(sectionNumber)) {
    label = sectionNumber;
  } else if (
    (sectionName && isGenericGaLabel(sectionName)) ||
    (sectionNumber && isGenericGaLabel(sectionNumber))
  ) {
    label = "Ga";
  }
  if (!label) label = offerDesc;
  if (!label) label = "General Admission";

  return `${label} · unreserved seating`;
}

type SelectionCardGroup = {
  GA?: boolean;
  generalAdmission?: boolean;
  package?: unknown;
  quantity?: number;
};

/**
 * Your selection shows one card per ticket. GA and package qty groups are
 * expanded; reserved seats stay one card each.
 */
export function selectionTicketCards<T extends SelectionCardGroup>(
  selected: T[],
) {
  return selected.flatMap((group, groupIndex) => {
    const qty = Math.max(1, Number(group.quantity || 1));
    const perTicket = Boolean(
      group.GA || group.generalAdmission || group.package,
    );
    const copies = perTicket ? qty : 1;
    return Array.from({ length: copies }, (_, unitIndex) => ({
      group,
      groupIndex,
      unitIndex,
    }));
  });
}

type TicketSelectionSummaryOptions = {
  defaultOffer?: string;
  /** Season-package game count; when set, the subtitle is seats • all n games. */
  gameCount?: number;
};

/** Group cart tickets by offer name and unit price for the checkout breakdown. */
export function ticketOfferPriceLines(
  tickets: Array<Record<string, unknown>>,
  options?: TicketSelectionSummaryOptions,
): TicketOfferPriceLine[] {
  const lines: TicketOfferPriceLine[] = [];
  const indexByKey = new Map<string, number>();

  for (const ticket of tickets) {
    const offerName = options?.defaultOffer
      ? selectionOfferName(ticket, options.defaultOffer)
      : offerNameFromSource(ticket) || "Tickets";
    const unit = Number(ticket.cost || ticket.price || 0);
    const key = `${offerName}\0${unit}`;
    const existing = indexByKey.get(key);
    if (existing == null) {
      indexByKey.set(key, lines.length);
      lines.push({ offerName, count: 1, unit, subtotal: unit });
      continue;
    }
    const line = lines[existing]!;
    line.count += 1;
    line.subtotal += unit;
  }

  return lines;
}

export function ticketSelectionSummary(
  tickets: Array<Record<string, unknown>>,
  options?: TicketSelectionSummaryOptions,
): TicketSelectionSummary {
  const count = tickets.length;
  const first = tickets[0] || {};
  const section = ticketSectionValue(first);
  const row = ticketRowValue(first);
  const ga = Boolean(first.generalAdmission || first.GA);
  const sameBlock = tickets.every(
    (ticket) =>
      ticketSectionValue(ticket) === section &&
      ticketRowValue(ticket) === row,
  );
  const offerLines = ticketOfferPriceLines(tickets, options);
  const distinctOffers = new Set(offerLines.map((line) => line.offerName));
  // Only show the pill when every ticket shares one offer; mixed carts list
  // each offer on its own price row instead.
  const offerName =
    distinctOffers.size === 1
      ? options?.defaultOffer
        ? selectionOfferName(first, options.defaultOffer)
        : offerNameFromSource(first)
      : "";
  const unit = Number(first.cost || first.price || 0);
  const subtotal = tickets.reduce(
    (sum, ticket) => sum + Number(ticket.cost || ticket.price || 0),
    0,
  );
  const seatNumbers = tickets.map((ticket) => ticketSeatValue(ticket));
  const together = sameBlock && seatsAreTogether(seatNumbers);
  const seatList = formatSeatNumberRanges(seatNumbers);
  const seatLine = ga
    ? gaTicketSeatLine(first)
    : count === 1
      ? `Sec ${section} · Row ${row} · Seat ${first.seatNumber}`
      : sameBlock
        ? `Sec ${section} · Row ${row}`
        : tickets
            .map(
              (ticket) =>
                `Sec ${ticket.sectionName || ticket.sectionNumber} · Row ${ticket.rowNumber} · Seat ${ticket.seatNumber}`,
            )
            .join(", ");
  const allGa =
    tickets.length > 0 &&
    tickets.every((ticket) => Boolean(ticket.generalAdmission || ticket.GA));
  const gameCount = options?.gameCount;
  const gamesLabel =
    gameCount == null || gameCount < 1
      ? ""
      : gameCount === 1
        ? "1 game"
        : `all ${gameCount} games`;
  const packageSeatLabel =
    allGa || !seatList ? "" : `Seats ${seatList}`;
  const subtitle = gamesLabel
    ? [allGa ? gaTierSubtitle(first) : packageSeatLabel, gamesLabel]
        .filter(Boolean)
        .join(" · ")
    : allGa
      ? gaTierSubtitle(first)
      : count === 1
        ? "1 ticket"
        : together
          ? `${count} tickets · seats are together`
          : sameBlock && seatList
            ? `${count} tickets · ${seatList}`
            : `${count} tickets`;
  const qtyLabel = `${count} ${count === 1 ? "ticket" : "tickets"}`;
  return {
    count,
    offerName,
    unit,
    subtotal,
    seatLine,
    subtitle,
    qtyLabel,
    offerLines,
  };
}

export type PackageSeatLine = {
  seatLine: string;
  context: string;
  price: number;
};

export type PackageOrderSummary = {
  seasonLine: string;
  venueName: string;
  gameCount: number;
  seats: PackageSeatLine[];
  subtotal: number;
};

export function packageSeasonLine(
  pkg?: {
    start?: string;
    events?: Array<{ start?: string }>;
    timezone?: TimezoneLike;
    venue?: { timezone?: string };
  } | null,
  timezone?: TimezoneLike,
): string {
  const events = pkg?.events || [];
  const tz = timezone || pkg?.timezone || pkg?.venue?.timezone;
  const year = formatEventWhen(pkg?.start || events[0]?.start, tz, "YYYY");
  const n = events.length;
  const games = n === 1 ? "1 home game" : `${n} home games`;
  if (!n && !year) return "";
  if (!n) return year ? `${year} Season` : "";
  return year ? `${year} Season · ${games}` : games;
}

function positiveAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

/** Season-package carts often send cost/price as 0 on each game ticket. */
export function ticketUnitAmount(ticket?: Record<string, unknown> | null): number {
  if (!ticket) return 0;
  const nested =
    (ticket.package_ticket as Record<string, unknown> | undefined)?.price ??
    (ticket.listing as Record<string, unknown> | undefined)?.price ??
    (ticket.ticket as Record<string, unknown> | undefined)?.price;
  return (
    positiveAmount(ticket.cost) ||
    positiveAmount(ticket.price) ||
    positiveAmount(ticket.amount) ||
    positiveAmount(ticket.faceValue) ||
    positiveAmount(ticket.listingPrice) ||
    positiveAmount(ticket.packagePrice) ||
    positiveAmount(nested)
  );
}

export function packageCartTickets(cart?: {
  tickets?: Array<Record<string, unknown>> | null;
  package_tickets?: Array<Record<string, unknown>> | null;
} | null): Array<Record<string, unknown>> {
  return [
    ...(Array.isArray(cart?.tickets) ? cart.tickets : []),
    ...(Array.isArray(cart?.package_tickets) ? cart.package_tickets : []),
  ];
}

export type PackageCustomFeeLine = {
  name: string;
  amount: number;
};

function moneyEquals(a: number, b: number) {
  return Math.abs(a - b) < 0.02;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Package custom fees stored on the cart when the hold was priced.
 * Legacy checkout reads the same snapshot: one named line per fee, or the
 * single customFeeAmount fallback.
 */
export function packageCustomFeeLines(
  snapshot: unknown,
): PackageCustomFeeLine[] {
  let source = snapshot;
  if (typeof source === "string") {
    try {
      source = JSON.parse(source) as unknown;
    } catch {
      return [];
    }
  }
  if (!source || typeof source !== "object") return [];
  const record = source as Record<string, unknown>;
  const raw = record.customFeeLines;
  if (Array.isArray(raw)) {
    const lines = raw.flatMap((line) => {
      if (!line || typeof line !== "object") return [];
      const row = line as Record<string, unknown>;
      const amount = Number(row.amount);
      if (!Number.isFinite(amount) || amount <= 0) return [];
      const name = String(row.name || "Custom fee").trim() || "Custom fee";
      return [{ name, amount: roundMoney(amount) }];
    });
    if (lines.length) return lines;
  }
  const amount = Number(record.customFeeAmount);
  if (!Number.isFinite(amount) || amount <= 0) return [];
  const name = String(record.customFeeName || "Custom fee").trim() || "Custom fee";
  return [{ name, amount: roundMoney(amount) }];
}

function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function positiveTax(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function pricingObjectRecords(pricingObjects: unknown): Array<Record<string, unknown>> {
  const list = Array.isArray(pricingObjects)
    ? pricingObjects
    : pricingObjects
      ? [pricingObjects]
      : [];
  return list.filter(
    (entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === "object",
  );
}

function matchPricingObjectForTicket(
  ticket: Record<string, unknown>,
  pricingObjects: Array<Record<string, unknown>>,
): Record<string, unknown> | null {
  if (!pricingObjects.length) return null;
  if (pricingObjects.length === 1) return pricingObjects[0];

  const nested = ticket.am_pricing_object;
  const nestedRecord =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : null;
  const pricingLevelId = Number(
    nestedRecord?.id ?? ticket.pricingLevelId ?? ticket.pricing_level_id,
  );
  if (Number.isFinite(pricingLevelId) && pricingLevelId > 0) {
    const byId = pricingObjects.find((entry) => Number(entry.id) === pricingLevelId);
    if (byId) return byId;
  }

  const plName = ticket.PLName || ticket.pricingLevelName || nestedRecord?.name;
  if (typeof plName === "string" && plName) {
    const byName = pricingObjects.find((entry) => entry.name === plName);
    if (byName) return byName;
  }

  const ticketCost = Number(ticket.cost);
  if (Number.isFinite(ticketCost)) {
    const byTotalDue = pricingObjects.find(
      (entry) => Number(entry.totalDue) === ticketCost,
    );
    if (byTotalDue) return byTotalDue;

    const byOfferPrice = pricingObjects.find(
      (entry) => Number(entry.offerPrice) === ticketCost,
    );
    if (byOfferPrice) return byOfferPrice;
  }

  return pricingObjects[0];
}

export type IncludedTicketPriceBreakdown = {
  tax: number;
  processingFee: number;
  serviceFee: number;
};

/**
 * Tax and fees already baked into each ticket's all-in price.
 * Website event carts leave cart.totalTax at 0 and store the amounts on the
 * pricing object, so checkout has to read them from there.
 */
export function includedTicketPriceBreakdown(
  tickets: unknown,
  pricingObjects: unknown,
): IncludedTicketPriceBreakdown {
  const rows = Array.isArray(tickets) ? tickets : [];
  const objects = pricingObjectRecords(pricingObjects);
  const totals = { tax: 0, processingFee: 0, serviceFee: 0 };
  if (!rows.length || !objects.length) return totals;

  for (const ticket of rows) {
    if (!ticket || typeof ticket !== "object") continue;
    const pricingObject = matchPricingObjectForTicket(
      ticket as Record<string, unknown>,
      objects,
    );
    if (!pricingObject) continue;
    totals.tax +=
      finiteMoney(pricingObject.taxPerTicket) ??
      finiteMoney(pricingObject.salesTax) ??
      0;
    totals.processingFee +=
      finiteMoney(pricingObject.estimatedPaymentProcessingFee) ??
      finiteMoney(pricingObject.paymentProcessingFee) ??
      0;
    totals.serviceFee += finiteMoney(pricingObject.serviceFee) ?? 0;
  }

  return {
    tax: roundToCents(totals.tax),
    processingFee: roundToCents(totals.processingFee),
    serviceFee: roundToCents(totals.serviceFee),
  };
}

/** Sales tax already included in the ticket prices. */
export function sumIncludedSalesTax(
  tickets: unknown,
  pricingObjects: unknown,
): number {
  return includedTicketPriceBreakdown(tickets, pricingObjects).tax;
}

/**
 * Single-event checkout: when nothing is charged on top of the ticket price,
 * list what that price already covers. Null when the cart adds tax on top or
 * the pricing objects carry no amounts, so the plain Tax row is used instead.
 */
export function checkoutIncludedPriceBreakdown(cart?: {
  totalTax?: number;
  tickets?: unknown;
  am_pricing_objects?: unknown;
} | null): IncludedTicketPriceBreakdown | null {
  if (positiveTax(cart?.totalTax)) return null;
  const breakdown = includedTicketPriceBreakdown(
    cart?.tickets,
    cart?.am_pricing_objects,
  );
  const hasAmount =
    breakdown.tax > 0 || breakdown.processingFee > 0 || breakdown.serviceFee > 0;
  return hasAmount ? breakdown : null;
}

export type CheckoutTaxLine = {
  label: "Tax" | "Tax (included)";
  amount: number;
};

/**
 * Checkout tax row, matching the legacy TicketInformation breakdown: only
 * cart.totalTax is charged on top; cart.salesTax is ignored for display.
 * Included tax is displayed only and is not added to the total.
 */
export function checkoutTaxLine(cart?: {
  totalTax?: number;
  tickets?: unknown;
  am_pricing_objects?: unknown;
} | null): CheckoutTaxLine {
  const additive = positiveTax(cart?.totalTax);
  if (additive > 0) return { label: "Tax", amount: additive };
  const included = sumIncludedSalesTax(cart?.tickets, cart?.am_pricing_objects);
  if (included > 0) return { label: "Tax (included)", amount: included };
  return { label: "Tax", amount: 0 };
}

export function resolvePackageCheckoutTotals(
  cart: {
    total?: number;
    serviceFee?: number;
    processingFee?: number;
    estimatedProcessingFee?: number;
    totalTax?: number;
    salesTax?: number;
    packageWebsiteFeeSnapshot?: unknown;
  } | null | undefined,
  seatSubtotal: number,
): {
  subtotal: number;
  total: number;
  serviceFee: number;
  processingFee: number;
  customFeeLines: PackageCustomFeeLine[];
} {
  const serviceFee = Number(cart?.serviceFee || 0);
  const processingFee = Number(
    cart?.estimatedProcessingFee ?? cart?.processingFee ?? 0,
  );
  // Legacy adds only cart.totalTax on top. Included tax and cart.salesTax
  // are not part of the charged total.
  const tax = Number(cart?.totalTax) || 0;
  const fees = serviceFee + processingFee + tax;
  const customFeeLines = packageCustomFeeLines(cart?.packageWebsiteFeeSnapshot);
  const customFee = roundMoney(
    customFeeLines.reduce((sum, line) => sum + line.amount, 0),
  );
  const cartTotal = Number(cart?.total || 0);
  let subtotal =
    seatSubtotal > 0 ? seatSubtotal : Math.max(0, cartTotal - fees);
  // A missing ticket price is inferred from the cart total, which already
  // includes the custom fee. Pull that fee back out so the summary can list it.
  if (
    customFee > 0 &&
    cartTotal > 0 &&
    moneyEquals(subtotal + fees, cartTotal) &&
    subtotal >= customFee
  ) {
    subtotal = roundMoney(subtotal - customFee);
  }
  const total =
    cartTotal > 0 && cartTotal >= subtotal
      ? cartTotal
      : roundMoney(subtotal + fees + customFee);
  return { subtotal, total, serviceFee, processingFee, customFeeLines };
}

/**
 * Flex pack: $1 per voucher (cart serviceFee, or inferred) plus processing fee
 * and cart.totalTax, matching the legacy charge of
 * cart.total + cart.totalTax + cart.processingFee.
 */
export function resolveFlexPackCheckoutTotals(
  cart: {
    total?: number;
    serviceFee?: number;
    processingFee?: number;
    estimatedProcessingFee?: number;
    totalTax?: number;
    salesTax?: number;
    flex_pack?: { price?: number; gameTickets?: number } | null;
  } | null | undefined,
) {
  const voucherFee = flexPackVoucherFee(cart?.flex_pack?.gameTickets);
  const cartService = Number(cart?.serviceFee || 0);
  const serviceFee = cartService > 0 ? cartService : voucherFee;
  const packPrice = Number(cart?.flex_pack?.price || 0);
  const tax = Number(cart?.totalTax) || 0;
  const totals = resolvePackageCheckoutTotals({ ...cart, serviceFee }, packPrice);
  const total = roundToCents(
    totals.subtotal + serviceFee + totals.processingFee + tax,
  );
  return {
    ...totals,
    serviceFee,
    total,
  };
}

export type CompletedOrderFeeSource = {
  total?: number;
  serviceFee?: number;
  processingFee?: number;
  estimatedProcessingFee?: number;
  salesTax?: number;
  totalTax?: number;
  totalFeeAmount?: number;
  discountApplied?: number;
  custom_fees?:
    | Array<{ name?: string; attributes?: { name?: string } } | null>
    | { name?: string; attributes?: { name?: string } }
    | null;
  tickets?: unknown;
  am_pricing_objects?: unknown;
  flex_pack?: { price?: number } | null;
  priceObject?:
    | Record<string, unknown>
    | Array<Record<string, unknown> | null | undefined>
    | null;
};

function finiteMoney(value: unknown): number | undefined {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

type PromoCodeLike = { code?: string } | null | undefined;

export type CompletedOrderPromoSource = {
  discountBreakdown?: PromoCodeLike;
  promoPricingDetails?: PromoCodeLike;
  promoCode?: Array<PromoCodeLike> | { code?: string } | null;
  promo_code?: PromoCodeLike;
};

/**
 * The redeemed code lives on the discount breakdown json Blocktickets copies
 * from the cart, or on the order's promo-code relation.
 */
export function completedOrderPromoCode(
  order?: CompletedOrderPromoSource | null,
): string {
  const relation = Array.isArray(order?.promoCode)
    ? order.promoCode.find(Boolean)
    : order?.promoCode;
  return String(
    order?.discountBreakdown?.code ||
      order?.promoPricingDetails?.code ||
      relation?.code ||
      order?.promo_code?.code ||
      "",
  ).trim();
}

/** "Promo (CODE)" when the order carries the redeemed code, else "Promo". */
export function promoSummaryLabel(code?: string): string {
  return code ? `Promo (${code})` : "Promo";
}

function packageSnapshotTax(
  priceObjects: Array<Record<string, unknown> | null | undefined>,
): number {
  for (const entry of priceObjects) {
    if (!entry || typeof entry !== "object") continue;
    const snapshot = entry.packageWebsiteFeeSnapshot;
    if (!snapshot || typeof snapshot !== "object") continue;
    const tax = positiveTax((snapshot as Record<string, unknown>).tax);
    if (tax > 0) return tax;
  }
  return 0;
}

/**
 * Tax charged on a completed order, kept off the subtotal.
 * Single events usually copy it to salesTax. Flex packs and some packages
 * leave salesTax at 0 and keep the amount in totalTax, the package fee
 * snapshot, the ticket price level, or the gap above the flex pack price.
 */
function completedOrderTax(
  order: CompletedOrderFeeSource | null | undefined,
  priceObjects: Array<Record<string, unknown> | null | undefined>,
  fees: {
    processingFee: number;
    serviceFee: number;
    additionalFee: number;
    discount: number;
    total: number;
  },
): number {
  const recorded = positiveTax(order?.salesTax) || positiveTax(order?.totalTax);
  if (recorded > 0) return recorded;

  const snapshotTax = packageSnapshotTax(priceObjects);
  if (snapshotTax > 0) return snapshotTax;

  const included = sumIncludedSalesTax(
    order?.tickets,
    order?.am_pricing_objects ?? order?.priceObject,
  );
  if (included > 0) return included;

  const flexPrice = positiveTax(order?.flex_pack?.price);
  if (flexPrice > 0) {
    const gap = roundToCents(
      fees.total -
        flexPrice -
        fees.processingFee -
        fees.serviceFee -
        fees.additionalFee +
        fees.discount,
    );
    if (gap > 0) return gap;
  }

  return 0;
}

/**
 * Match Blocktickets' completed-order breakdown. The customer-facing
 * processing estimate stored on the price object wins over order fallbacks,
 * and subtotal is reconciled from the amount actually paid with tax removed.
 */
export function resolveCompletedOrderFees(
  order: CompletedOrderFeeSource | null | undefined,
) {
  const priceObjects = Array.isArray(order?.priceObject)
    ? order.priceObject
    : order?.priceObject
      ? [order.priceObject]
      : [];
  let priceObjectProcessingFee: number | undefined;
  for (const entry of priceObjects) {
    if (!entry || typeof entry !== "object") continue;
    priceObjectProcessingFee =
      finiteMoney(entry.estimatedPaymentProcessingFee) ??
      finiteMoney(entry.paymentProcessingFee);
    if (priceObjectProcessingFee !== undefined) break;
  }

  const processingFee =
    priceObjectProcessingFee ??
    finiteMoney(order?.estimatedProcessingFee) ??
    finiteMoney(order?.processingFee) ??
    0;
  const serviceFee = finiteMoney(order?.serviceFee) ?? 0;
  const customFeeLines = completedOrderCustomFeeLines(order, priceObjects);
  const additionalFee =
    finiteMoney(order?.totalFeeAmount) ??
    roundMoney(customFeeLines.reduce((sum, line) => sum + line.amount, 0));
  const discount = finiteMoney(order?.discountApplied) ?? 0;
  const total = finiteMoney(order?.total) ?? 0;
  const tax = completedOrderTax(order, priceObjects, {
    processingFee,
    serviceFee,
    additionalFee,
    discount,
    total,
  });
  // `total` is what the customer paid, already net of any promo, so the
  // discount is added back to recover the pre-discount subtotal. Summaries
  // then foot: subtotal + tax + fees - promo = total.
  const subtotal = roundToCents(
    total - processingFee - serviceFee - tax - additionalFee + discount,
  );

  return {
    subtotal,
    tax,
    processingFee,
    serviceFee,
    additionalFee,
    customFeeLines,
    discount,
    total,
  };
}

function customFeeRecordName(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const row = value as { name?: string; attributes?: { name?: string } };
  return String(row.attributes?.name || row.name || "").trim();
}

/**
 * Named package fees on a completed order. Legacy success reads
 * `priceObject.packageCustomFees`, then the order's custom-fee relation.
 */
function completedOrderCustomFeeLines(
  order: CompletedOrderFeeSource | null | undefined,
  priceObjects: Array<Record<string, unknown> | null | undefined>,
): PackageCustomFeeLine[] {
  const lines = priceObjects.flatMap((entry) => {
    if (!entry) return [];
    const raw = entry.packageCustomFees;
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((line) => {
      if (!line || typeof line !== "object") return [];
      const row = line as { name?: string; amount?: number };
      const amount = Number(row.amount);
      if (!Number.isFinite(amount) || amount <= 0) return [];
      const name = String(row.name || "Custom fee").trim() || "Custom fee";
      return [{ name, amount: roundMoney(amount) }];
    });
  });
  if (lines.length) return lines;

  const amount = finiteMoney(order?.totalFeeAmount) ?? 0;
  if (amount <= 0) return [];
  const related = Array.isArray(order?.custom_fees)
    ? order.custom_fees
    : order?.custom_fees
      ? [order.custom_fees]
      : [];
  const name = related.map(customFeeRecordName).find(Boolean) || "Custom fee";
  return [{ name, amount: roundMoney(amount) }];
}

/**
 * Seat lines should add up to the checkout subtotal. When the custom fee was
 * folded into an inferred seat price, scale those lines back down to the
 * ticket subtotal so the fee can be shown on its own row.
 */
export function alignPackageSeatPrices(
  seats: PackageSeatLine[],
  subtotal: number,
): PackageSeatLine[] {
  if (!seats.length || !(subtotal > 0)) return seats;
  const priced = seats.reduce((sum, seat) => sum + Number(seat.price || 0), 0);
  if (moneyEquals(priced, subtotal)) return seats;
  if (!(priced > 0)) return withPackageCheckoutSeatPrices(seats, subtotal);

  const target = Math.round(subtotal * 100);
  const current = Math.round(priced * 100);
  let remaining = target;
  return seats.map((seat, index) => {
    if (index === seats.length - 1) return { ...seat, price: remaining / 100 };
    const share = Math.round((Math.round(Number(seat.price) * 100) / current) * target);
    remaining -= share;
    return { ...seat, price: share / 100 };
  });
}

/** When season tickets have no unit price, show the inferred checkout subtotal on the seat lines. */
export function withPackageCheckoutSeatPrices(
  seats: PackageSeatLine[],
  subtotal: number,
): PackageSeatLine[] {
  const priced = seats.reduce((sum, seat) => sum + Number(seat.price || 0), 0);
  if (!seats.length || priced > 0 || !(subtotal > 0)) return seats;
  if (seats.length === 1) return [{ ...seats[0], price: subtotal }];

  const cents = Math.round(subtotal * 100);
  const share = Math.floor(cents / seats.length);
  let remaining = cents;
  return seats.map((seat, index) => {
    const amount = index === seats.length - 1 ? remaining : share;
    remaining -= amount;
    return { ...seat, price: amount / 100 };
  });
}

/** Unknown seat numbers can never be described as together. */
function seatsAreTogether(seats: Array<string | number>): boolean {
  const cleaned = seats.map((seat) => String(seat ?? "").trim());
  if (cleaned.some((seat) => !seat)) return false;
  const unique = [...new Set(cleaned)];
  if (unique.length !== cleaned.length) return false;
  if (unique.length === 1) return true;
  const nums = unique.map(Number).filter(Number.isFinite);
  if (nums.length !== unique.length) return false;
  const sorted = [...nums].sort((a, b) => a - b);
  return sorted[sorted.length - 1] - sorted[0] === sorted.length - 1;
}

function formatSeatNumbers(seats: Array<string | number>): string {
  const unique = [...new Set(seats.map((seat) => String(seat)))];
  if (unique.length === 1) return `Seat ${unique[0]}`;
  return `Seats ${formatSeatNumberRanges(seats)}`;
}

export function packageSeatLines(
  tickets: Array<Record<string, unknown>>,
  gameCount: number,
  unitPrice = 0,
): PackageSeatLine[] {
  const gamesLabel = gameCount === 1 ? "1 game" : `all ${gameCount} games`;
  const groups: Array<{
    section: string;
    row: string;
    ga: boolean;
    context: string;
    seatNumbers: Array<string | number>;
    amount: number;
  }> = [];
  const groupIndex = new Map<string, number>();
  const seenSeat = new Set<string>();

  tickets.forEach((ticket, index) => {
    const section = ticketSectionValue(ticket) || "GA";
    const row = ticketRowValue(ticket) || "—";
    const seatNumber =
      (ticket.seatNumber as string | number | null | undefined) ?? "—";
    const ga = Boolean(ticket.GA || ticket.generalAdmission);
    const seatKey = ga
      ? `ga:${section}:${ticket.id ?? ticket.seatId ?? index}`
      : `${section}:${row}:${seatNumber}`;
    if (seenSeat.has(seatKey)) {
      const existingKey = ga ? seatKey : `${section}:${row}:${selectionOfferName(ticket)} · ${gamesLabel}`;
      const existing = groupIndex.get(existingKey);
      if (existing != null) {
        groups[existing].amount = Math.max(
          groups[existing].amount,
          ticketUnitAmount(ticket),
        );
      }
      return;
    }
    seenSeat.add(seatKey);

    const context = `${selectionOfferName(ticket)} · ${gamesLabel}`;
    const groupKey = ga ? seatKey : `${section}:${row}:${context}`;
    const existing = groupIndex.get(groupKey);
    const amount = ticketUnitAmount(ticket);
    if (existing != null) {
      groups[existing].seatNumbers.push(seatNumber);
      groups[existing].amount += amount;
      return;
    }
    groupIndex.set(groupKey, groups.length);
    groups.push({
      section,
      row,
      ga,
      context,
      seatNumbers: [seatNumber],
      amount,
    });
  });

  return groups.map((group) => {
    const uniqueSeats = new Set(group.seatNumbers.map((seat) => String(seat))).size || 1;
    return {
      seatLine: group.ga
        ? gaTicketSeatLine({ sectionNumber: group.section, rowNumber: group.row, generalAdmission: true })
        : `Sec ${group.section} · Row ${group.row} · ${formatSeatNumbers(group.seatNumbers)}`,
      context: group.context,
      price: group.amount > 0 ? group.amount : unitPrice * uniqueSeats,
    };
  });
}

export function packageOrderSummary(
  pkg?: {
    price?: number;
    pricingTiers?: Array<{ price?: number } | null> | Record<string, { price?: number } | undefined> | null;
    start?: string;
    events?: Array<{
      start?: string;
      venue?: { name?: string; timezone?: string };
    }>;
    timezone?: TimezoneLike;
    venue?: { name?: string; timezone?: string };
  } | null,
  tickets: Array<Record<string, unknown>> = [],
): PackageOrderSummary {
  const gameCount = pkg?.events?.length || 0;
  const seats = packageSeatLines(tickets, gameCount, packageFromPrice(pkg) ?? 0);
  return {
    seasonLine: packageSeasonLine(pkg),
    venueName: String(pkg?.venue?.name || pkg?.events?.[0]?.venue?.name || ""),
    gameCount,
    seats,
    subtotal: seats.reduce((sum, seat) => sum + seat.price, 0),
  };
}
