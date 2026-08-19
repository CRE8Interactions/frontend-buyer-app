import moment from "moment-timezone";

export const COUNTDOWN_NUM = 9;
export const COUNTDOWN_DURATION = 1000;

const ABBR_TO_IANA: Record<string, string> = {
  EDT: "America/New_York",
  EST: "America/New_York",
  CDT: "America/Chicago",
  CST: "America/Chicago",
  MDT: "America/Denver",
  MST: "America/Denver",
  PDT: "America/Los_Angeles",
  PST: "America/Los_Angeles",
  AKDT: "America/Anchorage",
  AKST: "America/Anchorage",
  HST: "Pacific/Honolulu",
};

/** Venue abbr (MDT), IANA string, or API timezone config object from utility.timezones(). */
export type TimezoneLike =
  | string
  | {
      abbr?: string;
      iana?: string;
      utc?: string[];
      value?: string;
    }
  | null
  | undefined;

/** Normalize abbr / IANA / timezone config objects for moment.tz. */
export const toIanaTimezone = (timezone?: TimezoneLike) => {
  if (!timezone) return undefined;

  if (typeof timezone === "object") {
    if (typeof timezone.iana === "string" && timezone.iana.includes("/")) {
      return timezone.iana;
    }
    if (Array.isArray(timezone.utc) && typeof timezone.utc[0] === "string") {
      return timezone.utc[0];
    }
    if (typeof timezone.abbr === "string") {
      return ABBR_TO_IANA[timezone.abbr.toUpperCase()] ?? timezone.abbr;
    }
    if (typeof timezone.value === "string") {
      return ABBR_TO_IANA[timezone.value.toUpperCase()] ?? timezone.value;
    }
    return undefined;
  }

  if (typeof timezone !== "string") return undefined;
  if (timezone.includes("/")) return timezone;
  return ABBR_TO_IANA[timezone.toUpperCase()] ?? timezone;
};

/** Comp/sponsorship flex packs: package price $0 and no voucher fees. */
export const isZeroFeeCompFlexPackCart = (
  flexPack?: { price?: unknown; gameTickets?: unknown } | null,
) => {
  const raw = flexPack?.price;
  if (raw === null || raw === undefined || raw === "") return true;
  const parsed = Number(raw);
  return (Number.isFinite(parsed) ? parsed : 0) === 0;
};

const cartErrorStatus = (err: unknown) =>
  err &&
  typeof err === "object" &&
  "response" in err
    ? (err as { response?: { status?: number } }).response?.status
    : undefined;

/** Browser or React aborted an in-flight request (Strict Mode remount, navigation). */
export const isRequestCanceled = (err: unknown) => {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; name?: string; message?: string };
  return (
    e.code === "ERR_CANCELED" ||
    e.name === "CanceledError" ||
    e.name === "AbortError" ||
    e.message === "canceled"
  );
};

/** Server still has the cart row but marks it abandoned/timed out. */
export const isCartExpiredResponse = (err: unknown) =>
  cartErrorStatus(err) === 410;

/** Cart is unusable — timed out (410) or missing for this session/IP (404). */
export const isCartGoneResponse = (err: unknown) => {
  const status = cartErrorStatus(err);
  return status === 410 || status === 404;
};

export const stateOpt = [
  { value: "AK", name: "Alaska" },
  { value: "AL", name: "Alabama" },
  { value: "AR", name: "Arkansas" },
  { value: "AZ", name: "Arizona" },
  { value: "CA", name: "California" },
  { value: "CO", name: "Colorado" },
  { value: "CT", name: "Connecticut" },
  { value: "DC", name: "District Of Columbia" },
  { value: "DE", name: "Delaware" },
  { value: "FL", name: "Florida" },
  { value: "GA", name: "Georgia" },
  { value: "HI", name: "Hawaii" },
  { value: "IA", name: "Iowa" },
  { value: "ID", name: "Idaho" },
  { value: "IL", name: "Illinois" },
  { value: "IN", name: "Indiana" },
  { value: "KS", name: "Kansas" },
  { value: "KY", name: "Kentucky" },
  { value: "LA", name: "Louisiana" },
  { value: "MA", name: "Massachusetts" },
  { value: "MD", name: "Maryland" },
  { value: "ME", name: "Maine" },
  { value: "MI", name: "Michigan" },
  { value: "MN", name: "Minnesota" },
  { value: "MO", name: "Missouri" },
  { value: "MS", name: "Mississippi" },
  { value: "MT", name: "Montana" },
  { value: "NC", name: "North Carolina" },
  { value: "ND", name: "North Dakota" },
  { value: "NE", name: "Nebraska" },
  { value: "NH", name: "New Hampshire" },
  { value: "NJ", name: "New Jersey" },
  { value: "NM", name: "New Mexico" },
  { value: "NV", name: "Nevada" },
  { value: "NY", name: "New York" },
  { value: "OH", name: "Ohio" },
  { value: "OK", name: "Oklahoma" },
  { value: "OR", name: "Oregon" },
  { value: "PA", name: "Pennsylvania" },
  { value: "RI", name: "Rhode Island" },
  { value: "SC", name: "South Carolina" },
  { value: "SD", name: "South Dakota" },
  { value: "TN", name: "Tennessee" },
  { value: "TX", name: "Texas" },
  { value: "UT", name: "Utah" },
  { value: "VA", name: "Virginia" },
  { value: "VT", name: "Vermont" },
  { value: "WA", name: "Washington" },
  { value: "WI", name: "Wisconsin" },
  { value: "WV", name: "West Virginia" },
  { value: "WY", name: "Wyoming" },
];

export const namePatternMatch = "^[A-Za-z'\\- ]+$";

export const isPlural = (amount: number) => amount === 0 || amount > 1;

export const getSingularOrPluralWord = (amount: number, text = "Ticket") => {
  const pluralChars = text === "Guest Pass" ? "es" : "s";
  return isPlural(amount) ? `${text}${pluralChars}` : `${text}`;
};

export const formatCurrency = (num?: number | string | null) =>
  parseFloat(String(num ?? 0)).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatOfferListPrice = (
  amount: number,
  offer?: { freeOffer?: boolean } | null,
) => formatCurrency(offer?.freeOffer ? 0 : amount);

export const formatNumber = (num?: number | string | null) =>
  parseFloat(String(num ?? 0)).toLocaleString("en-US");

export const emailPatternMatch = (val?: string | null) => {
  const emailPattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/g;
  return val ? new RegExp(emailPattern).test(val) : true;
};

export const isBlockedEmail = (email?: string) => {
  if (!email) return false;
  const blocked = ["mailinator.com", "guerrillamail.com", "tempmail.com"];
  const domain = email.split("@")[1]?.toLowerCase();
  return Boolean(domain && blocked.includes(domain));
};

// trailingSlash is enabled, so canonical hrefs end in "/" to avoid a 308 on
// prefetch and client navigation.
export const getUrl = (link: string, isGAOnlyEvent?: boolean) =>
  isGAOnlyEvent ? `${link}/` : `${link}/tickets/`;

export const RESERVED_ORG_SLUGS = new Set([
  "browse",
  "login",
  "search",
  "checkout",
  "settings",
  "www",
  "menu",
  "group",
  "fundraise",
  "privacy-policy",
  "terms-conditions",
  "purchase-policy",
  "cookies-policy",
  "disclaimer",
  "my-events",
  "my-transfers",
  "my-listings",
  "my-collectables",
  "my-packages",
  "guest-passes",
  "event-details",
  "our-story",
  "case-study",
  "design-system",
  "e",
  "venue",
]);

export const isOrganizationLandingPage = (url: string) => {
  const match = url.match(/^\/([^/]+)\/?$/);
  if (!match) return false;
  return !RESERVED_ORG_SLUGS.has(match[1].toLowerCase());
};

export const shouldHideNav = (url: string) =>
  /(\/e\/|\/tickets|\/checkout|\/menu\/)/g.test(url);

export const shouldFullyHideNav = (url: string) => /\/menu\//g.test(url);

export const sortByDate = <T extends { start?: string; startDate?: string }>(
  items: T[] = [],
) =>
  [...items].sort((a, b) => {
    const aDate = moment(a.start || a.startDate);
    const bDate = moment(b.start || b.startDate);
    return aDate.valueOf() - bDate.valueOf();
  });

export const formatEventWhen = (
  start?: string,
  timezone?: TimezoneLike,
  format = "ddd, MMM D, YYYY h:mm A",
) => {
  if (!start) return "";
  const tz = toIanaTimezone(timezone);
  const m = tz ? moment.tz(start, tz) : moment(start);
  return m.format(format);
};

/** Prefer the scheduled doors time the API stores separately from `doorsOpen`. */
export const eventDoorsIso = (ev?: {
  doorsOpen?: string;
  realDoorsOpen?: string;
} | null) => ev?.realDoorsOpen || ev?.doorsOpen;

export const formatDoorsTime = (iso?: string, timezone?: TimezoneLike) => {
  if (!iso) return "";
  const tz = toIanaTimezone(timezone);
  const m = tz ? moment.tz(iso, tz) : moment(iso);
  return m.isValid() ? m.format("h:mm A") : "";
};

const withDoorsSuffix = (when: string, doors: string) =>
  when && doors ? `${when} · Doors ${doors}` : when || (doors ? `Doors ${doors}` : "");

/** "Sat, Aug 15, 2026 7:35 PM · Doors 6:35 PM" */
export const eventWhenWithDoors = (
  start?: string,
  doorsIso?: string,
  timezone?: TimezoneLike,
) =>
  withDoorsSuffix(
    formatEventWhen(start, timezone),
    formatDoorsTime(doorsIso, timezone),
  );

/** "Sat, Aug 15, 2026 · Doors 6:35 PM" */
export const eventWhenShortWithDoors = (
  start?: string,
  doorsIso?: string,
  timezone?: TimezoneLike,
) =>
  withDoorsSuffix(
    formatEventWhen(start, timezone, "ddd, MMM D, YYYY"),
    formatDoorsTime(doorsIso, timezone),
  );

export const dateChip = (start?: string, timezone?: TimezoneLike) => {
  if (!start) return { m: "—", d: "—" };
  const tz = toIanaTimezone(timezone);
  const m = tz ? moment.tz(start, tz) : moment(start);
  return { m: m.format("MMM"), d: m.format("D") };
};

export const eventPurchasePath = (event: {
  slug?: string;
  seoUrl?: string;
  shortcode?: string;
  shortCode?: string;
  attrs?: { shortcode?: string; shortCode?: string };
  isGeneralAdmissionOnly?: boolean;
  generalAdmissionOnly?: boolean;
  seatmap?: { ga_only?: boolean };
  venue?: { isGeneralAdmissionOnly?: boolean };
}) => {
  const slug = event.slug || event.seoUrl || "";
  const code =
    event.shortcode ||
    event.shortCode ||
    event.attrs?.shortcode ||
    event.attrs?.shortCode ||
    "";
  const base = `/e/${slug}/${code}`;
  const gaOnly =
    event.isGeneralAdmissionOnly ||
    event.generalAdmissionOnly ||
    event.seatmap?.ga_only ||
    event.venue?.isGeneralAdmissionOnly;
  return getUrl(base, Boolean(gaOnly));
};

export function packagePurchasePath(
  pkg?: {
    uuid?: string | number;
    id?: string | number;
    organization?: { slug?: string } | null;
    venue?: { slug?: string } | null;
  } | null,
): string | null {
  const id = pkg?.uuid ?? pkg?.id;
  if (id == null || String(id).trim() === "") return null;
  const orgSlug = String(pkg?.organization?.slug || "").trim();
  if (orgSlug) return `/${orgSlug}/package/${id}/`;
  const venueSlug = String(pkg?.venue?.slug || "").trim();
  if (venueSlug) return `/venue/${venueSlug}/package/${id}/`;
  return null;
}

export type ApiImage =
  | string
  | { url?: string; formats?: { small?: { url?: string }; thumbnail?: { url?: string } } }
  | null
  | undefined;

export const imageUrl = (img?: ApiImage, fallback = "/blocktickets-logo.svg") => {
  if (!img) return fallback;
  if (typeof img === "string") return img;
  return img.url || img.formats?.small?.url || img.formats?.thumbnail?.url || fallback;
};

function seatIdCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return 0;
}

/**
 * How full a listing's sellable inventory is (sold / capacity).
 * Returns null when capacity is unknown so the UI can hide the bar.
 */
export const getInventoryFill = (group: {
  GA?: boolean;
  availableCount?: number;
  seatIds?: unknown;
  allSeatIds?: unknown;
}): { available: number; capacity: number; fullPct: number } | null => {
  const capacity = seatIdCount(group.allSeatIds);
  if (capacity <= 0) return null;

  const available = group.GA
    ? Math.max(0, Number(group.availableCount) || 0)
    : seatIdCount(group.seatIds);

  const sold = Math.max(0, capacity - Math.min(available, capacity));
  const fullPct = Math.min(100, Math.round((sold / capacity) * 100));
  return { available, capacity, fullPct };
};
