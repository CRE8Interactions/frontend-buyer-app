import { searchEvents } from "@/lib/api";
import type { BrandingOrganization } from "@/lib/branding";
import {
  eventPurchasePath,
  formatEventWhen,
  imageUrl,
  sortByDate,
  type ApiImage,
} from "@/lib/helpers";
import { cacheEventBranding } from "@/lib/orgBrandingCache";

export const SEARCH_DEBOUNCE_MS = 300;
export const SEARCH_MIN_CHARS = 3;
export const SEARCH_SUGGESTION_LIMIT = 3;
export const SEARCH_SPINNER_COLOR = "#3E8BF7";
export const SEARCH_IMAGE_FALLBACK = "/blocktickets-emblem-navy.svg";

export type ShopperSearchEvent = {
  uuid?: string;
  id?: string | number;
  name?: string;
  title?: string;
  slug?: string;
  seoUrl?: string;
  shortCode?: string;
  shortcode?: string;
  start?: string;
  startDate?: string;
  display_start_time?: boolean;
  image?: ApiImage;
  venue?: {
    name?: string;
    timezone?: string;
    isGeneralAdmissionOnly?: boolean;
  };
  seatmap?: { ga_only?: boolean };
  isGeneralAdmissionOnly?: boolean;
  generalAdmissionOnly?: boolean;
  organization?: BrandingOrganization | null;
};

export function searchResultsHref(query: string) {
  return `/search/?query=${encodeURIComponent(query.trim())}`;
}

export function asSearchEvents(data: unknown): ShopperSearchEvent[] {
  if (Array.isArray(data)) return data as ShopperSearchEvent[];
  if (data && typeof data === "object") {
    const payload = data as { data?: unknown };
    if (Array.isArray(payload.data)) return payload.data as ShopperSearchEvent[];
  }
  return [];
}

export function eventSearchName(event: ShopperSearchEvent) {
  return event.name || event.title || "Event";
}

export function filterEventsBySearchQuery<T extends { name?: string; title?: string }>(
  events: T[],
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return events.filter((event) =>
    (event.name || event.title || "").toLowerCase().includes(q),
  );
}

export function formatSearchEventWhen(event: ShopperSearchEvent) {
  const start = event.start || event.startDate;
  const timezone = event.venue?.timezone;
  const format =
    event.display_start_time === false
      ? "ddd, MMM D, YYYY"
      : "ddd, MMM D, YYYY h:mm A";
  return formatEventWhen(start, timezone, format);
}

export function searchEventImageSrc(event: ShopperSearchEvent) {
  return imageUrl(event.image, SEARCH_IMAGE_FALLBACK);
}

export function searchEventHref(event: ShopperSearchEvent) {
  return eventPurchasePath(event);
}

export async function fetchSearchEvents(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const res = await searchEvents({ data: trimmed });
  const events = sortByDate(asSearchEvents(res.data));
  // Tie each hit to its team before the shopper can click it, so opening a
  // result paints that org's loader instead of an empty screen. Searching is
  // not picking a team, so the last-used org stays put.
  events.forEach((event) =>
    cacheEventBranding(event, event.organization, { touchLast: false }),
  );
  return events;
}
