/** Seat, tier, and price summary shared by checkout and the order confirmation. */

import { packageFromPrice } from "@/lib/eventFromPrice";
import { flexPackVoucherFee } from "@/lib/flexPackDisplay";
import { formatEventWhen, type TimezoneLike } from "@/lib/helpers";

export type TicketSelectionSummary = {
  count: number;
  offerName: string;
  unit: number;
  subtotal: number;
  seatLine: string;
  subtitle: string;
  qtyLabel: string;
};

type OfferNameSource = {
  name?: string;
  offerName?: string;
  offer?:
    | string
    | {
        name?: string;
        data?: {
          name?: string;
          attributes?: { name?: string };
        };
      }
    | null;
};

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

export function ticketSelectionSummary(
  tickets: Array<Record<string, unknown>>,
  options?: { defaultOffer?: string },
): TicketSelectionSummary {
  const count = tickets.length;
  const first = tickets[0] || {};
  const section = String(first.sectionName || first.sectionNumber || "");
  const row = String(first.rowNumber || "");
  const ga = Boolean(first.generalAdmission);
  const sameBlock = tickets.every(
    (ticket) =>
      String(ticket.sectionName || ticket.sectionNumber || "") === section &&
      String(ticket.rowNumber || "") === row,
  );
  const offerName = options?.defaultOffer
    ? selectionOfferName(first, options.defaultOffer)
    : offerNameFromSource(first);
  const unit = Number(first.cost || first.price || 0);
  const subtotal = tickets.reduce(
    (sum, ticket) => sum + Number(ticket.cost || ticket.price || 0),
    0,
  );
  const seatLine = ga
    ? String(first.sectionName || first.offerName || "GA")
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
  const subtitle =
    count === 1
      ? "1 ticket"
      : sameBlock
        ? `${count} tickets · seats are together`
        : `${count} tickets`;
  const qtyLabel = `${count} ${count === 1 ? "ticket" : "tickets"}`;
  return { count, offerName, unit, subtotal, seatLine, subtitle, qtyLabel };
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

export function resolvePackageCheckoutTotals(
  cart: {
    total?: number;
    serviceFee?: number;
    processingFee?: number;
    estimatedProcessingFee?: number;
    totalTax?: number;
    salesTax?: number;
  } | null | undefined,
  seatSubtotal: number,
): {
  subtotal: number;
  total: number;
  serviceFee: number;
  processingFee: number;
} {
  const serviceFee = Number(cart?.serviceFee || 0);
  const processingFee = Number(
    cart?.estimatedProcessingFee ?? cart?.processingFee ?? 0,
  );
  const tax = Number(cart?.totalTax ?? cart?.salesTax ?? 0);
  const fees = serviceFee + processingFee + tax;
  const cartTotal = Number(cart?.total || 0);
  const subtotal =
    seatSubtotal > 0 ? seatSubtotal : Math.max(0, cartTotal - fees);
  const total = cartTotal > 0 && cartTotal >= subtotal ? cartTotal : subtotal + fees;
  return { subtotal, total, serviceFee, processingFee };
}

/** Flex pack: $1 per voucher (cart serviceFee, or inferred) plus processing fee. */
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
  const totals = resolvePackageCheckoutTotals({ ...cart, serviceFee }, packPrice);
  const minTotal = totals.subtotal + serviceFee + totals.processingFee;
  return {
    ...totals,
    serviceFee,
    total: Math.max(totals.total, minTotal),
  };
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

function formatSeatNumbers(seats: Array<string | number>): string {
  const unique = [...new Set(seats.map((seat) => String(seat)))];
  const nums = unique
    .map((seat) => Number(seat))
    .filter((seat) => Number.isFinite(seat));
  if (nums.length !== unique.length) {
    return unique.length === 1 ? `Seat ${unique[0]}` : `Seats ${unique.join(", ")}`;
  }

  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  if (sorted.length === 1) return `Seat ${sorted[0]}`;

  const parts: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
      continue;
    }
    parts.push(start === end ? String(start) : `${start}-${end}`);
    start = end = sorted[i];
  }
  parts.push(start === end ? String(start) : `${start}-${end}`);
  return `Seats ${parts.join(", ")}`;
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
    const section = String(ticket.sectionName || ticket.sectionNumber || "GA");
    const row = String(ticket.rowNumber || ticket.rowName || "—");
    const seatNumber = ticket.seatNumber ?? "—";
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
        ? `Sec ${group.section} · General admission`
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
