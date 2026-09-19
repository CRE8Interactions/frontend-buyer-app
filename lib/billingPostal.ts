import { requiredCopy } from "@/lib/fieldValidation";

/** Canadian provinces / territories — none collide with US state codes. */
const CA_REGIONS = new Set([
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
  "ALBERTA",
  "BRITISH COLUMBIA",
  "MANITOBA",
  "NEW BRUNSWICK",
  "NEWFOUNDLAND AND LABRADOR",
  "NOVA SCOTIA",
  "NORTHWEST TERRITORIES",
  "NUNAVUT",
  "ONTARIO",
  "PRINCE EDWARD ISLAND",
  "QUEBEC",
  "SASKATCHEWAN",
  "YUKON",
]);

const US_ZIP = /^\d{5}(?:-\d{4})?$/;
const CA_POSTAL =
  /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;

/** Stripe no longer collects postal for these when Payment Element is `auto`. */
const NO_POSTAL_COUNTRIES = new Set([
  "AE",
  "AG",
  "AO",
  "AW",
  "BF",
  "BI",
  "BJ",
  "BO",
  "BQ",
  "BS",
  "BZ",
  "CD",
  "CF",
  "CG",
  "CI",
  "CK",
  "CM",
  "DJ",
  "DM",
  "ER",
  "FJ",
  "GA",
  "GD",
  "GQ",
  "GY",
  "HK",
  "JM",
  "KE",
  "KI",
  "KM",
  "KN",
  "KP",
  "LC",
  "LY",
  "ML",
  "MO",
  "MR",
  "MW",
  "NR",
  "QA",
  "RW",
  "SB",
  "SC",
  "SL",
  "SO",
  "SR",
  "ST",
  "SY",
  "TG",
  "TK",
  "TL",
  "TO",
  "TV",
  "UG",
  "VU",
  "YE",
  "ZW",
]);

export const BILLING_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BR", name: "Brazil" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "DO", name: "Dominican Republic" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HK", name: "Hong Kong" },
  { code: "IN", name: "India" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "MX", name: "Mexico" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NO", name: "Norway" },
  { code: "PE", name: "Peru" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "PR", name: "Puerto Rico" },
  { code: "SG", name: "Singapore" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TW", name: "Taiwan" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
] as const;

export type BillingPostalError = "required" | "invalid" | null;

export type BillingCountrySource = {
  currency?: string | null;
  event?: {
    venue?: BillingVenueLike | null;
    organization?: BillingOrgLike | null;
  } | null;
  package?: {
    venue?: BillingVenueLike | null;
    organization?: BillingOrgLike | null;
    currency?: string | null;
  } | null;
  flex_pack?: {
    venue?: BillingVenueLike | null;
    organization?: BillingOrgLike | null;
    currency?: string | null;
  } | null;
  access_pass_template?: {
    venue?: BillingVenueLike | null;
    organization?: BillingOrgLike | null;
    currency?: string | null;
  } | null;
};

type BillingVenueLike = {
  country?: string | null;
  state?: string | null;
  address?:
    | { country?: string | null; state?: string | null }
    | Array<{ country?: string | null; state?: string | null }>
    | null;
};

type BillingOrgLike = {
  country?: string | null;
  currency?: string | null;
  address?: { country?: string | null } | null;
  venue?: BillingVenueLike | null;
  homeVenue?: BillingVenueLike | null;
};

const WALLET_PAYMENT_TYPES = new Set(["apple_pay", "google_pay", "link"]);

export function isWalletPaymentType(type?: string | null) {
  return WALLET_PAYMENT_TYPES.has(String(type || "").trim().toLowerCase());
}

export function postalFieldLabel(country: string) {
  return country === "US" || country === "PR" ? "ZIP" : "Postal code";
}

export function countryUsesPostal(country: string) {
  return !NO_POSTAL_COUNTRIES.has(country);
}

export function normalizePostal(country: string, value: string) {
  const raw = value.trim().toUpperCase();
  if (country === "CA") {
    const compact = raw.replace(/[\s-]+/g, "");
    if (compact.length === 6) return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  }
  return country === "US" || country === "PR" ? raw : value.trim();
}

export function postalLooksValid(country: string, value: string) {
  const next = value.trim();
  if (!next) return !countryUsesPostal(country);
  if (country === "US" || country === "PR") return US_ZIP.test(next);
  if (country === "CA") return CA_POSTAL.test(next);
  return next.length >= 2;
}

/** Empty is valid on idle blur; submit still rejects empty when the country uses postal. */
export function postalBlurError(
  country: string,
  value: string,
): Exclude<BillingPostalError, "required"> {
  const next = value.trim();
  if (!next) return null;
  return postalLooksValid(country, next) ? null : "invalid";
}

export function postalSubmitError(
  country: string,
  value: string,
): BillingPostalError {
  if (!countryUsesPostal(country)) return null;
  const next = value.trim();
  if (!next) return "required";
  return postalLooksValid(country, next) ? null : "invalid";
}

export function postalErrorMessage(
  country: string,
  error: BillingPostalError,
) {
  const label = postalFieldLabel(country);
  if (error === "required") return requiredCopy(label);
  if (error === "invalid") return `${label} is invalid. Please try again.`;
  return "";
}

export function stripeConfirmBillingDetails(country: string, postal: string) {
  const address: { country: string; postal_code?: string } = { country };
  if (countryUsesPostal(country)) {
    address.postal_code = normalizePostal(country, postal);
  }
  return { address };
}

function asCountryCode(value: unknown): string | undefined {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const upper = raw.toUpperCase();
  if (upper === "CANADA") return "CA";
  if (upper === "UNITED STATES" || upper === "USA") return "US";
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  return undefined;
}

function venueAddress(
  venue?: BillingVenueLike | null,
): { country?: string | null; state?: string | null } | undefined {
  const address = venue?.address;
  if (Array.isArray(address)) return address[0];
  if (address && typeof address === "object") return address;
  return undefined;
}

function countryFromVenue(venue?: BillingVenueLike | null) {
  const addr = venueAddress(venue);
  const explicit = asCountryCode(addr?.country || venue?.country);
  if (explicit) return explicit;
  const state = String(addr?.state || venue?.state || "")
    .trim()
    .toUpperCase();
  return CA_REGIONS.has(state) ? "CA" : undefined;
}

/** Shopper billing country hint from the cart (venue / org / currency). */
export function billingCountryFromCart(
  cart?: unknown,
): string | undefined {
  if (!cart || typeof cart !== "object") return undefined;
  const source = cart as BillingCountrySource;
  const event = source.event;
  const pack = source.package || source.flex_pack || source.access_pass_template;
  const org = event?.organization || pack?.organization;
  const fromVenue =
    countryFromVenue(event?.venue) ||
    countryFromVenue(pack?.venue) ||
    asCountryCode(org?.country || org?.address?.country) ||
    countryFromVenue(org?.homeVenue) ||
    countryFromVenue(org?.venue);
  if (fromVenue) return fromVenue;
  const currency = String(
    source.currency || pack?.currency || org?.currency || "",
  )
    .trim()
    .toUpperCase();
  if (currency === "CAD") return "CA";
  return undefined;
}
