import { FIELD_COPY } from "@/lib/fieldValidation";
import { formatCurrency, formatEventWhen } from "@/lib/helpers";
import { groupedWalletSeatLines, eventWhenLabel, eventTimezone } from "@/lib/wallet";
import type { EventLike, TicketLike } from "@/lib/wallet";

export type ListingTabId = "active" | "sold" | "expired";

export type WalletListing = {
  id: string;
  status: string;
  askingPrice: number;
  quantity: number;
  tickets: TicketLike[];
  event?: EventLike | null;
  createdAt?: string;
  soldAt?: string;
  expiredAt?: string;
  soldToEmail?: string;
  fromOrder?: string | number;
  payout?: number;
  raw: Record<string, unknown>;
};

export const LISTING_PRICE_COPY = {
  greaterThanZero: "Enter a price greater than 0.",
} as const;

export const LISTING_DISPLAY_COPY = {
  createFailed: "We couldn't list those tickets. Please try again.",
  updateFailed: "We couldn't update that listing. Please try again.",
  removeFailed: "We couldn't remove that listing. Please try again.",
} as const;

export function unwrapListingRecords(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data;
  if (root.data && typeof root.data === "object") {
    const nested = root.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) return nested.data;
  }
  return [];
}

function listingId(raw: Record<string, unknown>): string {
  return String(raw.id ?? raw.uuid ?? "").trim();
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

export function mapWalletListing(raw: unknown): WalletListing | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = listingId(record);
  if (!id) return null;
  const tickets = Array.isArray(record.tickets)
    ? (record.tickets as TicketLike[])
    : [];
  const event =
    record.event && typeof record.event === "object"
      ? (record.event as EventLike)
      : null;
  return {
    id,
    status: String(record.status || "").trim().toLowerCase(),
    askingPrice: numberValue(record.askingPrice ?? record.asking_price),
    quantity: Math.max(tickets.length, numberValue(record.quantity) || 0),
    tickets,
    event,
    createdAt: firstString(record.createdAt, record.listedAt, record.listed_at),
    soldAt: firstString(record.soldAt, record.soldOn, record.completedAt),
    expiredAt: firstString(record.expiredAt, record.expiredOn),
    soldToEmail: firstString(
      record.soldToEmail,
      record.buyerEmail,
      record.toUserEmail,
      record.emailAddressToUser,
    ),
    fromOrder: (record.fromOrder ?? record.orderId ?? record.order_id) as
      | string
      | number
      | undefined,
    payout: numberValue(record.payout) || undefined,
    raw: record,
  };
}

export function listingTab(status: string): ListingTabId | null {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "new") return "active";
  if (normalized === "complete") return "sold";
  if (normalized === "expired") return "expired";
  return null;
}

function eventStartMs(listing: WalletListing): number {
  const start = listing.event?.start;
  if (!start) return Number.POSITIVE_INFINITY;
  const ms = new Date(start).getTime();
  return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
}

export function sortListingsByEventStart(listings: WalletListing[]): WalletListing[] {
  return [...listings].sort((a, b) => eventStartMs(a) - eventStartMs(b) || a.id.localeCompare(b.id));
}

export function listingsForTab(
  listings: WalletListing[],
  tab: ListingTabId,
): WalletListing[] {
  return sortListingsByEventStart(
    listings.filter((listing) => listingTab(listing.status) === tab),
  );
}

export function mergeListingsById(
  existing: WalletListing[],
  incoming: WalletListing[],
): WalletListing[] {
  const byId = new Map<string, WalletListing>();
  for (const listing of existing) byId.set(listing.id, listing);
  for (const listing of incoming) byId.set(listing.id, listing);
  return [...byId.values()];
}

export function removeListingById(
  listings: WalletListing[],
  id: string | number,
): WalletListing[] {
  const key = String(id);
  return listings.filter((listing) => listing.id !== key);
}

export function listingSeatLines(listing: WalletListing): string[] {
  return groupedWalletSeatLines(listing.tickets);
}

export function listingTimestamp(
  value: string | undefined,
  listing: WalletListing,
): string {
  const iso = String(value || "").trim();
  if (!iso) return "";
  const tz = eventTimezone(listing.event);
  const when = formatEventWhen(iso, tz, "MMM D, YYYY");
  return when || iso;
}

export function listingStatusDotLine(listing: WalletListing): string {
  const tab = listingTab(listing.status);
  if (tab === "active") {
    const on = listingTimestamp(listing.createdAt, listing);
    return on ? `active on ${on}` : "active";
  }
  if (tab === "sold") {
    const on = listingTimestamp(listing.soldAt || listing.createdAt, listing);
    const email = listing.soldToEmail;
    const soldOn = on ? `sold on ${on}` : "sold";
    return email ? `sold to ${email} · ${soldOn}` : soldOn;
  }
  if (tab === "expired") {
    const on = listingTimestamp(listing.expiredAt || listing.createdAt, listing);
    return on ? `expired on ${on}` : "expired";
  }
  return listing.status;
}

export function listingEventName(listing: WalletListing): string {
  return String(listing.event?.name || "Event").trim() || "Event";
}

export function listingSchedule(listing: WalletListing): string {
  if (!listing.event) return "";
  return eventWhenLabel(listing.event);
}

export function parseAskingPrice(raw: string): number | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function eventResaleMinimumPercent(event?: EventLike | null): number | null {
  if (!event) return null;
  const record = event as EventLike & {
    resaleMinimum?: unknown;
    resaleMinimumPercent?: unknown;
    minResalePercent?: unknown;
  };
  const value = numberValue(
    record.resaleMinimumPercent ?? record.resaleMinimum ?? record.minResalePercent,
  );
  if (!value) return null;
  return value;
}

export function eventSellerFeeRate(event?: EventLike | null): number {
  if (!event) return 0;
  const record = event as EventLike & { secondaryServiceFeeSeller?: unknown };
  const value = numberValue(record.secondaryServiceFeeSeller);
  if (!value) return 0;
  return value > 1 ? value / 100 : value;
}

export function listingFaceValue(tickets: TicketLike[]): number {
  const first = tickets[0];
  return numberValue(first?.cost ?? first?.price);
}

export function listingMinimumAskingPrice(
  face: number,
  resaleMinimumPercent: number | null,
): number | null {
  if (resaleMinimumPercent == null || !Number.isFinite(face)) return null;
  return face * (1 + resaleMinimumPercent / 100);
}

export function listingPriceBelowMinimumCopy(minimum: number): string {
  return `Asking price must be at least ${formatCurrency(minimum)}.`;
}

export function listingAskingPriceError(
  raw: string,
  {
    face,
    resaleMinimumPercent,
    mode,
  }: {
    face: number;
    resaleMinimumPercent: number | null;
    mode: "blur" | "submit";
  },
): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) {
    return mode === "blur" ? null : LISTING_PRICE_COPY.greaterThanZero;
  }
  const price = parseAskingPrice(trimmed);
  if (price == null || !Number.isFinite(price) || !(price > 0)) {
    return LISTING_PRICE_COPY.greaterThanZero;
  }
  const floor = listingMinimumAskingPrice(face, resaleMinimumPercent);
  if (floor != null && price < floor) {
    return listingPriceBelowMinimumCopy(floor);
  }
  return null;
}

export function listingSellerFeeAmount(askingPrice: number, event?: EventLike | null): number {
  return askingPrice * eventSellerFeeRate(event);
}

export function listingNetPayout(
  askingPrice: number,
  quantity: number,
  event?: EventLike | null,
): number {
  const fee = listingSellerFeeAmount(askingPrice, event);
  return (askingPrice - fee) * quantity;
}

function listingHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  return (error as { response?: { status?: number } }).response?.status;
}

export function parseListingApiError(
  error: unknown,
  action: "create" | "update" | "delete" = "create",
): string {
  const status = listingHttpStatus(error);
  const fallback =
    action === "update"
      ? LISTING_DISPLAY_COPY.updateFailed
      : action === "delete"
        ? LISTING_DISPLAY_COPY.removeFailed
        : LISTING_DISPLAY_COPY.createFailed;
  if (status != null && status >= 400 && status < 500) return fallback;
  return FIELD_COPY.network;
}

export function buildCreateListingPayload({
  tickets,
  askingPrice,
  event,
  fromOrder,
}: {
  tickets: TicketLike[];
  askingPrice: number;
  event: unknown;
  fromOrder: unknown;
}): Record<string, unknown> {
  const first = (tickets[0] || {}) as TicketLike & {
    rowId?: unknown;
    sectionId?: unknown;
    sectionNumber?: unknown;
    rowNumber?: unknown;
    GA?: boolean;
  };
  const payload: Record<string, unknown> = {
    tickets,
    quantity: tickets.length,
    askingPrice,
    event,
    fromOrder,
    type: first.generalAdmission || first.GA ? "GA" : "SEATED",
  };
  if (first.rowId && first.sectionId) {
    payload.rowId = first.rowId;
    payload.sectionId = first.sectionId;
    payload.sectionNumber = first.sectionNumber;
    payload.rowNumber = first.rowNumber;
  }
  return payload;
}

export function listingTicketIds(listing: WalletListing): Array<string | number> {
  return listing.tickets
    .map((ticket) => ticket.id)
    .filter((id): id is string | number => id != null && id !== "");
}
