import {
  resolveBrandLogo,
  resolvePrimaryColor,
  type BrandingOrganization,
} from "@/lib/branding";
import { WALLET_SECTION_PREFIXES } from "@/lib/walletNav";

export type CachedBranding = {
  slug: string | null;
  name: string | null;
  primaryColor: string;
  logoSrc: string | null;
};

const LAST_KEY = "bt_org_branding_last";
const EVENTS_MAP_KEY = "bt_org_branding_events";
const VENUES_MAP_KEY = "bt_org_branding_venues";

/** Cookie mirror of last-used tenant branding so the server can paint the loader. */
export const LOADER_BRANDING_COOKIE = "bt_org_branding_last";

const slugKey = (slug: string) =>
  `bt_org_branding:${String(slug).toLowerCase()}`;

const EVENT_PATH = /^\/e\/([^/]+)\/([^/]+)/;
const VENUE_PATH = /^\/venue\/([^/]+)/i;
const LEGACY_EVENT_KEY = /^bt_org_branding_event:/i;
const LEGACY_VENUE_KEY = /^bt_org_branding_venue:/i;

type SlugMap = Record<string, string>;

let migrated = false;

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // private mode / quota — ignore
  }
}

function writeLastCookie(payload: CachedBranding) {
  if (typeof document === "undefined") return;
  if (!payload?.primaryColor) return;
  try {
    document.cookie = `${LOADER_BRANDING_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; Path=/; SameSite=Lax; Max-Age=604800`;
  } catch {
    // ignore
  }
}

function cookieValue(source: string, name: string) {
  const parts = source.split("; ");
  const prefix = `${name}=`;
  const hit = parts.find((part) => part.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

/** Parse the last-used tenant branding cookie (server Cookie header or document.cookie). */
export function parseLoaderBrandingCookie(
  raw?: string | null,
): CachedBranding | null {
  if (!raw) return null;
  try {
    const text = raw.includes("%") ? decodeURIComponent(raw) : raw;
    const parsed = JSON.parse(text) as CachedBranding;
    if (!parsed?.primaryColor) return null;
    return {
      slug: parsed.slug || null,
      name: parsed.name || null,
      primaryColor: parsed.primaryColor,
      logoSrc: parsed.logoSrc || null,
    };
  } catch {
    return null;
  }
}

export function getLoaderBrandingFromCookieValue(
  value?: string | null,
): CachedBranding | null {
  return parseLoaderBrandingCookie(value);
}

function readLastCookie(): CachedBranding | null {
  if (typeof document === "undefined") return null;
  try {
    return parseLoaderBrandingCookie(
      cookieValue(document.cookie, LOADER_BRANDING_COOKIE),
    );
  } catch {
    return null;
  }
}

function lastBranding(): CachedBranding | null {
  const stored = readJson<CachedBranding>(LAST_KEY);
  if (stored?.primaryColor) return stored;
  const cookie = readLastCookie();
  if (cookie?.primaryColor) {
    writeRaw(LAST_KEY, JSON.stringify(cookie));
    if (cookie.slug) writeRaw(slugKey(cookie.slug), JSON.stringify(cookie));
    return cookie;
  }
  return null;
}

function removeRaw(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function readJson<T>(key: string): T | null {
  const raw = readRaw(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  writeRaw(key, JSON.stringify(value));
  if (key === LAST_KEY) writeLastCookie(value as CachedBranding);
}

function readMap(key: string): SlugMap {
  return readJson<SlugMap>(key) || {};
}

function writeMap(key: string, map: SlugMap) {
  writeJson(key, map);
}

function eventMapKey(eventSlug: string, shortcode: string) {
  return `${String(eventSlug).toLowerCase()}/${String(shortcode).toLowerCase()}`;
}

/**
 * Fold legacy per-event / per-venue full-payload keys into the two pointer
 * maps, then delete them. Idempotent; runs once per page load.
 */
function migrateLegacyKeys() {
  if (migrated || typeof window === "undefined") return;
  migrated = true;

  try {
    const events = readMap(EVENTS_MAP_KEY);
    const venues = readMap(VENUES_MAP_KEY);
    const toRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key) continue;

      if (LEGACY_EVENT_KEY.test(key)) {
        const payload = readJson<CachedBranding>(key);
        const path = key.slice("bt_org_branding_event:".length);
        if (payload?.slug && path) events[path.toLowerCase()] = payload.slug;
        toRemove.push(key);
      } else if (LEGACY_VENUE_KEY.test(key)) {
        const payload = readJson<CachedBranding>(key);
        const venueSlug = key.slice("bt_org_branding_venue:".length);
        if (payload?.slug && venueSlug) {
          venues[venueSlug.toLowerCase()] = payload.slug;
        }
        toRemove.push(key);
      }
    }

    if (Object.keys(events).length) writeMap(EVENTS_MAP_KEY, events);
    if (Object.keys(venues).length) writeMap(VENUES_MAP_KEY, venues);
    toRemove.forEach(removeRaw);
  } catch {
    // ignore — leave legacy keys alone if storage is hostile
  }
}

function brandingPayload(
  organization?: BrandingOrganization | null,
): CachedBranding | null {
  if (!organization) return null;

  const logoSrc = resolveBrandLogo(null, organization);
  const hasOwnColor = Boolean(
    organization.branding?.primaryColor ||
      organization.primaryColor ||
      organization.brandColor ||
      organization.accentColor,
  );

  if (!logoSrc && !hasOwnColor) return null;

  return {
    slug: organization.slug || null,
    name: organization.name || null,
    primaryColor: resolvePrimaryColor(null, organization),
    logoSrc,
  };
}

function rememberEvent(
  event: { seoUrl?: string; slug?: string; shortCode?: string } | null | undefined,
  orgSlug: string | null | undefined,
) {
  if (!orgSlug) return;
  const eventSlug = event?.seoUrl || event?.slug;
  const shortcode = event?.shortCode;
  if (!eventSlug || !shortcode) return;

  migrateLegacyKeys();
  const map = readMap(EVENTS_MAP_KEY);
  map[eventMapKey(eventSlug, shortcode)] = orgSlug;
  writeMap(EVENTS_MAP_KEY, map);
}

function rememberVenue(
  venueSlug: string | null | undefined,
  orgSlug: string | null | undefined,
) {
  if (!venueSlug || !orgSlug) return;
  migrateLegacyKeys();
  const map = readMap(VENUES_MAP_KEY);
  map[String(venueSlug).toLowerCase()] = orgSlug;
  writeMap(VENUES_MAP_KEY, map);
}

function brandingForOrgSlug(orgSlug?: string | null): CachedBranding | null {
  if (!orgSlug) return null;
  migrateLegacyKeys();
  return readJson<CachedBranding>(slugKey(orgSlug));
}

/** Persist org branding for branded page-transition loaders. */
export function cacheOrgBranding(organization?: BrandingOrganization | null) {
  const payload = brandingPayload(organization);
  if (!payload) return null;

  migrateLegacyKeys();
  writeJson(LAST_KEY, payload);
  if (payload.slug) writeJson(slugKey(payload.slug), payload);
  return payload;
}

/**
 * Tie an event route to its organization for `/e/:slug/:shortcode` loaders.
 * Pass `{ touchLast: false }` when seeding from browse so the shopper's last
 * team is not overwritten by every row in the list.
 */
export function cacheEventBranding(
  event: { seoUrl?: string; slug?: string; shortCode?: string } | null | undefined,
  organization?: BrandingOrganization | null,
  opts: { touchLast?: boolean } = {},
) {
  const touchLast = opts.touchLast !== false;
  let payload: CachedBranding | null;
  if (touchLast) {
    payload = cacheOrgBranding(organization);
  } else {
    payload = brandingPayload(organization);
    if (payload?.slug) {
      migrateLegacyKeys();
      writeJson(slugKey(payload.slug), payload);
    }
  }
  rememberEvent(event, payload?.slug);
  return payload;
}

/** Seed branding for every event on an organization's storefront. */
export function cacheOrgEventBranding(
  events:
    | Array<{ seoUrl?: string; slug?: string; shortCode?: string }>
    | null
    | undefined,
  organization?: BrandingOrganization | null,
) {
  const payload = cacheOrgBranding(organization);
  if (!payload?.slug) return null;
  (events || []).forEach((event) => rememberEvent(event, payload.slug));
  return payload;
}

/** Seed branding for browse/on-sale org lists without overwriting last-used. */
export function cacheOrgsBranding(
  organizations:
    | Array<
        BrandingOrganization & {
          upcomingEvents?: Array<{
            seoUrl?: string;
            slug?: string;
            shortCode?: string;
          }>;
        }
      >
    | null
    | undefined,
) {
  migrateLegacyKeys();
  (organizations || []).forEach((organization) => {
    const payload = brandingPayload(organization);
    if (!payload?.slug) return;

    writeJson(slugKey(payload.slug), payload);
    (organization.upcomingEvents || []).forEach((event) =>
      rememberEvent(event, payload.slug),
    );
  });
}

/** Tie venue routes to the organization that plays there. */
export function cacheVenueBranding(
  venues: Array<{ slug?: string | null } | null | undefined> | null | undefined,
  organization?: BrandingOrganization | null,
) {
  const payload = brandingPayload(organization);
  if (!payload?.slug) return null;

  // Keep the org payload warm, but don't bump "last" — browsing venues
  // shouldn't overwrite the shopper's last team.
  migrateLegacyKeys();
  writeJson(slugKey(payload.slug), payload);
  (venues || []).forEach((venue) => rememberVenue(venue?.slug, payload.slug));
  return payload;
}

export function getCachedOrgBranding(slug?: string | null) {
  migrateLegacyKeys();
  if (slug) {
    const keyed = brandingForOrgSlug(slug);
    if (keyed?.primaryColor) return keyed;
    const last = lastBranding();
    if (last?.slug && last.slug.toLowerCase() === slug.toLowerCase()) {
      return last;
    }
    return null;
  }
  return lastBranding();
}

export function getCachedBrandingForPath(
  pathname = "",
  params: { slug?: string } = {},
): CachedBranding | null {
  migrateLegacyKeys();

  const eventMatch = pathname.match(EVENT_PATH);
  if (eventMatch) {
    const orgSlug = readMap(EVENTS_MAP_KEY)[
      eventMapKey(eventMatch[1], eventMatch[2])
    ];
    const exact = brandingForOrgSlug(orgSlug);
    if (exact) return exact;

    // A missing/expired event may fail before it can seed the exact event map.
    // Reuse the last tenant only when the event slug identifies that same org;
    // never paint an unrelated team's branding on an unknown event route.
    const last = lastBranding();
    const eventSlug = eventMatch[1].toLowerCase();
    const lastSlug = last?.slug?.toLowerCase();
    if (
      lastSlug &&
      (eventSlug === lastSlug || eventSlug.startsWith(`${lastSlug}-`))
    ) {
      return last;
    }
    return null;
  }

  const venueMatch = pathname.match(VENUE_PATH);
  if (venueMatch) {
    const orgSlug = readMap(VENUES_MAP_KEY)[venueMatch[1].toLowerCase()];
    return brandingForOrgSlug(orgSlug);
  }

  const slug = params.slug || orgSlugFromPathname(pathname);
  if (slug) return brandingForOrgSlug(slug);

  return lastBranding();
}

/** Cookie + session flag: this wallet landing came from a tenant page. */
export const WALLET_ENTRY_COOKIE = "bt_wallet_entry_from_tenant";
const WALLET_ENTRY_KEY = "bt_wallet_entry_from_tenant";

function writeWalletEntryCookie(on: boolean) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${WALLET_ENTRY_COOKIE}=${on ? "1" : ""}; Path=/; SameSite=Lax; Max-Age=${on ? 120 : 0}`;
  } catch {
    // ignore
  }
}

export function peekWalletEntryFromTenant() {
  if (typeof window === "undefined") return false;
  if (readRaw(WALLET_ENTRY_KEY) === "1") return true;
  try {
    return cookieValue(document.cookie, WALLET_ENTRY_COOKIE) === "1";
  } catch {
    return false;
  }
}

export function markWalletEntryFromTenant() {
  writeRaw(WALLET_ENTRY_KEY, "1");
  writeWalletEntryCookie(true);
}

export function consumeWalletEntryFromTenant() {
  const hit = peekWalletEntryFromTenant();
  removeRaw(WALLET_ENTRY_KEY);
  writeWalletEntryCookie(false);
  return hit;
}

const WALLET_ACCOUNT_PREFIXES = WALLET_SECTION_PREFIXES;

/** Wallet / account routes that use Blocktickets chrome after entry. */
export function isWalletAccountPath(pathname = "") {
  const path = pathname.replace(/\/+$/, "") || "/";
  return WALLET_ACCOUNT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/**
 * Team/event/venue/checkout origins. Not browse/home/legal/Our Story, not wallet.
 */
export function isTenantOriginPath(pathname = "") {
  if (isWalletAccountPath(pathname)) return false;
  if (isLoginLoaderPath(pathname)) return false;
  const path = pathname.replace(/\/+$/, "") || "/";
  if (isPlatformPagePath(path)) return false;
  if (path === "/checkout" || path.startsWith("/checkout/")) return true;
  if (/^\/e\//.test(pathname)) return true;
  if (/^\/venue\//i.test(pathname)) return true;
  if (orgSlugFromPathname(pathname)) return true;
  if (isBrandedLoaderPath(pathname)) return true;
  return false;
}

export function walletLoaderFromOrigin(
  fromPathname = "",
  toPathname = "",
): { branding: CachedBranding | null; fallback: "none" | "blocktickets" } {
  if (!isWalletAccountPath(toPathname)) {
    return { branding: null, fallback: "none" };
  }
  if (isTenantOriginPath(fromPathname)) {
    const branding =
      getLoaderBranding(fromPathname) || lastBranding();
    return {
      branding: branding?.primaryColor ? branding : null,
      fallback: "none",
    };
  }
  return { branding: null, fallback: "blocktickets" };
}

/** Login has no tenant of its own — its shell is Blocktickets. */
export function isLoginLoaderPath(pathname = "") {
  return (pathname.replace(/\/+$/, "") || "/") === "/login";
}

/** A `from` target means login is sending the shopper back into a tenant flow. */
export function hasLoginRedirect(search = "") {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return false;
  return Boolean(new URLSearchParams(query).get("from")?.trim());
}

/**
 * Home, browse, Our Story, and footer legal pages use the Blocktickets spinner
 * — never a team. Login joins them unless it is returning the shopper to a
 * tenant route.
 */
export const PLATFORM_PAGE_PATHS = [
  "/",
  "/browse",
  "/our-story",
  "/purchase-policy",
  "/terms-conditions",
  "/privacy-policy",
  "/disclaimer",
  "/cookies-policy",
  "/sign-out",
] as const;

export function isPlatformPagePath(pathname = "") {
  const path = pathname.replace(/\/+$/, "") || "/";
  return (PLATFORM_PAGE_PATHS as readonly string[]).includes(path);
}

export function isPlatformLoaderPath(
  pathname = "",
  search = "",
  opts: { walletEntryFromTenant?: boolean } = {},
) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (isPlatformPagePath(path)) return true;
  if (isWalletAccountPath(path)) {
    const fromTenant =
      opts.walletEntryFromTenant ?? peekWalletEntryFromTenant();
    return !fromTenant;
  }
  return isLoginLoaderPath(path) && !hasLoginRedirect(search);
}

/**
 * Last-used branding is only safe on generic shopper routes (checkout). A
 * storefront, event, venue, or platform path must not borrow a different team.
 */
export function lastBrandingIfCompatible(
  last: CachedBranding | null | undefined,
  pathname = "",
  opts: { walletEntryFromTenant?: boolean } = {},
): CachedBranding | null {
  if (!last?.primaryColor) return null;
  if (isPlatformLoaderPath(pathname, "", opts)) return null;
  if (isLoginLoaderPath(pathname)) return null;
  const orgSlug = orgSlugFromPathname(pathname);
  if (orgSlug) {
    return last.slug && last.slug.toLowerCase() === orgSlug.toLowerCase()
      ? last
      : null;
  }
  if (EVENT_PATH.test(pathname) || VENUE_PATH.test(pathname)) return null;
  return last;
}

/**
 * Branding for a route's loading screen. Destination tenant wins; never paint
 * the previous org while switching teams. Empty is better than the wrong team.
 */
export function getLoaderBranding(
  pathname = "",
  params: { slug?: string } = {},
  lastCookie?: CachedBranding | null,
  opts: { walletEntryFromTenant?: boolean } = {},
): CachedBranding | null {
  if (
    isPlatformLoaderPath(pathname, "", opts) ||
    isLoginLoaderPath(pathname)
  ) {
    return null;
  }
  const exact = getCachedBrandingForPath(pathname, params);
  if (exact) return exact;
  return lastBrandingIfCompatible(lastBranding() || lastCookie || null, pathname, opts);
}

type RouteLoaderBranding = {
  primaryColor?: string | null;
  logoSrc?: string | null;
  name?: string | null;
};

function hasTenantBranding(
  branding?: RouteLoaderBranding | null,
): branding is RouteLoaderBranding & { primaryColor: string } {
  return Boolean(
    branding?.primaryColor && (branding.logoSrc || branding.name),
  );
}

/**
 * First React paint must match the server. sessionStorage is client-only, so
 * it is applied only after hydrate (`allowClientCache`). Until then, use the
 * explicit page branding or the cookie the server already had.
 */
export function resolveLoaderBrandingForRender(
  pathname = "",
  options: {
    branding?: RouteLoaderBranding | null;
    lastCookie?: CachedBranding | null;
    params?: { slug?: string };
    allowClientCache?: boolean;
    walletEntryFromTenant?: boolean;
  } = {},
): RouteLoaderBranding | CachedBranding | null {
  const opts = { walletEntryFromTenant: options.walletEntryFromTenant };
  if (isPlatformLoaderPath(pathname, "", opts) || isLoginLoaderPath(pathname)) {
    return null;
  }
  if (hasTenantBranding(options.branding)) return options.branding;
  if (options.allowClientCache) {
    return getLoaderBranding(pathname, options.params, options.lastCookie, opts);
  }
  return lastBrandingIfCompatible(options.lastCookie || null, pathname, opts);
}

/** Infer an organization slug from common branded storefront paths. */
export function orgSlugFromPathname(pathname = ""): string | null {
  if (!pathname) return null;

  const packageMatch = pathname.match(/^\/([^/]+)\/(?:package|flex-pack)\//i);
  if (packageMatch && packageMatch[1].toLowerCase() !== "venue") {
    return packageMatch[1];
  }

  const orgMatch = pathname.match(/^\/([^/]+)\/?$/);
  if (orgMatch) {
    const segment = orgMatch[1];
    const reserved = new Set([
      "browse",
      "our-story",
      "login",
      "sign-out",
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
      "my-tickets",
      "my-profile",
      "giving",
      "wallet",
      "concert",
      "nm-state-ticketing",
      "season-tickets",
      "flex-pack",
      "e",
      "venue",
      "group",
    ]);
    if (!reserved.has(segment.toLowerCase())) return segment;
  }

  return null;
}

export function isBrandedLoaderPath(pathname = "") {
  if (!pathname) return false;
  if (orgSlugFromPathname(pathname)) return true;
  if (/^\/e\//.test(pathname)) return true;
  if (/^\/venue\/[^/]+\/(?:package|flex-pack)\//.test(pathname)) return true;
  return false;
}
