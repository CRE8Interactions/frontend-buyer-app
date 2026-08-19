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
  total?: number;
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
  checkInCode?: string;
  sectionNumber?: string | number;
  rowNumber?: string | number;
  seatNumber?: string | number;
  generalAdmission?: boolean;
  artwork?: ApiImage;
  backgroundColor?: string;
  fontColor?: string;
  events?: EventLike[];
  [key: string]: unknown;
};

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
