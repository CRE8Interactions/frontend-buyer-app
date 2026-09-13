import { BLOCKTICKETS_NAVY, resolvePrimaryColor, type BrandingOrganization, type OrgBranding } from "@/lib/branding";
import { isSportingEvent } from "@/lib/eventCategory";
import {
  attractionImageUrl,
  eventDoorsIso,
  formatCurrency,
  formatDoorsTime,
  formatEventWhen,
  imageUrl,
  normalizeAttractions,
  resolveEventMatchup,
  type ApiImage,
} from "@/lib/helpers";
import {
  formatVenueCityState,
  formatVenueLocationLine,
} from "@/lib/venueLocation";
import { transferSenderEmail } from "@/lib/ticketTransfers";
import {
  formatTicketHolderName,
  gaTicketSeatLine,
  groupedWalletSeatLines,
  isEventComplete,
  isScannedTicket,
  isToday,
  isUpcomingEvent,
  isWalletListedEvent,
  type OrderLike,
  type TicketLike,
} from "@/lib/wallet";
import { walletSectionHref } from "@/lib/walletNav";

type VenueLike = {
  name?: string;
  timezone?: string;
  address?: { city?: string; state?: string; line1?: string }[];
};

export type EventLike = {
  uuid?: string;
  name?: string;
  start?: string;
  doorsOpen?: string;
  realDoorsOpen?: string;
  summary?: string;
  venue?: VenueLike;
  image?: ApiImage;
  organization?:
    | (BrandingOrganization & {
        email_logo?: ApiImage;
        category?: { name?: string };
      })
    | null;
  branding?: OrgBranding | null;
  primaryColor?: string;
  category?: { name?: string };
  categoryName?: string;
  entryGate?: string;
  entry_gate?: string;
  subCategory?: { name?: string };
  attractions?: { name?: string; primary?: boolean; artwork?: ApiImage }[];
};

export type AttractionCard = {
  name: string;
  role: string;
  logo?: string;
  brand: string;
  initials: string;
};

export type CartLike = {
  id?: string | number;
  total?: number | string;
  event?: EventLike | null;
  tickets?: Array<Record<string, unknown>>;
  package?: {
    name?: string;
    events?: EventLike[];
  } | null;
  flex_pack?: {
    name?: string;
    gameTickets?: number;
    venue?: VenueLike;
  } | null;
  access_pass_template?: {
    name?: string;
    venue?: VenueLike;
    organization?: { name?: string };
    events?: EventLike[];
  } | null;
};

export type CartEventSummary = {
  key: string;
  name: string;
  when: string;
  venueLine: string;
  ticketCount: number;
  thumb?: string;
  today: boolean;
  doorsTime: string;
  startTime: string;
  eventUUID?: string;
  orderId?: string;
  availability: "available" | "past" | "transferred";
  pendingIncomingTransfer?: boolean;
  incomingTransferId?: string | number;
  /** Sender email shown on the Upcoming pending-transfer banner. */
  incomingTransferFrom?: string;
  /** Sender row already shows tickets waiting for the recipient to claim. */
  pendingOutgoingTransfer?: boolean;
  ticketSeats?: string[];
  showInUpcomingTab?: boolean;
  availabilityBadge?: "available" | "past" | "transferred" | "attended";
};

export type SeasonPackageSummary = {
  key: string;
  orderId?: string;
  name: string;
  venueLine: string;
  eventCount: number;
  ticketCount: number;
  thumb?: string;
  packageUUID?: string;
  /** Order name for the pass card: first name plus last initial, e.g. "Joe D." */
  holderName?: string;
  /** First package event, used when the access-pass payload omits events. */
  firstEvent?: EventLike;
};

/** Season-pass card name, resolved the way the legacy pass card does: the name
 * saved on the order, then the pass holder's email local part, else nothing so
 * the card leaves the holder line out. The user profile is never consulted.
 * Order names are title-cased as "Joe D."
 */
export function formatSeasonPassHolderName(
  order?: { firstName?: string; lastName?: string } | null,
  pass?: { email?: string } | null,
): string {
  const first = String(order?.firstName || "").trim();
  if (first) {
    const last = String(order?.lastName || "").trim();
    const firstName = first
      .toLowerCase()
      .replace(
        /(^|[\s'-])(\p{L})/gu,
        (_, lead: string, char: string) => lead + char.toUpperCase(),
      );
    const lastInitial = last ? ` ${last.charAt(0).toUpperCase()}.` : "";
    return `${firstName}${lastInitial}`;
  }
  return String(pass?.email || "").split("@")[0].trim();
}

export type CartTicketDetail = {
  id?: number | string;
  seat: string;
  holder: string;
  code: string;
  raw: Record<string, unknown>;
};

export type CartEventDetail = {
  key: string;
  title: string;
  when: string;
  doors: string;
  today: boolean;
  startTime: string;
  venue: string;
  venueLine: string;
  city: string;
  address: string;
  brand: string;
  initials: string;
  blurb: string;
  opp: string;
  heroImage?: string;
  posterSrc?: string;
  ticketLabel: string;
  packageName?: string;
  tickets: CartTicketDetail[];
  cartId: string;
  cartTotal?: number;
  orderId?: string;
  orderRecordId?: number | string;
  purchasedAt?: string;
  eventUUID?: string;
  event: EventLike;
  transfersEnabled: boolean;
  resaleEnabled: boolean;
  availability: CartEventSummary["availability"];
  pendingIncomingTransfer?: boolean;
  incomingTransferId?: string | number;
  /** Sender email shown on the Upcoming pending-transfer banner. */
  incomingTransferFrom?: string;
  showInUpcomingTab?: boolean;
  attractions: AttractionCard[];
  teams: {
    name: string;
    role: string;
    rec: string;
    initials: string;
    brand: string;
    logo?: string;
  }[];
};

/** Event toggles — both must be explicitly true to show wallet Transfer / Sell. */
export function eventWalletCommerceFlags(event?: EventLike | null) {
  return {
    transfersEnabled: event?.enableTransfers === true,
    resaleEnabled: event?.enableResale === true,
  };
}

function mergeEventOrganization(
  ev: EventLike,
  order?: OrderLike | null,
): EventLike {
  const orderOrg =
    (order?.organization as BrandingOrganization | undefined) ||
    (order?.package?.organization as BrandingOrganization | undefined) ||
    (order?.event?.organization as BrandingOrganization | undefined);
  const enableTransfer =
    orderOrg?.enableTransfer ?? ev.organization?.enableTransfer;
  const enableResale = orderOrg?.enableResale ?? ev.organization?.enableResale;
  if (
    enableTransfer === ev.organization?.enableTransfer &&
    enableResale === ev.organization?.enableResale
  ) {
    return ev;
  }
  return {
    ...ev,
    organization: {
      ...ev.organization,
      enableTransfer,
      enableResale,
    },
  };
}

function formatCartVenueLine(venue?: VenueLike | null, orgName?: string) {
  const line = formatVenueLocationLine(venue?.name, venue?.address);
  if (line) return line;
  if (venue?.name) return venue.name;
  return orgName || "";
}

function formatDoors(ev?: EventLike | null) {
  return formatDoorsTime(eventDoorsIso(ev), ev?.venue?.timezone);
}

export function ticketEntryGate(
  ticket?: Record<string, unknown> | null,
  event?: Pick<EventLike, "entryGate" | "entry_gate"> | null,
): string {
  return String(
    ticket?.entryGate ?? ticket?.entry_gate ?? event?.entryGate ?? event?.entry_gate ?? "",
  ).trim();
}

/** Seat-strip copy: hide the whole line when the pass has no entry gate. */
export function ticketEntryLine(
  ticket?: Record<string, unknown> | null,
  venue?: string,
  event?: Pick<EventLike, "entryGate" | "entry_gate"> | null,
): string {
  const gate = ticketEntryGate(ticket, event);
  if (!gate) return "";
  const enter = /^enter\s+at\b/i.test(gate)
    ? gate
    : /^gate\b/i.test(gate)
      ? `Enter at ${gate}`
      : `Enter at Gate ${gate}`;
  const place = String(venue || "").trim();
  return place ? `${enter} · ${place}` : enter;
}

function ticketSeatLabel(t: Record<string, unknown>) {
  if (t.generalAdmission || t.GA) {
    return gaTicketSeatLine(t);
  }
  const sec = t.sectionName || t.sectionNumber;
  const row = t.rowNumber;
  const seat = t.seatNumber;
  if (sec != null && row != null && seat != null) {
    return `Sec ${sec} · Row ${row} · Seat ${seat}`;
  }
  return String(t.offerName || t.sectionName || "Ticket");
}

/** Order totals come back as decimal strings on some payloads. */
function orderTotal(value?: number | string | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const amount = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(amount) ? amount : undefined;
}


function eventInitials(name?: string | null) {
  if (!name) return "EVENT";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 8).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Visitor/away panel color — navy placeholder when no logo (matches Who's playing). */
function awayPanelBrand(logo?: string | null) {
  return logo ? "#252930" : BLOCKTICKETS_NAVY;
}

function homePanelBrand(ev?: EventLike | null) {
  return resolvePrimaryColor(ev, ev?.organization);
}

function buildAttractionCards(
  ev?: EventLike | null,
  packageName?: string,
): AttractionCard[] {
  const orgName = ev?.organization?.name || packageName || "";
  const sporting = isSportingEvent(ev);
  const raw = normalizeAttractions(ev?.attractions);
  const matchup = resolveEventMatchup(ev?.attractions, {
    orgName,
    sportingEvent: sporting,
  });

  if (raw.length >= 2) {
    const sorted = [...raw].sort((a, b) => {
      if (a.primary && !b.primary) return -1;
      if (!a.primary && b.primary) return 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
    return sorted.map((a, i) => {
      const logo = attractionImageUrl(a) || undefined;
      return {
        name: a.name || `Guest ${i + 1}`,
        role: i === 0 ? "Home" : i === 1 ? "Visitor" : "Guest",
        logo,
        brand:
          i === 0 ? homePanelBrand(ev) : i === 1 ? awayPanelBrand(logo) : "#1b1e26",
        initials: eventInitials(a.name),
      };
    });
  }

  if (raw.length === 1) {
    if (matchup.showAwayTeam) {
      return [
        {
          name: matchup.homeLabel,
          role: "Home",
          logo: matchup.homeLogoSrc,
          brand: homePanelBrand(ev),
          initials: eventInitials(matchup.homeLabel),
        },
        {
          name: matchup.awayLabel,
          role: "Visitor",
          logo: matchup.awayLogoSrc,
          brand: awayPanelBrand(matchup.awayLogoSrc),
          initials: matchup.awayShort || eventInitials(matchup.awayLabel),
        },
      ];
    }
    return [
      {
        name: matchup.homeLabel,
        role: "Featured",
        logo: matchup.homeLogoSrc,
        brand: homePanelBrand(ev),
        initials: eventInitials(matchup.homeLabel),
      },
    ];
  }

  const fallbackName = orgName || ev?.name || "Event";
  const fallbackImage = imageUrl(ev?.image, "");
  if (!fallbackName) return [];
  return [
    {
      name: fallbackName,
      role: "Featured",
      logo: fallbackImage || undefined,
      brand: homePanelBrand(ev),
      initials: eventInitials(fallbackName),
    },
  ];
}

function resolvePosterSrc(
  attractions: AttractionCard[],
  ev?: EventLike | null,
): string | undefined {
  if (attractions.length >= 2) return undefined;
  if (attractions[0]?.logo) return attractions[0].logo;
  const img = imageUrl(ev?.image, "");
  return img || undefined;
}

function buildTeamsFromAttractions(attractions: AttractionCard[]) {
  if (attractions.length >= 2) {
    return attractions.slice(0, 2).map((a) => ({ ...a, rec: "" }));
  }
  return [];
}

function buildTeams(ev?: EventLike | null, packageName?: string) {
  const home =
    ev?.organization?.name ||
    ev?.venue?.name ||
    packageName ||
    "Home";
  const visitor = ev?.attractions?.[0]?.name || "Special event";
  const visitorLogo = ev?.attractions?.[0]?.artwork
    ? imageUrl(ev.attractions[0].artwork, "")
    : undefined;
  return [
    {
      name: home,
      role: "Home",
      rec: "",
      initials: eventInitials(home),
      brand: "#8c0b42",
    },
    {
      name: visitor,
      role: "Visitor",
      rec: "",
      initials: eventInitials(visitor),
      brand: awayPanelBrand(visitorLogo),
      logo: visitorLogo || undefined,
    },
  ];
}

function seatSortValue(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

/** Empty / GA parts sort last so reserved seats stay grouped. */
function compareSeatPart(a: unknown, b: unknown) {
  const left = seatSortValue(a);
  const right = seatSortValue(b);
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function compareWalletTickets(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
) {
  return (
    compareSeatPart(
      a.sectionNumber ?? a.sectionName,
      b.sectionNumber ?? b.sectionName,
    ) ||
    compareSeatPart(a.rowNumber ?? a.rowName, b.rowNumber ?? b.rowName) ||
    compareSeatPart(a.seatNumber, b.seatNumber)
  );
}

function walletTicketKey(ticket: {
  id?: unknown;
  code?: unknown;
  raw?: Record<string, unknown>;
}) {
  const raw = (ticket.raw ?? ticket) as Record<string, unknown>;
  return String(ticket.id ?? raw.id ?? ticket.code ?? raw.uuid ?? "").trim();
}

function walletTicketKeySet(
  tickets: Array<{ id?: unknown; code?: unknown; raw?: Record<string, unknown> }>,
) {
  return new Set(
    tickets.map((ticket) => walletTicketKey(ticket)).filter(Boolean),
  );
}

function mapEventTickets(
  tickets: Array<Record<string, unknown>>,
  holder: string,
): CartTicketDetail[] {
  return [...tickets].sort(compareWalletTickets).map((t, i) => ({
    id:
      typeof t.id === "number" || typeof t.id === "string"
        ? t.id
        : typeof t.uuid === "string"
          ? t.uuid
          : undefined,
    seat: ticketSeatLabel(t),
    holder,
    code: String(t.checkInCode || t.uuid || `CART-${i + 1}`),
    raw: t,
  }));
}

/** Transfer still in the sender's wallet until the recipient claims it. */
const PENDING_TRANSFER_STATUSES = new Set([
  "pending",
  "pending_transfer",
  "transfer_pending",
  "assigned",
]);

/** Ticket has left the sender's wallet after a completed transfer. */
const COMPLETED_TRANSFER_STATUSES = new Set([
  "accepted",
  "complete",
  "completed",
  "transferred",
]);

function normalizedStatus(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function isPendingTransferStatus(status: string) {
  return PENDING_TRANSFER_STATUSES.has(status);
}

function isCompletedTransferStatus(status: string) {
  return COMPLETED_TRANSFER_STATUSES.has(status);
}

function activeCompletedTransferRelation(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(activeCompletedTransferRelation);
  if (!value || typeof value !== "object") return false;
  const row = value as {
    status?: unknown;
    attributes?: unknown;
    data?: unknown;
  };
  if ("data" in row) return activeCompletedTransferRelation(row.data);
  if (row.attributes) return activeCompletedTransferRelation(row.attributes);
  const status = normalizedStatus(row.status);
  if (
    !status ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "rejected" ||
    isPendingTransferStatus(status)
  ) {
    return false;
  }
  return isCompletedTransferStatus(status);
}

function activePendingTransferRelation(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(activePendingTransferRelation);
  if (!value || typeof value !== "object") return false;
  const row = value as {
    status?: unknown;
    attributes?: unknown;
    data?: unknown;
  };
  if ("data" in row) return activePendingTransferRelation(row.data);
  if (row.attributes) return activePendingTransferRelation(row.attributes);
  const status = normalizedStatus(row.status);
  return Boolean(status && isPendingTransferStatus(status));
}

function ticketTransferRelations(ticket: TicketLike) {
  return (
    ticket.ticketTransfer ||
    ticket.ticket_transfer ||
    ticket.ticketTransfers ||
    ticket.ticket_transfers ||
    ticket.transfer
  );
}

/** Outbound transfer started but not yet claimed by the recipient. */
export function isPendingTransferTicket(ticket?: TicketLike | null): boolean {
  if (!ticket) return false;

  const directStatuses = [
    ticket.status,
    ticket.transferStatus,
    ticket.transfer_status,
    ticket.on_sale_status,
  ];
  if (
    directStatuses.some((status) =>
      isPendingTransferStatus(normalizedStatus(status)),
    )
  ) {
    return true;
  }

  return activePendingTransferRelation(ticketTransferRelations(ticket));
}

/** Ticket transfer payloads differ between API versions, so accept each known shape. */
export function isTransferredTicket(ticket?: TicketLike | null): boolean {
  if (!ticket || isPendingTransferTicket(ticket)) return false;
  if (
    ticket.isTransferred === true ||
    ticket.transferred === true ||
    Boolean(ticket.transferredAt)
  ) {
    return true;
  }

  const directStatuses = [
    ticket.status,
    ticket.transferStatus,
    ticket.transfer_status,
  ];
  if (
    directStatuses.some((status) => {
      const normalized = normalizedStatus(status);
      return (
        normalized &&
        !isPendingTransferStatus(normalized) &&
        isCompletedTransferStatus(normalized)
      );
    })
  ) {
    return true;
  }
  if (normalizedStatus(ticket.on_sale_status) === "transferred") {
    return true;
  }

  return activeCompletedTransferRelation(ticketTransferRelations(ticket));
}

function transferRelationDirectionIncoming(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(transferRelationDirectionIncoming);
  }
  if (!value || typeof value !== "object") return false;
  const row = value as {
    direction?: unknown;
    attributes?: unknown;
    data?: unknown;
  };
  if ("data" in row) return transferRelationDirectionIncoming(row.data);
  if (row.attributes) return transferRelationDirectionIncoming(row.attributes);
  return String(row.direction || "").trim().toLowerCase() === "incoming";
}

/** Recipient-side ticket acquired through a transfer (not a purchase). */
export function isIncomingTransferTicket(ticket?: TicketLike | null): boolean {
  if (!ticket) return false;
  return transferRelationDirectionIncoming(ticketTransferRelations(ticket));
}

/** Transferred-in orders use `transfer` as the purchase origin. */
export function isTransferReceivedOrder(order?: OrderLike | null): boolean {
  return (
    String(order?.source || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_") === "transfer"
  );
}

export function isTransferReceivedDetail(
  detail?: Pick<
    CartEventDetail,
    "pendingIncomingTransfer" | "incomingTransferId" | "key" | "tickets"
  > | null,
  order?: OrderLike | null,
): boolean {
  if (isTransferReceivedOrder(order)) return true;
  if (!detail) return false;
  if (detail.pendingIncomingTransfer) return true;
  if (detail.incomingTransferId != null && detail.incomingTransferId !== "") {
    return true;
  }
  if (detail.key.startsWith("incoming:")) return true;
  return detail.tickets.some((ticket) =>
    isIncomingTransferTicket((ticket.raw ?? ticket) as TicketLike),
  );
}

export function orderAcquiredLabel(
  detail?: Pick<
    CartEventDetail,
    "pendingIncomingTransfer" | "incomingTransferId" | "key" | "tickets"
  > | null,
  order?: OrderLike | null,
): "Purchased" | "Transferred" {
  return isTransferReceivedDetail(detail, order) ? "Transferred" : "Purchased";
}

function mergeTicketDetailLists(
  existing: CartTicketDetail[],
  additions: CartTicketDetail[],
): CartTicketDetail[] {
  const seen = new Set(existing.map((ticket) => String(ticket.id ?? ticket.code)));
  const merged = [...existing];
  for (const ticket of additions) {
    const key = String(ticket.id ?? ticket.code);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(ticket);
  }
  const holder = existing[0]?.holder || additions[0]?.holder || "";
  return mapEventTickets(
    merged.map((ticket) => ticket.raw || {}),
    holder,
  );
}

/** Remove transferred tickets from the sender wallet immediately after send. */
export function removeTicketsFromWalletDetails(
  details: Record<string, CartEventDetail>,
  ticketIds: Array<number | string | undefined | null>,
): Record<string, CartEventDetail> {
  const idSet = new Set(
    ticketIds
      .filter((value) => value != null && value !== "")
      .map((value) => String(value)),
  );
  if (!idSet.size) return details;

  const out: Record<string, CartEventDetail> = {};
  for (const [key, detail] of Object.entries(details)) {
    const tickets = detail.tickets.filter(
      (ticket) =>
        !idSet.has(String(ticket.id ?? "")) &&
        !idSet.has(walletTicketKey(ticket)),
    );
    if (!tickets.length && !detail.packageName) continue;
    const rawTickets = tickets.map(
      (ticket) => (ticket.raw ?? ticket) as Record<string, unknown>,
    );
    out[key] = {
      ...detail,
      tickets,
      availability:
        !tickets.length && detail.packageName
          ? "transferred"
          : eventAvailability(detail.event, rawTickets),
    };
  }
  return out;
}

/** @deprecated Use removeTicketsFromWalletDetails */
export function markTicketsPendingTransferInDetails(
  details: Record<string, CartEventDetail>,
  ticketIds: Array<number | string | undefined | null>,
): Record<string, CartEventDetail> {
  return removeTicketsFromWalletDetails(details, ticketIds);
}

/** Sender wallet uses refreshed API data; do not restore outgoing pending tickets. */
export function mergePendingTransferWalletDetails(
  next: Record<string, CartEventDetail>,
  _previous: Record<string, CartEventDetail>,
): Record<string, CartEventDetail> {
  return next;
}

function removeSentTransferTicketsFromDetail(
  detail: CartEventDetail,
  pendingTicketKeys: Set<string>,
): CartEventDetail {
  if (!pendingTicketKeys.size) return detail;
  const tickets = detail.tickets.filter(
    (ticket) => !pendingTicketKeys.has(walletTicketKey(ticket)),
  );
  const rawTickets = tickets.map(
    (ticket) => (ticket.raw ?? ticket) as Record<string, unknown>,
  );
  return {
    ...detail,
    tickets,
    availability:
      !tickets.length && detail.packageName
        ? "transferred"
        : eventAvailability(detail.event, rawTickets),
  };
}

/** True when any package game ticket transfer exists on the order. */
export function packageOrderHasTicketTransfers(
  details: Record<string, CartEventDetail>,
  sentTransfers: PendingSentTransfer[] = [],
  orderId?: string,
): boolean {
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) return false;

  for (const transfer of sentTransfers) {
    if (transfer.access_pass || transfer.accessPass) continue;
    if (String(transfer.orderId || "").trim() !== normalizedOrderId) continue;
    if ((transfer.tickets?.length ?? 0) > 0) return true;
  }

  return Object.values(details).some(
    (detail) =>
      String(detail.orderId || "").trim() === normalizedOrderId &&
      Boolean(detail.packageName) &&
      detail.availability === "transferred",
  );
}

export type PendingSentTransfer = {
  status?: string;
  orderId?: string | number;
  event?: EventLike | null;
  tickets?: TicketLike[];
  access_pass?: { uuid?: string; name?: string; type?: string };
  accessPass?: { uuid?: string; name?: string; type?: string };
};

export type PendingReceivedTransfer = PendingSentTransfer & {
  id?: string | number;
  fromUserEmail?: string;
};

function transferTicketEventUUID(transfer: PendingSentTransfer) {
  const fromEvent = String(transfer.event?.uuid || "").trim();
  if (fromEvent) return fromEvent;
  for (const ticket of transfer.tickets ?? []) {
    const uuid = String(ticket.eventUUID || ticket.eventId || "").trim();
    if (uuid) return uuid;
  }
  return "";
}

/** Package transfers may omit `event`; borrow the matching package game detail. */
function resolveTransferEvent(
  transfer: PendingSentTransfer,
  details: Record<string, CartEventDetail>,
): EventLike | null {
  const direct = transfer.event;
  if (direct?.uuid || direct?.name) {
    return direct;
  }
  const eventUUID = transferTicketEventUUID(transfer);
  if (!eventUUID) return null;
  const sibling = findRichestDetailForEvent(details, eventUUID);
  return sibling?.event ?? (eventUUID ? { uuid: eventUUID } : null);
}

function incomingTransferDetailKey(
  eventUUID: string,
  transferId?: string | number,
) {
  const event = String(eventUUID || "").trim();
  if (event) return `incoming:${event}`;
  const id = String(transferId ?? "").trim();
  return id ? `incoming:transfer:${id}` : "incoming:transfer:unknown";
}

function dedupePendingReceivedTransfers(transfers: PendingReceivedTransfer[]) {
  const seen = new Set<string>();
  const out: PendingReceivedTransfer[] = [];
  for (const transfer of transfers) {
    const id = String(transfer.id ?? "").trim();
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    out.push(transfer);
  }
  return out;
}

function findReceivedTransferDetailKey(
  details: Record<string, CartEventDetail>,
  eventUUID: string,
  transferId?: string | number,
  transferOrderId?: string,
  incomingTicketIds: string[] = [],
) {
  const ticketIdSet = new Set(incomingTicketIds.map(String).filter(Boolean));
  const matchesEvent = (row: CartEventDetail) =>
    Boolean(eventUUID) && row.eventUUID === eventUUID;
  const matchesTicket = (row: CartEventDetail) =>
    ticketIdSet.size > 0 &&
    row.tickets.some((ticket) =>
      ticketIdSet.has(String(ticket.id ?? ticket.code)),
    );

  const incoming =
    Object.entries(details).find(
      ([key, row]) =>
        key.startsWith("incoming:") &&
        (matchesEvent(row) || matchesTicket(row)),
    )?.[0] ?? null;
  if (incoming) return incoming;

  return incomingTransferDetailKey(eventUUID, transferId);
}

/** One pending incoming row per event — drop duplicate wallet/my-events rows. */
function collapseDuplicateIncomingEventDetails(
  details: Record<string, CartEventDetail>,
): Record<string, CartEventDetail> {
  const out = { ...details };
  const pendingByEvent = new Map<string, string[]>();

  for (const [key, detail] of Object.entries(out)) {
    if (!detail.pendingIncomingTransfer) continue;
    const eventUUID = String(detail.eventUUID || "").trim();
    if (!eventUUID) continue;
    pendingByEvent.set(eventUUID, [...(pendingByEvent.get(eventUUID) ?? []), key]);
  }

  for (const [, pendingKeys] of pendingByEvent) {
    const keyList = pendingKeys.filter((key) => key.startsWith("incoming:"));
    if (keyList.length <= 1) continue;

    const preferred = keyList[0]!;
    const pendingDetails = keyList
      .map((key) => out[key])
      .filter((detail): detail is CartEventDetail => Boolean(detail?.pendingIncomingTransfer));
    const tickets = pendingDetails.reduce(
      (acc, detail) => mergeTicketDetailLists(acc, detail.tickets),
      [] as CartTicketDetail[],
    );
    const pendingMeta = pendingDetails[pendingDetails.length - 1];

    out[preferred] = {
      ...(out[preferred] ?? pendingMeta!),
      ...pendingMeta,
      key: preferred,
      tickets,
      pendingIncomingTransfer: true,
      availability: "available",
      transfersEnabled: false,
      resaleEnabled: false,
    };

    for (const key of keyList) {
      if (key !== preferred) delete out[key];
    }
  }

  return out;
}

/** Surface pending incoming transfers in the recipient's upcoming wallet. */
export function reconcilePendingReceivedTransfers(
  details: Record<string, CartEventDetail>,
  transfers: PendingReceivedTransfer[],
  recipientEmail = "",
): Record<string, CartEventDetail> {
  let merged = { ...details };
  const holder = formatTicketHolderName({ email: recipientEmail });

  for (const transfer of dedupePendingReceivedTransfers(transfers)) {
    if (!isPendingTransferStatus(normalizedStatus(transfer.status))) continue;
    const tickets = transfer.tickets ?? [];
    if (!tickets.length) continue;
    const event = resolveTransferEvent(transfer, merged);
    if (!event || isEventComplete(event)) continue;

    const eventUUID = String(event.uuid || transferTicketEventUUID(transfer)).trim();
    const orderId = String(transfer.orderId || "").trim() || undefined;
    const incomingTicketIds = tickets.map((ticket) => String(ticket.id ?? ""));
    const key = findReceivedTransferDetailKey(
      merged,
      eventUUID,
      transfer.id,
      orderId,
      incomingTicketIds,
    );
    const incomingRaw = tickets.map((ticket) => ({
      ...ticket,
      transferStatus: "pending",
      ticketTransfer: {
        status: "pending",
        direction: "incoming",
        fromUserEmail: transfer.fromUserEmail,
      },
    }));
    const incomingTickets = mapEventTickets(incomingRaw, holder);
    const existing = merged[key];
    const nextTickets = existing?.pendingIncomingTransfer
      ? mergeTicketDetailLists(existing.tickets, incomingTickets)
      : incomingTickets;
    const incomingMeta = {
      pendingIncomingTransfer: true,
      incomingTransferId: transfer.id,
      incomingTransferFrom: transferSenderEmail(transfer) || undefined,
      transfersEnabled: false,
      resaleEnabled: false,
      showInUpcomingTab: true,
    };
    const patch: CartEventDetail = existing
      ? {
          ...existing,
          tickets: nextTickets,
          availability: "available",
          packageName: undefined,
          ...incomingMeta,
        }
      : {
          ...detailFromEvent(
            event,
            key,
            incomingRaw,
            key,
            undefined,
            holder,
            "Tickets",
          ),
          availability: "available",
          ...(orderId ? { orderId } : {}),
          ...incomingMeta,
        };

    merged = { ...merged, [key]: patch };
  }

  return collapseDuplicateIncomingEventDetails(merged);
}

/** Keep claimed package-game transfers on the recipient Upcoming tab. */
export function promoteRecipientPackageUpcomingRows(
  details: Record<string, CartEventDetail>,
  orders: OrderLike[],
  holderEmail = "",
): Record<string, CartEventDetail> {
  const out = { ...details };
  const holder = formatTicketHolderName({ email: holderEmail });

  for (const order of orders) {
    const pkg = order.package;
    if (!pkg?.events?.length) continue;
    const orderId = orderIdOf(order) || undefined;
    const packageKey =
      String(order.package?.uuid || "").trim() || orderId || "";
    const ownedEventCount = pkg.events.filter(
      (ev) => ticketsForPackageEvent(order, ev).length > 0,
    ).length;
    const isPartialPackage =
      ownedEventCount > 0 && ownedEventCount < pkg.events.length;

    for (const ev of pkg.events) {
      const eventUUID = String(ev.uuid || "").trim();
      if (!eventUUID) continue;
      const tickets = ticketsForPackageEvent(order, ev);
      if (!tickets.length) continue;

      const incomingKey = `incoming:${eventUUID}`;
      const packageDetailKey = packageKey ? `${packageKey}:${eventUUID}` : "";
      const existingIncoming = out[incomingKey];
      const packageDetail = packageDetailKey ? out[packageDetailKey] : undefined;
      if (existingIncoming?.pendingIncomingTransfer) continue;
      const shouldPromote =
        existingIncoming?.showInUpcomingTab ||
        isPartialPackage ||
        Boolean(packageDetail?.showInUpcomingTab);

      if (!shouldPromote) continue;

      out[incomingKey] = {
        ...(existingIncoming || packageDetail || {}),
        ...detailFromEvent(
          ev,
          incomingKey,
          tickets,
          incomingKey,
          undefined,
          holder,
          "Tickets",
        ),
        pendingIncomingTransfer: false,
        incomingTransferId: undefined,
        incomingTransferFrom: undefined,
        showInUpcomingTab: true,
        packageName: undefined,
        ...(orderId ? { orderId } : {}),
      };
    }
  }

  return out;
}

/** Past package games show Attended when scanned; Transferred when outbound transfer completed. */
export function walletEventAvailabilityBadge(
  detail: Pick<CartEventDetail, "availability" | "tickets">,
): "available" | "past" | "transferred" | "attended" {
  if (detail.availability === "transferred") return "transferred";
  if (detail.availability === "past") {
    const scanned = detail.tickets.some((ticket) =>
      isScannedTicket(ticket.raw ?? ticket),
    );
    return scanned ? "attended" : "past";
  }
  return detail.availability;
}

function dedupePendingSentTransfers(transfers: PendingSentTransfer[]) {
  const seen = new Set<string>();
  const out: PendingSentTransfer[] = [];
  for (const transfer of transfers) {
    const id = String(transfer.id ?? "").trim();
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    out.push(transfer);
  }
  return out;
}

function findRichestDetailForEvent(
  details: Record<string, CartEventDetail>,
  eventUUID: string,
) {
  return (
    Object.values(details).find(
      (row) =>
        row.eventUUID === eventUUID &&
        (row.heroImage || row.posterSrc || row.venueLine),
    ) ?? null
  );
}

function enrichDetailFromSibling(
  detail: CartEventDetail,
  sibling?: CartEventDetail | null,
): CartEventDetail {
  if (!sibling) return detail;
  const event =
    sibling.event &&
    (sibling.event.image ||
      sibling.event.venue?.name ||
      sibling.event.attractions?.length)
      ? { ...detail.event, ...sibling.event }
      : detail.event;
  const matchup = refreshEventMatchupFields(event, detail.packageName);
  return {
    ...detail,
    event,
    ...matchup,
    heroImage:
      detail.heroImage || sibling.heroImage || imageUrl(event?.image, ""),
    venue: detail.venue || sibling.venue,
    venueLine: detail.venueLine || sibling.venueLine,
    when: detail.when || sibling.when,
    doors: detail.doors || sibling.doors,
    startTime: detail.startTime || sibling.startTime,
    today: detail.today || sibling.today,
  };
}

function findSentTransferDetailKey(
  details: Record<string, CartEventDetail>,
  eventUUID: string,
  transferId?: string | number,
  transferOrderId?: string,
  ticketIds: string[] = [],
) {
  const ticketIdSet = new Set(ticketIds.map(String).filter(Boolean));
  const matchesEvent = (row: CartEventDetail) =>
    Boolean(eventUUID) && row.eventUUID === eventUUID;
  const matchesTicket = (row: CartEventDetail) =>
    ticketIdSet.size > 0 &&
    row.tickets.some((ticket) =>
      ticketIdSet.has(String(ticket.id ?? ticket.code)),
    );
  const sent =
    Object.entries(details).find(
      ([key, row]) =>
        key.startsWith("sent:") &&
        (matchesEvent(row) || matchesTicket(row)),
    )?.[0] ?? null;
  if (sent) return sent;

  const event = String(eventUUID || "").trim();
  if (event) return `sent:${event}`;
  const id = String(transferId ?? transferOrderId ?? "").trim();
  return id ? `sent:transfer:${id}` : "sent:transfer:unknown";
}

/** Merge duplicate pending-outgoing rows and borrow artwork from real orders. */
function collapseDuplicateSentEventDetails(
  details: Record<string, CartEventDetail>,
): Record<string, CartEventDetail> {
  const out = { ...details };

  for (const sentKey of Object.keys(out)) {
    if (!sentKey.startsWith("sent:")) continue;
    const sentDetail = out[sentKey];
    if (!sentDetail) continue;
    const eventUUID = String(sentDetail.eventUUID || "").trim();
    if (!eventUUID) continue;

    out[sentKey] = enrichDetailFromSibling(
      sentDetail,
      findRichestDetailForEvent(out, eventUUID),
    );
  }

  const sentByEvent = new Map<string, string[]>();
  for (const [key, detail] of Object.entries(out)) {
    if (!key.startsWith("sent:")) continue;
    const eventUUID = String(detail.eventUUID || "").trim();
    if (!eventUUID) continue;
    sentByEvent.set(eventUUID, [...(sentByEvent.get(eventUUID) ?? []), key]);
  }

  for (const [eventUUID, keys] of sentByEvent) {
    if (keys.length <= 1) continue;
    const preferred = keys[0]!;
    const mergedDetail = keys.slice(1).reduce((acc, key) => {
      const detail = out[key];
      if (!detail) return acc;
      return {
        ...acc,
        tickets: mergeTicketDetailLists(acc.tickets, detail.tickets),
      };
    }, out[preferred]!);
    out[preferred] = enrichDetailFromSibling(
      mergedDetail,
      findRichestDetailForEvent(out, eventUUID),
    );
    for (const key of keys) {
      if (key !== preferred) delete out[key];
    }
  }

  return out;
}

/** Drop completed transfers from the sender wallet once they are no longer pending. */
export function pruneTransferredWalletDetails(
  details: Record<string, CartEventDetail>,
): Record<string, CartEventDetail> {
  const out: Record<string, CartEventDetail> = {};

  for (const [key, detail] of Object.entries(details)) {
    if (detail.pendingIncomingTransfer) {
      out[key] = detail;
      continue;
    }

    const tickets = detail.tickets.filter((ticket) => {
      const raw = (ticket.raw ?? ticket) as TicketLike;
      if (isPendingTransferTicket(raw)) return false;
      return !isTransferredTicket(raw);
    });

    if (!tickets.length) {
      if (detail.packageName) {
        out[key] = {
          ...detail,
          tickets: [],
          availability: isUpcomingEvent(detail.event) ? "transferred" : "past",
        };
      }
      continue;
    }

    const rawTickets = tickets.map(
      (ticket) => (ticket.raw ?? ticket) as Record<string, unknown>,
    );
    out[key] = {
      ...detail,
      tickets,
      availability: eventAvailability(detail.event, rawTickets),
    };
  }

  return out;
}

/** Rehydrate tickets from pending sent transfers after a full wallet reload. */
export function reconcilePendingSentTransfers(
  details: Record<string, CartEventDetail>,
  transfers: PendingSentTransfer[],
  holderEmail = "",
): Record<string, CartEventDetail> {
  let merged = { ...details };

  for (const transfer of dedupePendingSentTransfers(transfers)) {
    if (!isPendingTransferStatus(normalizedStatus(transfer.status))) continue;
    const tickets = transfer.tickets ?? [];
    if (!tickets.length) continue;

    const event = resolveTransferEvent(transfer, merged);
    const eventUUID = String(event?.uuid || transferTicketEventUUID(transfer)).trim();
    const orderId = String(transfer.orderId || "").trim() || undefined;
    const pendingTicketKeys = new Set(
      tickets
        .map((ticket) =>
          walletTicketKey({ raw: ticket as Record<string, unknown> }),
        )
        .filter(Boolean),
    );
    const key = findSentTransferDetailKey(
      merged,
      eventUUID,
      transfer.id,
      orderId,
      [...pendingTicketKeys],
    );
    const holder = formatTicketHolderName({ email: holderEmail });
    const pendingRaw = tickets.map((ticket) => ({
      ...ticket,
      transferStatus: "pending",
      ticketTransfer: { status: "pending" },
    }));
    const pendingTickets = mapEventTickets(pendingRaw, holder);
    const existing = merged[key];

    if (!existing) {
      if (!event) continue;
      const created = {
        ...detailFromEvent(
          event,
          key,
          pendingRaw,
          orderId || key,
          undefined,
          holder,
          "Tickets",
        ),
        ...(orderId ? { orderId } : {}),
        availability: "available" as const,
        tickets: pendingTickets,
      };
      merged = {
        ...merged,
        [key]: enrichDetailFromSibling(
          created,
          findRichestDetailForEvent(merged, eventUUID),
        ),
      };
    } else {
    merged = mergePendingTransferWalletDetails(merged, {
      [key]: {
        ...existing,
        tickets: pendingTickets,
        availability: "available",
      },
    });
    }

    const ownedKey = findOwnedWalletDetailKeyForEvent(
      merged,
      eventUUID,
      orderId,
    );
    if (ownedKey) {
      const ownedDetail = merged[ownedKey];
      if (ownedDetail) {
        merged = {
          ...merged,
          [ownedKey]: removeSentTransferTicketsFromDetail(
            ownedDetail,
            pendingTicketKeys,
          ),
        };
      }
    }
  }

  return collapseDuplicateSentEventDetails(merged);
}

function eventAvailability(
  event: EventLike,
  tickets: Array<Record<string, unknown>>,
): CartEventSummary["availability"] {
  if (!isUpcomingEvent(event)) return "past";
  if (
    tickets.length > 0 &&
    tickets.every((ticket) => isTransferredTicket(ticket as TicketLike))
  ) {
    return "transferred";
  }
  return "available";
}

function detailFromEvent(
  ev: EventLike,
  key: string,
  tickets: Array<Record<string, unknown>>,
  cartId: string,
  cartTotal: number | undefined,
  holder: string,
  ticketLabel: string,
  packageName?: string,
): CartEventDetail {
  const addr = ev.venue?.address?.[0];
  const cityState = formatVenueCityState(ev.venue?.address);
  const street = addr?.line1 || "";
  const address = [street, cityState].filter(Boolean).join(", ");
  const offerName =
    tickets.length === 1
      ? String(tickets[0]?.offerName || "").trim()
      : "";
  const timezone = ev.venue?.timezone;
  const doors = formatDoors(ev);
  const startTime = formatEventWhen(ev.start, timezone, "h:mm A");
  const today = isToday(ev.start, timezone);
  const attractions = buildAttractionCards(ev, packageName);
  const posterSrc = resolvePosterSrc(attractions, ev);
  return {
    key,
    title: ev.name || packageName || "Event",
    when: formatEventWhen(ev.start, timezone, "ddd, MMM D · h:mm A"),
    doors,
    today,
    startTime,
    venue: ev.venue?.name || "",
    venueLine: formatVenueLocationLine(ev.venue?.name, ev.venue?.address),
    city: cityState,
    address,
    brand: "#8c0b42",
    initials: eventInitials(ev.name || visitorShort(ev)),
    blurb: ev.summary || "",
    opp: ev.attractions?.[0]?.name || "",
    heroImage: imageUrl(ev.image, ""),
    posterSrc,
    ticketLabel: offerName || ticketLabel,
    packageName,
    tickets: mapEventTickets(tickets, holder),
    cartId,
    cartTotal,
    eventUUID: String(ev.uuid || "").trim() || undefined,
    event: ev,
    ...eventWalletCommerceFlags(ev),
    availability: eventAvailability(ev, tickets),
    attractions,
    teams:
      attractions.length >= 2
        ? buildTeamsFromAttractions(attractions)
        : buildTeams(ev, packageName),
  };
}

function visitorShort(ev: EventLike) {
  return ev.attractions?.[0]?.name || ev.name || "Event";
}

function ticketsForEventKey(
  cart: CartLike,
  eventKey: string,
): Array<Record<string, unknown>> {
  const all = cart.tickets || [];
  if (!cart.package?.events?.length) return all;
  return all.filter((t) => {
    const uuid =
      t.eventUUID != null
        ? String(t.eventUUID)
        : t.eventId != null
          ? String(t.eventId)
          : "";
    return uuid === eventKey;
  });
}

/** Full event-detail payloads for cart rows on my-tickets. */
export function buildCartEventDetails(
  cart: CartLike,
  cartId: string | number,
  holderEmail = "",
): Record<string, CartEventDetail> {
  const id = String(cartId);
  const total = orderTotal(cart.total);
  const holder = formatTicketHolderName({ email: holderEmail });
  const out: Record<string, CartEventDetail> = {};

  if (cart.access_pass_template) {
    const ev = [...(cart.access_pass_template.events || [])].sort((a, b) =>
      String(a.start || "").localeCompare(String(b.start || "")),
    )[0];
    out["access-pass"] = detailFromEvent(
      ev || {
        name: cart.access_pass_template.name || "Access pass",
        venue: cart.access_pass_template.venue,
        organization: cart.access_pass_template.organization,
      },
      "access-pass",
      cart.tickets || [{ offerName: "Access pass" }],
      id,
      total,
      holder,
      "Access pass",
    );
    return out;
  }

  if (cart.flex_pack) {
    const attractions: AttractionCard[] = [
      {
        name: cart.flex_pack.name || "Flex pack",
        role: "Featured",
        brand: "#8c0b42",
        initials: "FLEX",
      },
    ];
    out["flex-pack"] = {
      key: "flex-pack",
      title: cart.flex_pack.name || "Flex pack",
      when: "",
      doors: "",
      today: false,
      startTime: "",
      venue: cart.flex_pack.venue?.name || "",
      venueLine: formatCartVenueLine(cart.flex_pack.venue),
      city: cart.flex_pack.venue?.address?.[0]?.city || "",
      address: formatCartVenueLine(cart.flex_pack.venue),
      brand: "#8c0b42",
      initials: "FLEX",
      blurb: "",
      opp: "",
      ticketLabel: "Flex pack",
      attractions,
      tickets: Array.from(
        { length: Number(cart.flex_pack.gameTickets) || 1 },
        (_, i) => ({
          seat: `Credit ${i + 1}`,
          holder,
          code: `FLEX-${i + 1}`,
          raw: {},
        }),
      ),
      cartId: id,
      cartTotal: total,
      event: {},
      transfersEnabled: false,
      resaleEnabled: false,
      availability: "available",
      teams: [],
    };
    return out;
  }

  if (cart.package?.events?.length) {
    const seen = new Set<string>();
    for (const ev of cart.package.events) {
      const key = String(ev.uuid || ev.name || "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const tickets = ticketsForEventKey(cart, key);
      if (!tickets.length) continue;
      out[key] = detailFromEvent(
        ev,
        key,
        tickets,
        id,
        total,
        holder,
        "Package",
        cart.package.name,
      );
    }
    if (Object.keys(out).length) return out;

    const first = cart.package.events[0];
    if (first) {
      const key = String(first.uuid || first.name || "package-event");
      out[key] = detailFromEvent(
        first,
        key,
        cart.tickets || [],
        id,
        total,
        holder,
        "Package",
        cart.package.name,
      );
    }
    return out;
  }

  if (cart.event || cart.tickets?.length) {
    const key = String(cart.event?.uuid || "event");
    out[key] = detailFromEvent(
      cart.event || { name: "Event" },
      key,
      cart.tickets || [],
      id,
      total,
      holder,
      "Tickets",
    );
  }

  return out;
}

function walletEventStartMs(detail?: CartEventDetail | null) {
  const start = detail?.event?.start;
  if (!start) return Number.MAX_SAFE_INTEGER;
  return new Date(start).getTime();
}

function availabilityRank(availability: CartEventSummary["availability"]) {
  if (availability === "available") return 0;
  if (availability === "past") return 1;
  return 2;
}

function isPendingTransferUpcomingRow(summary: CartEventSummary): boolean {
  return summary.pendingIncomingTransfer === true;
}

/** Upcoming wallet events: pending incoming transfers first, then today, then soonest start. */
export function sortWalletUpcomingEvents(
  summaries: CartEventSummary[],
  details: Record<string, CartEventDetail>,
): CartEventSummary[] {
  return [...summaries].sort((a, b) => {
    const aPending = isPendingTransferUpcomingRow(a);
    const bPending = isPendingTransferUpcomingRow(b);
    if (aPending !== bPending) return aPending ? -1 : 1;
    if (a.today !== b.today) return a.today ? -1 : 1;
    const startDiff =
      walletEventStartMs(details[a.key]) - walletEventStartMs(details[b.key]);
    if (startDiff !== 0) return startDiff;
    return a.name.localeCompare(b.name);
  });
}

/** Season package games and schedules: earliest event first. */
export function sortWalletEventSchedule(
  summaries: CartEventSummary[],
  details: Record<string, CartEventDetail>,
): CartEventSummary[] {
  return [...summaries].sort((a, b) => {
    const startDiff =
      walletEventStartMs(details[a.key]) - walletEventStartMs(details[b.key]);
    if (startDiff !== 0) return startDiff;
    const availabilityDiff =
      availabilityRank(a.availability) - availabilityRank(b.availability);
    if (availabilityDiff !== 0) return availabilityDiff;
    return a.name.localeCompare(b.name);
  });
}

/** Season packages tab: next upcoming game in the package. */
export function sortSeasonPackageSummaries(
  packages: SeasonPackageSummary[],
  details: Record<string, CartEventDetail>,
): SeasonPackageSummary[] {
  const nextEventMs = (pkg: SeasonPackageSummary) => {
    const prefix = pkg.packageUUID
      ? `${pkg.packageUUID}:`
      : `${pkg.key}:`;
    const games = Object.entries(details)
      .filter(
        ([key, detail]) =>
          key.startsWith(prefix) &&
          (!pkg.orderId || detail.orderId === pkg.orderId) &&
          detail.availability === "available",
      )
      .map(([, detail]) => detail);
    if (!games.length) return Number.MAX_SAFE_INTEGER;
    return Math.min(...games.map((detail) => walletEventStartMs(detail)));
  };

  return [...packages].sort((a, b) => {
    const diff = nextEventMs(a) - nextEventMs(b);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

export function summarizeEventDetails(
  details: Record<string, CartEventDetail>,
  mode: "upcoming" | "schedule" = "upcoming",
  lookupDetails: Record<string, CartEventDetail> = details,
): CartEventSummary[] {
  const listed =
    mode === "schedule"
      ? Object.values(details)
      : Object.values(details).filter(
          (detail) =>
            !isEventComplete(detail.event) && detail.availability !== "past",
        );
  const summaries = listed.map((d) => ({
      key: d.key,
      name: d.title,
      when: d.when,
      venueLine: d.venueLine || d.venue,
      ticketCount: d.tickets.length,
      thumb: d.heroImage || d.posterSrc,
      today: d.today,
      doorsTime: d.doors,
      startTime: d.startTime,
      eventUUID: d.eventUUID,
      orderId: d.orderId,
      availability: d.availability,
      pendingIncomingTransfer: d.pendingIncomingTransfer,
      incomingTransferId: d.incomingTransferId,
      incomingTransferFrom: d.incomingTransferFrom,
      pendingOutgoingTransfer: ownedRowShowsPendingOutgoingTransfer(
        d,
        lookupDetails,
      ),
      ticketSeats: groupedWalletSeatLines(
        d.tickets.map((ticket) => ticket.raw ?? {}),
      ),
      showInUpcomingTab: d.showInUpcomingTab,
      availabilityBadge: walletEventAvailabilityBadge(d),
    }));
  return mode === "schedule"
    ? sortWalletEventSchedule(summaries, details)
    : sortWalletUpcomingEvents(summaries, details);
}

function firstRouteParam(value?: string | string[] | null) {
  const raw = Array.isArray(value) ? value[0] : value;
  const uuid = String(raw || "").trim();
  return uuid || undefined;
}

function walletOrderBase(orderId?: string | null) {
  const id = String(orderId || "").trim();
  return id ? `${walletSectionHref("events")}order/${id}/` : "";
}

/** Wallet ticket detail for a purchased single-event order. */
export function walletEventTicketsPath(orderId?: string | null) {
  return walletOrderBase(orderId);
}

/** Wallet detail for an access pass owned by the shopper. */
export function walletAccessPassPath(
  orderId?: string | null,
  accessPassUUID?: string | null,
) {
  const base = walletOrderBase(orderId);
  const uuid = String(accessPassUUID || "").trim();
  return base && uuid ? `${base}access-pass/${uuid}/` : "";
}

/** Wallet package detail for a purchased season package. */
export function walletPackagePath(
  orderId?: string | null,
  packageUUID?: string | null,
) {
  const base = walletOrderBase(orderId);
  const uuid = String(packageUUID || "").trim();
  return base && uuid ? `${base}package/${uuid}/` : "";
}

/** Wallet event detail nested under a season package. */
export function walletPackageEventPath(
  orderId?: string | null,
  packageUUID?: string | null,
  eventUUID?: string | null,
) {
  const pkg = walletPackagePath(orderId, packageUUID);
  const event = String(eventUUID || "").trim();
  return pkg && event ? `${pkg}event/${event}/` : "";
}

/** Wallet flex-pack detail for a purchased pack. */
export function walletFlexPackPath(
  orderId?: string | null,
  flexPackUUID?: string | null,
) {
  const base = walletOrderBase(orderId);
  const uuid = String(flexPackUUID || "").trim();
  return base && uuid ? `${base}flex-pack/${uuid}/` : "";
}

/** Order id and object UUIDs from a wallet detail URL. */
export function walletRouteFromPath(
  pathname = "",
  params?: {
    orderId?: string | string[];
    eventUUID?: string | string[];
    flexPackUUID?: string | string[];
    packageUUID?: string | string[];
    accessPassUUID?: string | string[];
  },
): {
  orderId?: string;
  eventUUID?: string;
  flexPackUUID?: string;
  packageUUID?: string;
  accessPassUUID?: string;
} {
  const path = (pathname.split("?")[0] || "").replace(/\/+$/, "") || "/";
  const packageEvent = path.match(
    /^\/wallet\/my-tickets\/order\/([^/]+)\/package\/([^/]+)\/event\/([^/]+)$/,
  );
  const orderId =
    packageEvent?.[1] ||
    path.match(/^\/wallet\/my-tickets\/order\/([^/]+)(?:\/|$)/)?.[1] ||
    firstRouteParam(params?.orderId);
  const packageUUID =
    packageEvent?.[2] ||
    path.match(
      /^\/wallet\/my-tickets\/order\/[^/]+\/package\/([^/]+)$/,
    )?.[1] ||
    firstRouteParam(params?.packageUUID);
  const eventUUID =
    packageEvent?.[3] || firstRouteParam(params?.eventUUID);
  const flexPackUUID =
    path.match(
      /^\/wallet\/my-tickets\/order\/[^/]+\/flex-pack\/([^/]+)$/,
    )?.[1] ||
    firstRouteParam(params?.flexPackUUID);
  const accessPassUUID =
    path.match(
      /^\/wallet\/my-tickets\/order\/[^/]+\/access-pass\/([^/]+)$/,
    )?.[1] ||
    firstRouteParam(params?.accessPassUUID);
  return {
    ...(orderId ? { orderId } : {}),
    ...(eventUUID ? { eventUUID } : {}),
    ...(flexPackUUID ? { flexPackUUID } : {}),
    ...(packageUUID ? { packageUUID } : {}),
    ...(accessPassUUID ? { accessPassUUID } : {}),
  };
}

/** Top-of-card schedule line for wallet event rows. */
export function walletEventScheduleLine(
  row: Pick<CartEventSummary, "today" | "doorsTime" | "startTime" | "when">,
): string {
  if (row.today) {
    const gates = row.doorsTime || row.startTime;
    return gates ? `Gates open · ${gates}` : "Today";
  }
  return row.when;
}

function orderIdOf(order: OrderLike) {
  return String(order.orderId || order.id || "");
}

function attachOrderEventDetail(
  out: Record<string, CartEventDetail>,
  order: OrderLike,
  ev: EventLike,
  key: string,
  tickets: TicketLike[],
  holderEmail: string,
  ticketLabel: string,
  packageName?: string,
  includeUnavailable = false,
) {
  // Package screens list every included event, even ones whose tickets are
  // gone, so a ticketless row can still be attached there.
  if (!tickets.length && !includeUnavailable) return;
  if (!includeUnavailable) {
    if (isEventComplete(ev) || !isWalletListedEvent(ev)) return;
  }
  const orderId = orderIdOf(order);
  const total = orderTotal(order.total);
  const holder = formatTicketHolderName({
    firstName: order.firstName,
    lastName: order.lastName,
    email: order.email || holderEmail,
  });
  const purchasedAt = order.createdAt
    ? formatEventWhen(
        order.createdAt,
        order.timezone || order.event?.venue?.timezone || order.package?.venue?.timezone,
        "ddd, MMM D · h:mm A",
      )
    : "";
  const enriched = mergeEventOrganization(ev, order);
  out[key] = {
    ...detailFromEvent(
      enriched,
      key,
      tickets as Array<Record<string, unknown>>,
      orderId,
      total,
      holder,
      ticketLabel,
      packageName,
    ),
    orderId,
    orderRecordId: order.id,
    purchasedAt,
    eventUUID: String(ev.uuid || "").trim() || undefined,
  };
}

function ticketsForPackageEvent(
  order: OrderLike,
  ev: { uuid?: string },
): TicketLike[] {
  const tickets = order.tickets ?? [];
  if (!tickets.length) return [];
  const tagged = tickets.some((t) => t.eventUUID || t.eventId);
  if (!tagged) return tickets;
  const uuid = String(ev.uuid || "");
  if (!uuid) return [];
  return tickets.filter(
    (t) => String(t.eventUUID || t.eventId || "") === uuid,
  );
}

function uniqueSeatCount(tickets: TicketLike[]): number {
  const keys = new Set(
    tickets.map((t) => {
      if (t.generalAdmission) {
        return `ga:${t.sectionNumber ?? t.uuid ?? t.id ?? "ga"}`;
      }
      return `${t.sectionNumber ?? ""}|${t.rowNumber ?? ""}|${t.seatNumber ?? ""}`;
    }),
  );
  return keys.size;
}

/** Upcoming single-event wallet tickets from GET /events/myUpcomingEvents. */
export function buildOrderEventDetails(
  orders: OrderLike[],
  holderEmail = "",
): Record<string, CartEventDetail> {
  const out: Record<string, CartEventDetail> = {};

  for (const order of orders) {
    if (order.package) continue;
    if (!order.event || !(order.tickets?.length ?? 0)) continue;
    const orderId = orderIdOf(order) || `order-${Object.keys(out).length + 1}`;
    attachOrderEventDetail(
      out,
      order,
      order.event,
      orderId,
      order.tickets ?? [],
      holderEmail,
      "Tickets",
    );
  }

  return out;
}

/** Per-game details for season-package orders (Season tickets tab drill-down). */
export function buildSeasonPackageEventDetails(
  orders: OrderLike[],
  holderEmail = "",
): Record<string, CartEventDetail> {
  const out: Record<string, CartEventDetail> = {};

  for (const order of orders) {
    if (!order.package?.events?.length) continue;
    const packageKey =
      String(order.package.uuid || "").trim() || orderIdOf(order);
    const seen = new Set<string>();
    for (const ev of order.package.events) {
      const uuid = String(ev.uuid || ev.name || "");
      if (!uuid || seen.has(uuid)) continue;
      const tickets = ticketsForPackageEvent(order, ev);
      seen.add(uuid);
      attachOrderEventDetail(
        out,
        order,
        ev,
        `${packageKey}:${uuid}`,
        tickets,
        holderEmail,
        "Package",
        order.package.name,
        true,
      );
    }
  }

  return out;
}

/** One wallet card per season-package order. */
export function buildSeasonPackageSummaries(
  orders: OrderLike[],
): SeasonPackageSummary[] {
  const out: SeasonPackageSummary[] = [];

  for (const order of orders) {
    const pkg = order.package;
    if (!pkg) continue;
    const tickets = order.tickets ?? [];
    const orderId = orderIdOf(order) || undefined;
    const packageUUID = String(pkg.uuid || "").trim() || undefined;
    const events = [...(pkg.events ?? [])].sort((a, b) =>
      String(a.start || "").localeCompare(String(b.start || "")),
    );
    out.push({
      key: orderId || packageUUID || `package-${out.length + 1}`,
      orderId,
      name: pkg.name || "Season tickets",
      venueLine: formatCartVenueLine(pkg.venue, pkg.organization?.name),
      // Every game in the package counts, matching the package screen's rows.
      eventCount: events.length,
      ticketCount: uniqueSeatCount(tickets) || tickets.length,
      thumb: pkg.image ? imageUrl(pkg.image, "") : undefined,
      packageUUID,
      holderName: formatSeasonPassHolderName(order) || undefined,
      firstEvent: events[0],
    });
  }

  return out;
}

export function countSeasonPackages(orders: OrderLike[]): number {
  return buildSeasonPackageSummaries(orders).length;
}

/** Owned package games stay on Packages; recipient transfer rows belong in Upcoming. */
export function isUpcomingWalletDetail(
  key: string,
  detail: CartEventDetail,
): boolean {
  if (detail.showInUpcomingTab) return true;
  if (detail.pendingIncomingTransfer || key.startsWith("incoming:")) return true;
  if (key.startsWith("sent:")) return true;
  if (detail.packageName) return false;
  return true;
}

function findOwnedWalletDetailKeyForEvent(
  details: Record<string, CartEventDetail>,
  eventUUID: string,
  orderId?: string,
): string | null {
  const normalizedOrderId = String(orderId || "").trim();
  let fallback: string | null = null;
  for (const [key, detail] of Object.entries(details)) {
    if (key.startsWith("sent:") || key.startsWith("incoming:")) continue;
    if (String(detail.eventUUID || "").trim() !== eventUUID) continue;
    if (
      normalizedOrderId &&
      detail.orderId &&
      String(detail.orderId) === normalizedOrderId
    ) {
      return key;
    }
    if (!detail.packageName && !fallback) fallback = key;
  }
  return fallback;
}

function findOwnedWalletDetailForEvent(
  details: Record<string, CartEventDetail>,
  eventUUID: string,
  orderId?: string,
): CartEventDetail | null {
  const key = findOwnedWalletDetailKeyForEvent(details, eventUUID, orderId);
  return key ? details[key] ?? null : null;
}

function markOwnedTicketsPendingOutgoing(
  detail: CartEventDetail,
  pendingTicketIds: Set<string>,
): CartEventDetail {
  if (!pendingTicketIds.size) return detail;
  return {
    ...detail,
    tickets: detail.tickets.map((ticket) => {
      const ticketId = walletTicketKey(ticket);
      if (!ticketId || !pendingTicketIds.has(ticketId)) return ticket;
      const raw = {
        ...(ticket.raw ?? {}),
        transferStatus: "pending",
        ticketTransfer: { status: "pending" },
      };
      return { ...ticket, raw };
    }),
  };
}

/** Sender upcoming uses order rows only; sent stubs live on My transfers. */
export function shouldShowSentTransferStubInUpcoming(
  key: string,
  _detail: CartEventDetail,
  _details: Record<string, CartEventDetail>,
): boolean {
  return !key.startsWith("sent:");
}

function detailHasAnyPendingOutgoingTickets(detail: CartEventDetail): boolean {
  return detail.tickets.some((ticket) =>
    isPendingTransferTicket((ticket.raw ?? ticket) as TicketLike),
  );
}

function ownedRowShowsPendingOutgoingTransfer(
  detail: CartEventDetail,
  details: Record<string, CartEventDetail>,
): boolean {
  if (detail.pendingIncomingTransfer || detail.key.startsWith("sent:")) {
    return false;
  }
  if (detailHasAnyPendingOutgoingTickets(detail)) return true;

  const eventUUID = String(detail.eventUUID || "").trim();
  if (!eventUUID) return false;

  for (const [sentKey, sentDetail] of Object.entries(details)) {
    if (!sentKey.startsWith("sent:")) continue;
    if (String(sentDetail.eventUUID || "").trim() !== eventUUID) continue;
    if (shouldShowSentTransferStubInUpcoming(sentKey, sentDetail, details)) {
      continue;
    }
    return true;
  }

  return false;
}

export function summarizeUpcomingWalletEvents(
  details: Record<string, CartEventDetail>,
): CartEventSummary[] {
  const upcomingDetails = Object.fromEntries(
    Object.entries(details).filter(([key, detail]) => {
      if (!isUpcomingWalletDetail(key, detail)) return false;
      return shouldShowSentTransferStubInUpcoming(key, detail, details);
    }),
  );
  return summarizeEventDetails(upcomingDetails, "upcoming", details);
}

export function buildWalletEventDetails(
  orders: OrderLike[],
  holderEmail = "",
  options: {
    sentTransfers?: PendingSentTransfer[];
    incomingTransfers?: PendingReceivedTransfer[];
  } = {},
): {
  allDetails: Record<string, CartEventDetail>;
  upcomingEvents: CartEventSummary[];
} {
  let allDetails: Record<string, CartEventDetail> = {
    ...buildOrderEventDetails(orders, holderEmail),
    ...buildSeasonPackageEventDetails(orders, holderEmail),
  };

  if (options.sentTransfers?.length) {
    allDetails = reconcilePendingSentTransfers(
      allDetails,
      options.sentTransfers,
      holderEmail,
    );
  }
  if (options.incomingTransfers?.length) {
    allDetails = reconcilePendingReceivedTransfers(
      allDetails,
      options.incomingTransfers,
      holderEmail,
    );
  }

  allDetails = promoteRecipientPackageUpcomingRows(
    allDetails,
    orders,
    holderEmail,
  );
  allDetails = pruneTransferredWalletDetails(allDetails);

  return {
    allDetails,
    upcomingEvents: summarizeUpcomingWalletEvents(allDetails),
  };
}

export type FlexPackVoucherSummary = {
  code: string;
  status: "Active" | "Redeemed";
};

export type FlexPackSummary = {
  key: string;
  name: string;
  venueLine: string;
  voucherCount: number;
  remainingCount: number;
  thumb?: string;
  codes: FlexPackVoucherSummary[];
  flexPackUUID?: string;
  orderId?: string;
};

type FlexPackLike = NonNullable<
  NonNullable<OrderLike["vouchers"]>[number]["flex_pack"]
> & {
  venue?: { name?: string };
};

function isVoucherRedeemed(status?: string) {
  const value = String(status || "").trim().toLowerCase();
  return value === "redeemed" || value === "used" || value === "inactive";
}

function flexPackFromOrder(
  order: OrderLike,
  voucher?: NonNullable<OrderLike["vouchers"]>[number],
): FlexPackLike | null {
  return voucher?.flex_pack || order.flex_pack || null;
}

function voucherStatusLabel(status?: string): FlexPackVoucherSummary["status"] {
  return isVoucherRedeemed(status) ? "Redeemed" : "Active";
}

/** One wallet card per flex pack, including voucher-only orders. */
export function buildFlexPackSummaries(orders: OrderLike[]): FlexPackSummary[] {
  const groups = new Map<
    string,
    { pack: FlexPackLike | null; codes: FlexPackVoucherSummary[]; orderKey: string }
  >();

  for (const order of orders) {
    const vouchers = order.vouchers ?? [];
    if (!vouchers.length) continue;
    const orderKey = orderIdOf(order) || `flex-${groups.size + 1}`;

    for (const voucher of vouchers) {
      const pack = flexPackFromOrder(order, voucher);
      const packId = pack ? String(pack.uuid ?? pack.id ?? "") : "";
      const key = packId
        ? `${orderKey}:${packId}`
        : !order.event && !order.package
          ? orderKey
          : "";
      if (!key) continue;
      const code = String(voucher.code || "").trim();
      if (!code) continue;

      if (!groups.has(key)) {
        groups.set(key, { pack, codes: [], orderKey });
      }
      groups.get(key)!.codes.push({
        code,
        status: voucherStatusLabel(voucher.status),
      });
    }
  }

  return [...groups.values()]
    .map(({ pack, codes, orderKey }) => {
      const flexPackUUID = pack
        ? String(pack.uuid ?? pack.id ?? "").trim() || undefined
        : undefined;
      return {
        key: flexPackUUID ? `${orderKey}:${flexPackUUID}` : orderKey,
        name: pack?.name || "Flex pack",
        venueLine: formatCartVenueLine(pack?.venue, pack?.organization?.name),
        voucherCount: codes.length,
        remainingCount: codes.filter((voucher) => voucher.status === "Active").length,
        thumb: pack?.image ? imageUrl(pack.image, "") : undefined,
        codes,
        flexPackUUID,
        orderId: orderKey,
      };
    })
    .filter((row) => row.voucherCount > 0);
}

export function countFlexPacks(orders: OrderLike[]): number {
  return buildFlexPackSummaries(orders).length;
}

export function summarizeCartEvents(
  cart: CartLike,
  cartId?: string | number,
  holderEmail = "",
): CartEventSummary[] {
  return summarizeEventDetails(
    buildCartEventDetails(cart, cartId ?? cart.id ?? "", holderEmail),
  );
}

/**
 * GET /orders?filters[orderId] includes event.category and organization.branding
 * that the wallet list endpoint omits. Prefer the matching package event, then
 * the order event.
 */
export function eventFromFullOrder(
  listed: EventLike | undefined,
  order?: OrderLike | null,
): EventLike | undefined {
  if (!order) return listed;
  const listedUuid = String(listed?.uuid || "").trim();
  const packageMatch =
    listedUuid && order.package?.events?.length
      ? order.package.events.find((event) => String(event.uuid || "") === listedUuid)
      : undefined;
  const full = packageMatch || order.event || undefined;
  if (!full) return listed;
  const fullUuid = String(full.uuid || "").trim();
  return {
    ...listed,
    ...full,
    uuid: fullUuid || listedUuid || undefined,
    organization:
      listed?.organization || full.organization
        ? {
            ...listed?.organization,
            ...full.organization,
            branding:
              full.organization?.branding ?? listed?.organization?.branding,
            category:
              full.organization?.category ?? listed?.organization?.category,
          }
        : listed?.organization,
    category: full.category ?? listed?.category,
    categoryName: full.categoryName ?? listed?.categoryName,
    branding: full.branding ?? listed?.branding,
  };
}

function refreshEventMatchupFields(
  ev?: EventLike | null,
  packageName?: string,
): Pick<CartEventDetail, "attractions" | "teams" | "posterSrc"> {
  const attractions = buildAttractionCards(ev, packageName);
  return {
    attractions,
    posterSrc: resolvePosterSrc(attractions, ev),
    teams:
      attractions.length >= 2
        ? buildTeamsFromAttractions(attractions)
        : buildTeams(ev, packageName),
  };
}

/**
 * The wallet list endpoint returns trimmed orders, so the amount paid, the
 * buyer's name, and print branding only arrive with a single-order fetch.
 */
export function withFullOrder(
  detail: CartEventDetail,
  order?: OrderLike | null,
): CartEventDetail {
  if (!order) return detail;
  const event = eventFromFullOrder(detail.event, order) ?? detail.event;
  const holder =
    order.firstName || order.lastName
      ? formatTicketHolderName({
          firstName: order.firstName,
          lastName: order.lastName,
        })
      : "";
  const purchasedAt = order.createdAt
    ? formatEventWhen(
        order.createdAt,
        order.timezone ||
          order.event?.venue?.timezone ||
          order.package?.venue?.timezone,
        "ddd, MMM D · h:mm A",
      )
    : "";
  return {
    ...detail,
    ...refreshEventMatchupFields(event, detail.packageName),
    ...eventWalletCommerceFlags(event),
    event,
    cartTotal: orderTotal(order.total) ?? detail.cartTotal,
    orderId: orderIdOf(order) || detail.orderId,
    purchasedAt: purchasedAt || detail.purchasedAt,
    tickets: holder
      ? detail.tickets.map((ticket) => ({ ...ticket, holder }))
      : detail.tickets,
  };
}

export function formatCartOrderTotal(total?: number) {
  return total != null ? formatCurrency(total) : "—";
}
