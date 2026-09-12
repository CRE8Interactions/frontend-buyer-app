import moment from "moment-timezone";
import type { BrandingOrganization, OrgBranding } from "@/lib/branding";
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
  organization?:
    | (BrandingOrganization & {
        email_logo?: ApiImage;
        category?: { name?: string };
      })
    | null;
  branding?: OrgBranding | null;
  category?: { name?: string };
  categoryName?: string;
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

/**
 * Fan-visible access passes returned by GET /events/myAccessPasses.
 * Package screens pass `includeInactive` so a revoked or expired season pass
 * still shows with its real status instead of disappearing.
 */
export function buildAccessPassSummaries(
  passes: AccessPassLike[],
  { includeInactive = false }: { includeInactive?: boolean } = {},
): AccessPassSummary[] {
  return passes
    .filter(
      (pass) => includeInactive || !pass.status || pass.status === "active",
    )
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
        attendedCount: events.filter((event) => isEventComplete(event)).length,
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
            (event) => isWalletListedEvent(event),
          ) || events.find((event) => !isEventComplete(event)),
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

export function isGenericGeneralAdmissionLabel(value: unknown): boolean {
  return /^general\s+admission$/i.test(String(value ?? "").trim());
}

/** Prefer concrete section/row values over generic GA placeholder labels. */
export function ticketFieldValue(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (text && !isGenericGeneralAdmissionLabel(text)) return text;
  }
  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (text) return text;
  }
  return "";
}

export function ticketSectionValue(
  ticket?: TicketLike | Record<string, unknown> | null,
): string {
  if (!ticket) return "";
  for (const candidate of [
    ticket.sectionNumber,
    ticket.sectionName,
    ticket.section_number,
    ticket.section_name,
  ]) {
    const text = String(candidate ?? "").trim();
    if (text && !isGenericGeneralAdmissionLabel(text)) return text;
  }
  return "";
}

export function ticketRowValue(
  ticket?: TicketLike | Record<string, unknown> | null,
): string {
  if (!ticket) return "";
  for (const candidate of [
    ticket.rowNumber,
    ticket.rowName,
    ticket.row_number,
    ticket.row_name,
  ]) {
    const text = String(candidate ?? "").trim();
    if (text && !isGenericGeneralAdmissionLabel(text)) return text;
  }
  return "";
}

/** Actual seat number/name only — never invent GA for general admission tickets. */
export function ticketSeatValue(
  ticket?: TicketLike | Record<string, unknown> | null,
): string {
  if (!ticket) return "";
  for (const candidate of [
    ticket.seatNumber,
    ticket.seat_number,
    ticket.seatName,
    ticket.seat_name,
  ]) {
    const text = String(candidate ?? "").trim();
    if (text && !/^GA$/i.test(text) && !isGenericGeneralAdmissionLabel(text)) {
      return text;
    }
  }
  return "";
}

export function gaTicketSeatLine(
  ticket?: TicketLike | Record<string, unknown> | null,
): string {
  const sec = ticketSectionValue(ticket);
  const row = ticketRowValue(ticket);
  const seat = ticketSeatValue(ticket);
  const parts: string[] = [];
  if (sec) parts.push(`Sec ${sec}`);
  if (row) parts.push(`Row ${row}`);
  if (seat) parts.push(`Seat ${seat}`);
  if (!parts.length) return "GA";
  return parts.join(" · ");
}

function seatTokenFromSeatLine(seatLine: string): string {
  const seatMatch = seatLine.match(/Seat\s+([^·]+)/i);
  if (seatMatch?.[1]) return seatMatch[1].trim();
  const parts = seatLine
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  const last = parts[parts.length - 1] ?? seatLine.trim();
  if (/^GA$/i.test(last) || isGenericGeneralAdmissionLabel(last)) return "GA";
  if (parts.length === 1) return parts[0];
  return last;
}

/** GA wallet lines like "Sec ga" or "GA" without row/seat parts. */
function isGaSeatLine(seatLine?: string | null): boolean {
  const normalized = String(seatLine ?? "").trim();
  if (!normalized) return false;
  if (/^GA$/i.test(normalized) || isGenericGeneralAdmissionLabel(normalized)) {
    return true;
  }
  return (
    /^Sec\s+.+/i.test(normalized) &&
    !/\bRow\b/i.test(normalized) &&
    !/\bSeat\b/i.test(normalized)
  );
}

export function seatLabel(ticket?: TicketLike | null): string {
  if (!ticket) return "Ticket";
  if (ticket.generalAdmission || ticket.GA) {
    return gaTicketSeatLine(ticket);
  }
  return [
    ticket.sectionNumber != null ? `Sec ${ticket.sectionNumber}` : null,
    ticket.rowNumber != null ? `Row ${ticket.rowNumber}` : null,
    ticket.seatNumber != null ? `Seat ${ticket.seatNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Collapse seat numbers: `6-10` consecutive, `6, 10, 11` otherwise. */
export function formatSeatNumberRanges(
  seats: Array<string | number>,
): string {
  const unique = [
    ...new Set(
      seats.map((seat) => String(seat).trim()).filter(Boolean),
    ),
  ];
  const nums = unique
    .map((seat) => Number(seat))
    .filter((seat) => Number.isFinite(seat));
  if (nums.length !== unique.length) {
    return unique.join(", ");
  }

  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  if (sorted.length === 1) return String(sorted[0]);

  const parts: string[] = [];
  let start = sorted[0]!;
  let end = start;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] === end + 1) {
      end = sorted[i]!;
      continue;
    }
    parts.push(start === end ? String(start) : `${start}-${end}`);
    start = end = sorted[i]!;
  }
  parts.push(start === end ? String(start) : `${start}-${end}`);
  return parts.join(", ");
}

function formatRowSeatsLabel(seats: Array<string | number>): string {
  const cleaned = seats
    .map((seat) => String(seat ?? "").trim())
    .filter((seat) => seat && seat !== "undefined");
  const ranges = formatSeatNumberRanges(cleaned);
  if (!ranges) return "";
  const multi =
    seats.length > 1 || ranges.includes(",") || ranges.includes("-");
  return multi ? `Seats ${ranges}` : `Seat ${ranges}`;
}

type SectionSeatGroup = {
  sectionDisplay: string;
  isGA: boolean;
  rows: Map<string, Array<string | number>>;
  bareGA: boolean;
  tickets: Array<TicketLike | Record<string, unknown>>;
};

function sectionGroupKey(ticket: TicketLike | Record<string, unknown>) {
  const section = transferGroupSectionValue(ticket);
  return (section || "GA").trim().toLowerCase();
}

/** One line per section; multiple rows on the same line; GA shows Sec only unless row/seat exist. */
export function groupedWalletSeatLines(
  tickets: Array<TicketLike | Record<string, unknown>>,
): string[] {
  if (!tickets.length) return [];

  const groups = new Map<string, SectionSeatGroup>();

  for (const ticket of tickets) {
    const isGA = isTransferGroupGeneralAdmission(ticket);
    const section = transferGroupSectionValue(ticket);
    const key = sectionGroupKey(ticket);
    if (!groups.has(key)) {
      groups.set(key, {
        sectionDisplay: section || "GA",
        isGA,
        rows: new Map(),
        bareGA: false,
        tickets: [],
      });
    }
    const group = groups.get(key)!;
    group.isGA = group.isGA && isGA;
    group.tickets.push(ticket);

    const row = ticketRowValue(ticket);
    const seatRaw = ticketSeatValue(ticket);
    const seat =
      seatRaw && seatRaw !== "undefined" && seatRaw !== "null" ? seatRaw : "";
    if (isGA && !row && !seat) {
      group.bareGA = true;
      continue;
    }

    const rowKey = String(row || "—");
    if (!group.rows.has(rowKey)) group.rows.set(rowKey, []);
    if (seat) group.rows.get(rowKey)!.push(seat);
  }

  const lines: string[] = [];
  for (const group of groups.values()) {
    if (group.isGA) {
      if (group.tickets.length === 1) {
        lines.push(gaTicketSeatLine(group.tickets[0]));
        continue;
      }
      const seats = group.tickets
        .map((ticket) => ticketSeatValue(ticket))
        .filter(Boolean);
      const base = gaTicketSeatLine({
        ...group.tickets[0],
        seatNumber: undefined,
        seat_number: undefined,
        seatName: undefined,
        seat_name: undefined,
      });
      if (seats.length) {
        const seatLabelPart = formatRowSeatsLabel(seats);
        lines.push(seatLabelPart ? `${base} · ${seatLabelPart}` : base);
      } else {
        lines.push(base);
      }
      continue;
    }

    if (group.bareGA && group.rows.size === 0) {
      lines.push(
        group.sectionDisplay && group.sectionDisplay !== "GA"
          ? `Sec ${group.sectionDisplay}`
          : "GA",
      );
      continue;
    }

    const rowParts: string[] = [];
    for (const [row, seats] of group.rows) {
      const seatLabelPart = formatRowSeatsLabel(seats);
      if (row !== "—") {
        rowParts.push(
          seatLabelPart ? `Row ${row} · ${seatLabelPart}` : `Row ${row}`,
        );
      } else if (seatLabelPart) {
        rowParts.push(seatLabelPart);
      }
    }

    if (rowParts.length) {
      lines.push(
        `Sec ${group.sectionDisplay} · ${rowParts.join(" · ")}`,
      );
    } else if (group.bareGA) {
      lines.push(
        group.sectionDisplay && group.sectionDisplay !== "GA"
          ? `Sec ${group.sectionDisplay}`
          : "GA",
      );
    }
  }

  return lines;
}

/** Pass validity window for transfer cards. */
export function formatPassDateRange(
  start?: string,
  end?: string,
  timezone?: string,
): string {
  const startLabel = start
    ? formatEventWhen(start, timezone, "MMM D, YYYY")
    : "";
  const endLabel = end ? formatEventWhen(end, timezone, "MMM D, YYYY") : "";
  if (startLabel && endLabel && startLabel !== endLabel) {
    return `${startLabel} – ${endLabel}`;
  }
  return startLabel || endLabel || "";
}

/** Whether a ticket was scanned at the gate (Blocktickets scan payloads vary). */
export function isScannedTicket(
  ticket?: TicketLike | Record<string, unknown> | null,
): boolean {
  if (!ticket) return false;
  if (ticket.scanned === true || ticket.checkedIn === true) return true;
  const status = String(
    ticket.status || ticket.checkInStatus || ticket.on_sale_status || "",
  )
    .trim()
    .toLowerCase();
  return (
    status === "scanned" ||
    status === "checked_in" ||
    status === "checked-in" ||
    status === "redeemed" ||
    status === "used"
  );
}

function transferGroupSectionValue(
  ticket: TicketLike | Record<string, unknown>,
): string {
  const fromFields = ticketSectionValue(ticket);
  if (fromFields) return fromFields;
  for (const candidate of [
    ticket.sectionNumber,
    ticket.section_number,
    ticket.sectionName,
    ticket.section_name,
  ]) {
    const text = String(candidate ?? "").trim();
    if (text && !isGenericGeneralAdmissionLabel(text)) return text;
  }
  return "";
}

function isTransferGroupGeneralAdmission(
  ticket: TicketLike | Record<string, unknown>,
): boolean {
  if (ticket.generalAdmission || ticket.GA) return true;
  if (ticketRowValue(ticket) || ticketSeatValue(ticket)) return false;
  const section = transferGroupSectionValue(ticket);
  if (/^ga$/i.test(section)) return true;
  return [
    ticket.offerName,
    ticket.offer_name,
    ticket.sectionName,
    ticket.section_name,
  ].some((candidate) => isGenericGeneralAdmissionLabel(candidate));
}

/** Transfer modal group label: Sec/Row for reserved seats; Sec only for GA. */
export function transferGroupLabel(
  ticket?: TicketLike | Record<string, unknown> | null,
): string {
  if (!ticket) return "";
  const section = transferGroupSectionValue(ticket);
  const row = ticketRowValue(ticket);
  const isGA = isTransferGroupGeneralAdmission(ticket);

  if (isGA) {
    return section ? `Sec ${section}` : "Sec";
  }

  const parts: string[] = [];
  if (section) parts.push(`Sec ${section}`);
  if (row) parts.push(`Row ${row}`);
  return parts.join(" · ");
}

/** Transfer modal seat chip: GA tickets show "GA" with no "Seat" prefix. */
export function transferSeatChip(
  ticket?: TicketLike | null,
  seatLine?: string,
): { seatNo: string; isGA: boolean; ariaLabel: string } {
  const actualSeat = ticketSeatValue(ticket);
  const parsed =
    seatLine != null
      ? seatTokenFromSeatLine(seatLine)
      : actualSeat || "—";
  const isGA =
    Boolean(ticket?.generalAdmission || ticket?.GA) ||
    isGaSeatLine(seatLine) ||
    /^GA$/i.test(parsed) ||
    isGenericGeneralAdmissionLabel(parsed) ||
    (ticket?.seatNumber != null &&
      isGenericGeneralAdmissionLabel(String(ticket.seatNumber).trim()));
  const seatNo = isGA
    ? actualSeat || "GA"
    : actualSeat || parsed || "—";
  return {
    seatNo,
    isGA,
    ariaLabel: isGA ? (actualSeat || "GA") : `Seat ${seatNo}`,
  };
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

function eventStatusValue(event?: EventLike | null) {
  if (!event) return "";
  const status = event.status;
  if (typeof status === "string") return status.trim().toLowerCase();
  if (status && typeof status === "object" && "name" in status) {
    return String((status as { name?: string }).name || "")
      .trim()
      .toLowerCase();
  }
  return "";
}

/** Blocktickets drops completed games from wallet lists once the API marks them. */
export function isEventComplete(event?: EventLike | null) {
  const status = eventStatusValue(event);
  return status === "complete" || status === "completed";
}

/** Wallet lists only include games that have not ended yet (venue-local time). */
export function isUpcomingEvent(event?: EventLike | null) {
  if (!event || isEventComplete(event)) return false;
  if (!event.start) return true;
  const tz = toIanaTimezone(event.venue?.timezone);
  const start = tz ? moment.tz(event.start, tz) : moment(event.start);
  const cutoff = tz
    ? moment.tz(tz).subtract(6, "hours")
    : moment().subtract(6, "hours");
  return start.isAfter(cutoff);
}

/** Wallet my-tickets rows match Blocktickets: status is not complete and still upcoming. */
export function isWalletListedEvent(event?: EventLike | null) {
  return isUpcomingEvent(event);
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

/** iPads and Android tablets lack Apple/Google Wallet on device. */
export function isTabletDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;

  if (/iPad/i.test(ua)) return true;
  // iPadOS 13+ can report as Mac with touch.
  if (/Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return true;

  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) {
    const hints = (
      navigator as Navigator & { userAgentData?: { mobile?: boolean } }
    ).userAgentData;
    if (hints?.mobile) return false;
    return true;
  }

  // DevTools tablet presets can keep a desktop UA while emulating touch.
  if (/iPhone|iPod/i.test(ua)) return false;
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return false;
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const hover = window.matchMedia("(hover: hover)").matches;
    const minSide = Math.min(window.innerWidth, window.innerHeight);
    if (coarse && !hover && minSide >= 600) return true;
  }

  return false;
}

/** Phones that can hold a scannable Apple or Google Wallet pass. */
export function isPhoneDevice() {
  if (typeof navigator === "undefined") return false;
  if (isTabletDevice()) return false;

  const ua = navigator.userAgent;
  if (/iPhone|iPod/i.test(ua)) return true;

  if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua)) return true;
    const hints = (
      navigator as Navigator & { userAgentData?: { mobile?: boolean } }
    ).userAgentData;
    if (hints?.mobile) return true;
  }

  return false;
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
