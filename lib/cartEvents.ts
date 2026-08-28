import {
  eventDoorsIso,
  formatCurrency,
  formatDoorsTime,
  formatEventWhen,
  imageUrl,
  type ApiImage,
} from "@/lib/helpers";
import {
  formatVenueCityState,
  formatVenueLocationLine,
} from "@/lib/venueLocation";
import {
  isToday,
  isUpcomingEvent,
  type OrderLike,
  type TicketLike,
} from "@/lib/wallet";
import { walletSectionHref } from "@/lib/walletNav";

type VenueLike = {
  name?: string;
  timezone?: string;
  address?: { city?: string; state?: string; line1?: string }[];
};

type EventLike = {
  uuid?: string;
  name?: string;
  start?: string;
  doorsOpen?: string;
  realDoorsOpen?: string;
  summary?: string;
  venue?: VenueLike;
  image?: ApiImage;
  organization?: { name?: string };
  attractions?: { name?: string; primary?: boolean; artwork?: ApiImage }[];
  enableTransfers?: boolean;
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
  total?: number;
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
  availability: "available" | "past" | "transferred";
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
};

export type CartTicketDetail = {
  id?: number | string;
  seat: string;
  holder: string;
  code: string;
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
  tickets: CartTicketDetail[];
  cartId: string;
  cartTotal?: number;
  orderId?: string;
  orderRecordId?: number | string;
  purchasedAt?: string;
  eventUUID?: string;
  event: EventLike;
  transfersEnabled: boolean;
  availability: CartEventSummary["availability"];
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

function formatCartVenueLine(venue?: VenueLike | null, orgName?: string) {
  const line = formatVenueLocationLine(venue?.name, venue?.address);
  if (line) return line;
  if (venue?.name) return venue.name;
  return orgName || "";
}

function formatDoors(ev?: EventLike | null) {
  return formatDoorsTime(eventDoorsIso(ev), ev?.venue?.timezone);
}

function ticketSeatLabel(t: Record<string, unknown>) {
  if (t.generalAdmission) {
    return String(t.sectionName || t.offerName || "General admission");
  }
  const sec = t.sectionName || t.sectionNumber;
  const row = t.rowNumber;
  const seat = t.seatNumber;
  if (sec != null && row != null && seat != null) {
    return `Sec ${sec} · Row ${row} · Seat ${seat}`;
  }
  return String(t.offerName || t.sectionName || "Ticket");
}

function holderName(email: string) {
  const local = email.split("@")[0]?.trim();
  return local || email;
}

function eventInitials(name?: string) {
  if (!name) return "EVENT";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 8).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function buildAttractionCards(
  ev?: EventLike | null,
  packageName?: string,
): AttractionCard[] {
  const raw = ev?.attractions ?? [];
  if (raw.length >= 2) {
    const sorted = [...raw].sort((a, b) => {
      if (a.primary && !b.primary) return -1;
      if (!a.primary && b.primary) return 1;
      return 0;
    });
    return sorted.map((a, i) => ({
      name: a.name || `Guest ${i + 1}`,
      role: i === 0 ? "Home" : i === 1 ? "Visitor" : "Guest",
      logo: a.artwork ? imageUrl(a.artwork, "") : undefined,
      brand: i === 0 ? "#8c0b42" : i === 1 ? "#0d3b2e" : "#1b1e26",
      initials: eventInitials(a.name),
    }));
  }
  if (raw.length === 1) {
    return [
      {
        name: raw[0].name || ev?.name || "Event",
        role: "Featured",
        logo: raw[0].artwork ? imageUrl(raw[0].artwork, "") : undefined,
        brand: "#8c0b42",
        initials: eventInitials(raw[0].name || ev?.name),
      },
    ];
  }
  const fallbackName =
    ev?.organization?.name || packageName || ev?.name || "Event";
  const fallbackImage = imageUrl(ev?.image, "");
  if (fallbackName) {
    return [
      {
        name: fallbackName,
        role: "Featured",
        logo: fallbackImage || undefined,
        brand: "#8c0b42",
        initials: eventInitials(fallbackName),
      },
    ];
  }
  return [];
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
      brand: "#0d3b2e",
      logo: visitorLogo || undefined,
    },
  ];
}

function mapEventTickets(
  tickets: Array<Record<string, unknown>>,
  holderEmail: string,
): CartTicketDetail[] {
  return tickets.map((t, i) => ({
    id:
      typeof t.id === "number" || typeof t.id === "string"
        ? t.id
        : typeof t.uuid === "string"
          ? t.uuid
          : undefined,
    seat: ticketSeatLabel(t),
    holder: holderName(holderEmail),
    code: String(t.checkInCode || t.uuid || `CART-${i + 1}`),
  }));
}

const TRANSFERRED_TICKET_STATUSES = new Set([
  "accepted",
  "assigned",
  "complete",
  "completed",
  "pending",
  "pending_transfer",
  "transfer_pending",
  "transferred",
]);

function normalizedStatus(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function activeTransferRelation(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(activeTransferRelation);
  if (!value || typeof value !== "object") return false;
  const row = value as {
    id?: unknown;
    status?: unknown;
    attributes?: unknown;
    data?: unknown;
  };
  if ("data" in row) return activeTransferRelation(row.data);
  if (row.attributes) return activeTransferRelation(row.attributes);
  const status = normalizedStatus(row.status);
  if (status === "cancelled" || status === "canceled" || status === "rejected") {
    return false;
  }
  return status
    ? TRANSFERRED_TICKET_STATUSES.has(status)
    : row.id != null;
}

/** Ticket transfer payloads differ between API versions, so accept each known shape. */
export function isTransferredTicket(ticket?: TicketLike | null): boolean {
  if (!ticket) return false;
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
    directStatuses.some((status) =>
      TRANSFERRED_TICKET_STATUSES.has(normalizedStatus(status)),
    )
  ) {
    return true;
  }
  if (
    ["assigned", "pending_transfer", "transfer_pending", "transferred"].includes(
      normalizedStatus(ticket.on_sale_status),
    )
  ) {
    return true;
  }

  return activeTransferRelation(
    ticket.ticketTransfer ||
    ticket.ticket_transfer ||
    ticket.ticketTransfers ||
    ticket.ticket_transfers ||
    ticket.transfer,
  );
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
  holderEmail: string,
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
    tickets: mapEventTickets(tickets, holderEmail),
    cartId,
    cartTotal,
    eventUUID: String(ev.uuid || "").trim() || undefined,
    event: ev,
    transfersEnabled: ev.enableTransfers !== false,
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
  const total =
    typeof cart.total === "number" ? cart.total : undefined;
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
      holderEmail,
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
          holder: holderName(holderEmail),
          code: `FLEX-${i + 1}`,
        }),
      ),
      cartId: id,
      cartTotal: total,
      event: {},
      transfersEnabled: false,
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
        holderEmail,
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
        holderEmail,
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
      holderEmail,
      "Tickets",
    );
  }

  return out;
}

export function summarizeEventDetails(
  details: Record<string, CartEventDetail>,
): CartEventSummary[] {
  return Object.values(details).map((d) => ({
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
    availability: d.availability,
  }));
}

function firstRouteParam(value?: string | string[] | null) {
  const raw = Array.isArray(value) ? value[0] : value;
  const uuid = String(raw || "").trim();
  return uuid || undefined;
}

/** Wallet ticket detail for a purchased event. */
export function walletEventTicketsPath(eventUUID?: string | null) {
  const uuid = String(eventUUID || "").trim();
  return uuid ? `${walletSectionHref("events")}event/${uuid}/` : "";
}

/** Wallet detail for an access pass owned by the shopper. */
export function walletAccessPassPath(accessPassUUID?: string | null) {
  const uuid = String(accessPassUUID || "").trim();
  return uuid
    ? `${walletSectionHref("events")}access-pass/${uuid}/`
    : "";
}

/** Wallet package detail for a purchased season package. */
export function walletPackagePath(packageUUID?: string | null) {
  const uuid = String(packageUUID || "").trim();
  return uuid ? `${walletSectionHref("events")}package/${uuid}/` : "";
}

/** Wallet event detail nested under a season package. */
export function walletPackageEventPath(
  packageUUID?: string | null,
  eventUUID?: string | null,
) {
  const pkg = String(packageUUID || "").trim();
  const event = String(eventUUID || "").trim();
  return pkg && event
    ? `${walletSectionHref("events")}package/${pkg}/event/${event}/`
    : "";
}

/** Wallet flex-pack detail for a purchased pack. */
export function walletFlexPackPath(flexPackUUID?: string | null) {
  const uuid = String(flexPackUUID || "").trim();
  return uuid ? `${walletSectionHref("events")}flex-pack/${uuid}/` : "";
}

/** Event, package, flex-pack, or access-pass UUID from a wallet detail URL. */
export function walletRouteFromPath(
  pathname = "",
  params?: {
    eventUUID?: string | string[];
    flexPackUUID?: string | string[];
    packageUUID?: string | string[];
    accessPassUUID?: string | string[];
  },
): {
  eventUUID?: string;
  flexPackUUID?: string;
  packageUUID?: string;
  accessPassUUID?: string;
} {
  const path = (pathname.split("?")[0] || "").replace(/\/+$/, "") || "/";
  const packageEvent = path.match(
    /^\/wallet\/(?:my-tickets\/)?package\/([^/]+)\/event\/([^/]+)$/,
  );
  const packageUUID =
    packageEvent?.[1] ||
    path.match(/^\/wallet\/(?:my-tickets\/)?package\/([^/]+)$/)?.[1] ||
    firstRouteParam(params?.packageUUID);
  const eventUUID =
    packageEvent?.[2] ||
    path.match(/^\/wallet\/my-tickets\/event\/([^/]+)$/)?.[1] ||
    firstRouteParam(params?.eventUUID);
  const flexPackUUID =
    path.match(/^\/wallet\/my-tickets\/flex-pack\/([^/]+)$/)?.[1] ||
    firstRouteParam(params?.flexPackUUID);
  const accessPassUUID =
    path.match(/^\/wallet\/my-tickets\/access-pass\/([^/]+)$/)?.[1] ||
    firstRouteParam(params?.accessPassUUID);
  return {
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
  if (!tickets.length || (!includeUnavailable && !isUpcomingEvent(ev))) return;
  const orderId = orderIdOf(order);
  const total = typeof order.total === "number" ? order.total : undefined;
  const purchasedAt = order.createdAt
    ? formatEventWhen(
        order.createdAt,
        order.timezone || order.event?.venue?.timezone || order.package?.venue?.timezone,
        "ddd, MMM D · h:mm A",
      )
    : "";
  out[key] = {
    ...detailFromEvent(
      ev,
      key,
      tickets as Array<Record<string, unknown>>,
      orderId,
      total,
      holderEmail,
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
      if (!tickets.length) continue;
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
    out.push({
      key: packageUUID || orderId || `package-${out.length + 1}`,
      orderId,
      name: pkg.name || "Season tickets",
      venueLine: formatCartVenueLine(pkg.venue, pkg.organization?.name),
      eventCount: (pkg.events ?? []).filter((ev) => isUpcomingEvent(ev)).length,
      ticketCount: uniqueSeatCount(tickets) || tickets.length,
      thumb: pkg.image ? imageUrl(pkg.image, "") : undefined,
      packageUUID,
    });
  }

  return out;
}

export function countSeasonPackages(orders: OrderLike[]): number {
  return buildSeasonPackageSummaries(orders).length;
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
      const key = pack
        ? String(pack.uuid ?? pack.id ?? orderKey)
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
        key: flexPackUUID || orderKey,
        name: pack?.name || "Flex pack",
        venueLine: formatCartVenueLine(pack?.venue, pack?.organization?.name),
        voucherCount: codes.length,
        remainingCount: codes.filter((voucher) => voucher.status === "Active").length,
        thumb: pack?.image ? imageUrl(pack.image, "") : undefined,
        codes,
        flexPackUUID,
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

export function formatCartOrderTotal(total?: number) {
  return total != null ? formatCurrency(total) : "—";
}
