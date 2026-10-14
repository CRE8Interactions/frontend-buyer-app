import { SEAT_VIEW_PLACEHOLDER } from "@/stores/seatmapStore";

export { SEAT_VIEW_PLACEHOLDER };

/** Blue ticket tile used for a GA-only event that has no seatmap. */
export const GA_TICKET_PLACEHOLDER = "/placeholder-ga.png";

type SeatLocationSource = {
  ga_only?: boolean;
  mapping?: unknown;
} | null;

function ticketsAreGa(tickets: Array<Record<string, unknown>> | undefined) {
  const rows = tickets ?? [];
  return (
    rows.length > 0 &&
    rows.every((ticket) => Boolean(ticket.generalAdmission || ticket.GA))
  );
}

/** Event flags that mean the whole show is general admission, with no seatmap. */
export function eventIsExplicitlyGaOnly(event?: Record<string, unknown> | null) {
  const seatmap = event?.seatmap as { ga_only?: boolean } | undefined;
  const venue = event?.venue as { isGeneralAdmissionOnly?: boolean } | undefined;
  return Boolean(
    event?.isGeneralAdmissionOnly ||
      event?.generalAdmissionOnly ||
      seatmap?.ga_only ||
      venue?.isGeneralAdmissionOnly,
  );
}

/**
 * A GA hold on an event that is not GA-only may still have a section on the
 * venue seatmap. Load that map before deciding the checkout thumbnail.
 */
export function cartNeedsSeatLocation(
  tickets: Array<Record<string, unknown>> | undefined,
  event?: Record<string, unknown> | null,
) {
  return ticketsAreGa(tickets) && !eventIsExplicitlyGaOnly(event);
}

/**
 * Ticket icon for a GA-only show. A GA section on a seatmap shows its location
 * instead. Live GA-only carts often omit the flag, so GA tickets with no
 * loaded map still use the icon.
 */
export function cartShowsGaTicketIcon(
  tickets: Array<Record<string, unknown>> | undefined,
  event?: Record<string, unknown> | null,
  seatmap?: SeatLocationSource,
) {
  const rows = tickets ?? [];
  if (!rows.length) return false;
  if (!ticketsAreGa(rows)) return false;
  if (eventIsExplicitlyGaOnly(event) || seatmap?.ga_only) return true;
  const eventSeatmap = event?.seatmap as { ga_only?: boolean } | undefined;
  if (eventSeatmap && eventSeatmap.ga_only === false) return false;
  if (seatmap?.mapping) return false;
  return true;
}

/**
 * GA section on a seated event. The checkout heading stays the section line
 * and the subtitle is the ticket count plus unreserved seating. GA-only
 * events keep the section name and offer subtitle.
 */
export function showsSeatedGaTicketCount(
  tickets: Array<Record<string, unknown>> | undefined,
  event?: Record<string, unknown> | null,
  seatmap?: SeatLocationSource,
) {
  return (
    cartNeedsSeatLocation(tickets, event) &&
    !cartShowsGaTicketIcon(tickets, event, seatmap)
  );
}

/**
 * Checkout success counts tickets only for a named GA section on a seated
 * event. GA-only tickets keep a generic "ga" section number even after the
 * ticket-group name (e.g. "GA Floor") is copied onto sectionName, so they
 * keep the offer subtitle.
 */
export function showsNamedGaSectionTicketCount(
  tickets: Array<Record<string, unknown>> | undefined,
  event?: Record<string, unknown> | null,
) {
  if (!cartNeedsSeatLocation(tickets, event)) return false;
  return (tickets ?? []).some((ticket) => {
    const text = String(ticket.sectionNumber ?? ticket.sectionName ?? "").trim();
    return (
      text.length > 0 &&
      text.toUpperCase() !== "GA" &&
      !/^general\s+admission$/i.test(text)
    );
  });
}

/** Section label a seat-location thumbnail can match on the venue map. */
export function seatLocationSection(ticket?: Record<string, unknown> | null) {
  const number = String(ticket?.sectionNumber ?? "").trim();
  const name = String(ticket?.sectionName ?? "").trim();
  const generic = (value: string) => value.toUpperCase() === "GA";
  const sectionNumber =
    (number && !generic(number) ? number : "") ||
    (name && !generic(name) ? name : "") ||
    number ||
    name;
  return {
    sectionId:
      ticket?.sectionId != null && String(ticket.sectionId) !== ""
        ? String(ticket.sectionId)
        : undefined,
    sectionNumber,
  };
}

export type SeatViewImageType = "thumbnail" | "highlights" | "seat-view";

const DEFAULT_BUCKET =
  "https://blocktickets.nyc3.cdn.digitaloceanspaces.com";

/** Normalize section labels into CDN filename candidates. */
export function sectionImageIdentifiers(
  sectionNumber?: string | number | null,
  sectionName?: string | number | null,
): string[] {
  const raw = [sectionNumber, sectionName]
    .filter((value) => value != null && String(value).trim() !== "")
    .map((value) => String(value).trim().toLowerCase());

  return [
    ...new Set(
      raw.flatMap((value) => [
        value,
        value.replace(/^sec(?:tion)?\s*/i, ""),
        value.replace(/\s+/g, "_"),
        value.replace(/\s+/g, ""),
        value.replace(/[^a-z0-9]/g, ""),
      ]),
    ),
  ].filter(Boolean);
}

export function getSeatViewImageUrl(
  venueSlug: string,
  sectionIdentifier: string,
  type: SeatViewImageType = "highlights",
  bucket = DEFAULT_BUCKET,
) {
  return `${bucket}/venues/${venueSlug}/${type}/${sectionIdentifier}.png`;
}

/** Ordered fallback URLs for listing thumbs / checkout images. */
export function getSeatViewImageCandidates(
  venueSlug: string | null | undefined,
  sectionNumber?: string | number | null,
  sectionName?: string | number | null,
  types: SeatViewImageType[] = ["thumbnail", "seat-view", "highlights"],
  bucket = DEFAULT_BUCKET,
): string[] {
  if (!venueSlug) return [];
  const identifiers = sectionImageIdentifiers(sectionNumber, sectionName);
  return identifiers.flatMap((id) =>
    types.map((type) => getSeatViewImageUrl(venueSlug, id, type, bucket)),
  );
}

/** Highlights + seat-view slides for the "Your view" modal. */
export function getSeatViewSlides(
  venueSlug: string | null | undefined,
  sectionNumber?: string | number | null,
  sectionName?: string | number | null,
  bucket = DEFAULT_BUCKET,
): Array<{ type: SeatViewImageType; urls: string[]; alt: string }> {
  if (!venueSlug) return [];
  const identifiers = sectionImageIdentifiers(sectionNumber, sectionName);
  if (identifiers.length === 0) return [];

  return [
    {
      type: "highlights",
      urls: identifiers.map((id) =>
        getSeatViewImageUrl(venueSlug, id, "highlights", bucket),
      ),
      alt: "Seat position for this section",
    },
    {
      type: "seat-view",
      urls: [
        ...identifiers.map((id) =>
          getSeatViewImageUrl(venueSlug, id, "seat-view", bucket),
        ),
        SEAT_VIEW_PLACEHOLDER,
      ],
      alt: "Seat view for this ticket",
    },
  ];
}
