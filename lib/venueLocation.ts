export type VenueAddressLike = {
  address_1?: string;
  line1?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
};

export type VenueLocationLike = {
  name?: string | null;
  city?: string | null;
  state?: string | null;
  address?:
    | VenueAddressLike
    | VenueAddressLike[]
    | { data?: unknown }
    | null;
};

function normalizeState(state?: string | null): string {
  return String(state ?? "")
    .trim()
    .toUpperCase();
}

function formatCity(city?: string | null): string {
  return String(city ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function normalizeVenueAddressEntry(entry: unknown): VenueAddressLike | undefined {
  if (!entry || typeof entry !== "object") return undefined;
  const row = entry as { attributes?: VenueAddressLike } & VenueAddressLike;
  if (row.attributes && typeof row.attributes === "object") {
    return row.attributes;
  }
  return row;
}

function unwrapVenueAddressList(
  address?: VenueLocationLike["address"],
): VenueAddressLike[] {
  if (!address) return [];
  if (Array.isArray(address)) {
    return address
      .map(normalizeVenueAddressEntry)
      .filter(Boolean) as VenueAddressLike[];
  }
  if (typeof address === "object") {
    const wrapped = address as { data?: unknown };
    if (Array.isArray(wrapped.data)) {
      return wrapped.data
        .map(normalizeVenueAddressEntry)
        .filter(Boolean) as VenueAddressLike[];
    }
    const single = normalizeVenueAddressEntry(address);
    return single ? [single] : [];
  }
  return [];
}

function coalesceVenueAddress(
  venue?: VenueLocationLike | null,
): VenueAddressLike | undefined {
  const fromList = unwrapVenueAddressList(venue?.address)[0];
  if (fromList?.city || fromList?.state || fromList?.address_1 || fromList?.line1) {
    return fromList;
  }
  if (venue?.city || venue?.state) {
    return {
      city: venue.city ?? undefined,
      state: venue.state ?? undefined,
    };
  }
  return fromList;
}

function venueAddressEntry(
  address?: VenueAddressLike | VenueAddressLike[] | { data?: unknown } | null,
): VenueAddressLike | undefined {
  return unwrapVenueAddressList(address)[0];
}

/** "Ogden, UT" */
export function formatVenueCityState(
  address?: VenueAddressLike | VenueAddressLike[] | { data?: unknown } | null,
): string {
  const addr = venueAddressEntry(address);
  const city = formatCity(addr?.city);
  const state = normalizeState(addr?.state);
  return [city, state].filter(Boolean).join(", ");
}

/** Backward-compatible alias for city/state summaries. */
export const formatVenueCountryState = formatVenueCityState;

/** "2330 Lincoln Ave, Ogden, UT, 84401" */
export function formatVenueStreetAddress(
  address?: VenueAddressLike | VenueAddressLike[] | { data?: unknown } | null,
): string {
  const addr = venueAddressEntry(address);
  if (!addr) return "";
  const line1 = String(addr.address_1 ?? addr.line1 ?? "").trim();
  const city = formatCity(addr.city);
  const state = normalizeState(addr.state);
  const zip = String(addr.zipcode ?? "").trim();
  return [line1, city, state, zip].filter(Boolean).join(", ");
}

/** "Lindquist Field, Ogden, UT" */
export function formatVenueLocationLine(
  venueName?: string | null,
  address?: VenueAddressLike | VenueAddressLike[] | { data?: unknown } | null,
): string {
  const name = String(venueName ?? "").trim();
  const cityState = formatVenueCityState(address);
  return [name, cityState].filter(Boolean).join(", ");
}

/** Formats a venue record from cart/order/event payloads. */
export function formatVenueLocationFromVenue(
  venue?: VenueLocationLike | null,
): string {
  if (!venue) return "";
  const name = String(venue.name ?? "").trim();
  const addr = coalesceVenueAddress(venue);
  const cityState = formatVenueCityState(addr);
  return [name, cityState].filter(Boolean).join(", ");
}

/** Street line for maps / directions from a venue record. */
export function formatVenueStreetAddressFromVenue(
  venue?: VenueLocationLike | null,
): string {
  const addr = coalesceVenueAddress(venue);
  return formatVenueStreetAddress(addr);
}

/** `https://google.com/maps?q=1810 E University Ave+las cruces+nm` */
export function googleMapsDirectionsUrl(
  address?: VenueAddressLike | VenueAddressLike[] | { data?: unknown } | null,
): string {
  const addr = venueAddressEntry(address);
  if (!addr) return "";
  const street = String(addr.address_1 ?? addr.line1 ?? "").trim();
  const city = String(addr.city ?? "").trim().toLowerCase();
  const state = String(addr.state ?? "").trim().toLowerCase();
  const query = [street, city, state].filter(Boolean).join("+");
  if (!query) return "";
  return `https://google.com/maps?q=${query}`;
}
