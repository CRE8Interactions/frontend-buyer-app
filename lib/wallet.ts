import moment from "moment-timezone";
import {
  dateChip,
  formatEventWhen,
  imageUrl,
  toIanaTimezone,
  type ApiImage,
} from "@/lib/helpers";

export type VenueLike = {
  name?: string;
  timezone?: string;
  image?: ApiImage | ApiImage[];
  address?: { city?: string; state?: string }[];
};

export type EventLike = {
  uuid?: string;
  name?: string;
  start?: string;
  end?: string;
  status?: string;
  doorsOpen?: string;
  realDoorsOpen?: string;
  display_start_time?: boolean;
  image?: ApiImage;
  venue?: VenueLike;
  enableTransfers?: boolean;
  enableResale?: boolean;
  organization?: { name?: string; uuid?: string };
  attractions?: { name?: string; artwork?: ApiImage }[];
  summary?: string;
};

export type TicketLike = {
  id?: number | string;
  uuid?: string;
  checkInCode?: string;
  sectionNumber?: string | number;
  rowNumber?: string | number;
  seatNumber?: string | number;
  generalAdmission?: boolean;
  eventId?: string;
  eventUUID?: string;
  cost?: number;
  on_sale_status?: string;
  [key: string]: unknown;
};

export type OrderLike = {
  id?: number | string;
  orderId?: string;
  uuid?: string;
  createdAt?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  total?: number | string;
  /** Purchase origin; wallet inventory is intentionally not filtered by it. */
  source?: "website" | "box_office" | "ticket_assignment" | string;
  box_office?: boolean;
  event?: EventLike | null;
  package?: {
    uuid?: string;
    name?: string;
    image?: ApiImage;
    venue?: VenueLike;
    organization?: { name?: string };
    events?: EventLike[];
  } | null;
  tickets?: TicketLike[];
  flex_pack?: {
    uuid?: string;
    id?: number | string;
    name?: string;
    image?: ApiImage;
    organization?: { name?: string };
    venue?: { name?: string };
    start?: string;
    end?: string;
  } | null;
  vouchers?: {
    code?: string;
    status?: string;
    flex_pack?: {
      uuid?: string;
      id?: number | string;
      name?: string;
      image?: ApiImage;
      organization?: { name?: string };
      start?: string;
      end?: string;
    };
  }[];
  timezone?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
};

export type IncomingTransfer = {
  id: number | string;
  event?: EventLike;
  tickets?: TicketLike[];
  status?: string;
  fromUserEmail?: string;
  emailAddressToUser?: string;
};

export type AccessPassLike = {
  uuid?: string;
  name?: string;
  type?: string;
  status?: string;
  checkInCode?: string;
  sectionNumber?: string | number;
  rowNumber?: string | number;
  seatNumber?: string | number;
  generalAdmission?: boolean;
  artwork?: ApiImage;
  backgroundColor?: string;
  fontColor?: string;
  primaryColor?: string;
  orderId?: string;
  order?: { orderId?: string };
  events?: EventLike[];
  [key: string]: unknown;
};

function accessPassOrderId(pass: AccessPassLike) {
  const nested =
    pass.order && typeof pass.order === "object"
      ? String(pass.order.orderId || "").trim()
      : "";
  return String(pass.orderId || "").trim() || nested || undefined;
}

export type AccessPassSummary = {
  key: string;
  /** The pass as the API returned it, for wallet-pass payloads. */
  pass: AccessPassLike;
  accessPassUUID?: string;
  orderId?: string;
  name: string;
  typeLabel: string;
  checkInCode: string;
  seat: string;
  eventCount: number;
  attendedCount: number;
  season: string;
  status: string;
  validThrough: string;
  events: EventLike[];
  nextEvent?: EventLike;
  artwork?: string;
  backgroundColor?: string;
  fontColor?: string;
};

/** Fan-visible access passes returned by GET /events/myAccessPasses. */
export function buildAccessPassSummaries(
  passes: AccessPassLike[],
): AccessPassSummary[] {
  return passes
    .filter((pass) => !pass.status || pass.status === "active")
    .map((pass, index) => {
      const events = [...(pass.events ?? [])].sort((a, b) =>
        String(a.start || "").localeCompare(String(b.start || "")),
      );
      return {
        key: String(pass.uuid || pass.checkInCode || `access-pass-${index + 1}`),
        pass,
        accessPassUUID: String(pass.uuid || "").trim() || undefined,
        orderId: accessPassOrderId(pass),
        name: pass.name || "Access pass",
        typeLabel: pass.type === "organizer" ? "All-access pass" : "Season pass",
        checkInCode: String(pass.checkInCode || ""),
        seat: seatLabel(pass),
        eventCount: events.length,
        attendedCount: events.filter((event) => event.status === "complete").length,
        season: events[0]?.start ? moment(events[0].start).format("YYYY") : "",
        status: pass.status
          ? `${pass.status.charAt(0).toUpperCase()}${pass.status.slice(1)}`
          : "Active",
        validThrough: events.at(-1)?.start
          ? moment(events.at(-1)?.start).format("MMM YYYY")
          : "",
        events,
        nextEvent:
          events.find(
            (event) => event.status !== "complete" && isUpcomingEvent(event),
          ) || events.find((event) => event.status !== "complete"),
        artwork: pass.artwork ? imageUrl(pass.artwork, "") : undefined,
        backgroundColor: pass.backgroundColor || pass.primaryColor,
        fontColor: pass.fontColor,
      };
    });
}

/** Ticket holders read as "Joe Doe"; the email is only a last resort. */
export function formatTicketHolderName(source?: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
} | null): string {
  const full = [source?.firstName, source?.lastName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const named = full || String(source?.name ?? "").trim();
  if (named) {
    return named
      .toLowerCase()
      .replace(/(^|[\s'-])(\p{L})/gu, (_, lead: string, char: string) => lead + char.toUpperCase());
  }
  return String(source?.email ?? "").trim() || "Guest";
}

export function seatLabel(ticket?: TicketLike | null): string {
  if (!ticket) return "Ticket";
  if (ticket.generalAdmission) {
    return ticket.sectionNumber != null ? `GA ${ticket.sectionNumber}` : "GA";
  }
  return [
    ticket.sectionNumber != null ? `Sec ${ticket.sectionNumber}` : null,
    ticket.rowNumber != null ? `Row ${ticket.rowNumber}` : null,
    ticket.seatNumber != null ? `Seat ${ticket.seatNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function eventTimezone(event?: EventLike | null, fallback?: string) {
  return event?.venue?.timezone || fallback || undefined;
}

export function eventWhenLabel(event?: EventLike | null, timezone?: string) {
  if (!event?.start) return "";
  const tz = timezone || eventTimezone(event);
  const format = event.display_start_time === false ? "ddd, MMM D, YYYY" : "ddd, MMM D, YYYY h:mm A";
  return formatEventWhen(event.start, tz, format);
}

export function eventChip(event?: EventLike | null, timezone?: string) {
  return dateChip(event?.start, timezone || eventTimezone(event));
}

export function eventImage(event?: EventLike | null, fallback = "/blocktickets-logo.svg") {
  return imageUrl(event?.image, fallback);
}

export function venueImage(venue?: VenueLike | null, fallback = "/hero-bg-stadium-generic.jpg") {
  const img = Array.isArray(venue?.image) ? venue?.image?.[0] : venue?.image;
  return imageUrl(img as ApiImage, fallback);
}

export function isUpcomingEvent(event?: EventLike | null) {
  if (!event) return false;
  if (event.status === "complete") return false;
  if (!event.start) return true;
  return moment(event.start).isAfter(moment().subtract(6, "hours"));
}

export function isToday(start?: string, timezone?: string) {
  if (!start) return false;
  const tz = toIanaTimezone(timezone);
  const eventDay = tz ? moment.tz(start, tz) : moment(start);
  const today = tz ? moment.tz(tz) : moment();
  return eventDay.isSame(today, "day");
}

export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const obj = payload as { data?: unknown };
    if (Array.isArray(obj.data)) return obj.data as T[];
  }
  return [];
}

/** GET /orders answers with the order itself; some deployments wrap it like a list. */
export function unwrapOrder(payload: unknown): OrderLike | null {
  const [first] = unwrapList<OrderLike>(payload);
  if (first) return first;
  if (payload && typeof payload === "object") {
    const row = payload as { data?: unknown; orderId?: unknown };
    if (row.data && typeof row.data === "object") return row.data as OrderLike;
    if (row.orderId != null) return payload as OrderLike;
  }
  return null;
}

export function strapiAttr<T extends Record<string, unknown>>(item: unknown): T & { id?: number | string } {
  if (!item || typeof item !== "object") return {} as T & { id?: number | string };
  const row = item as { id?: number | string; attributes?: T };
  if (row.attributes) return { id: row.id, ...row.attributes };
  return item as T & { id?: number | string };
}

export function strapiRel<T>(rel: unknown): T | undefined {
  if (!rel || typeof rel !== "object") return undefined;
  const r = rel as { data?: unknown };
  if (r.data == null) return undefined;
  if (Array.isArray(r.data)) return r.data.map((d) => strapiAttr(d)) as unknown as T;
  return strapiAttr(r.data) as T;
}

export async function downloadBlobPass(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}

export function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Phone layouts belong to phones, so they ask the device rather than
 * `window.innerWidth` — a narrow desktop window keeps the desktop layout.
 */
export function isMobileDevice() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const hints = (
    navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  ).userAgentData;
  if (hints?.mobile) return true;
  if (typeof window.matchMedia === "function") {
    // Phones and tablets report a coarse pointer that cannot hover; a
    // touchscreen laptop still reports its mouse, so it stays on desktop.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const hover = window.matchMedia("(hover: hover)").matches;
    if (coarse && !hover) return true;
  }
  const touch = (navigator.maxTouchPoints ?? 0) > 0 || "ontouchstart" in window;
  return touch && (isIos() || isAndroid());
}
