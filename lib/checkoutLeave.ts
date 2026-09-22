import {
  getCheckoutReturnPath,
  type StoredCart,
} from "@/lib/cart";
import {
  eventPurchasePath,
  flexPackPurchasePath,
  packagePurchasePath,
} from "@/lib/helpers";
import { BACK_FALLBACK_HREF } from "@/lib/inAppBack";

type LeaveVenue = { slug?: string; [key: string]: unknown } | null;
type LeaveOrg = { slug?: string; [key: string]: unknown } | null;

export type CheckoutLeaveCart = {
  id?: string | number;
  event?: CheckoutLeaveEvent | null;
  organization?: LeaveOrg;
  tickets?: Array<{
    generalAdmission?: boolean;
    GA?: boolean;
    [key: string]: unknown;
  }>;
  package?: {
    uuid?: string | number;
    id?: string | number;
    organization?: LeaveOrg;
    venue?: LeaveVenue;
    [key: string]: unknown;
  } | null;
  flex_pack?: {
    uuid?: string | number;
    id?: string | number;
    organization?: LeaveOrg;
    venue?: LeaveVenue;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
} | null;

export type CheckoutLeaveEvent = {
  uuid?: string;
  slug?: string;
  seoUrl?: string;
  shortCode?: string;
  shortcode?: string;
  isGeneralAdmissionOnly?: boolean;
  generalAdmissionOnly?: boolean;
  seatmap?: { ga_only?: boolean };
  venue?: { isGeneralAdmissionOnly?: boolean; [key: string]: unknown };
  [key: string]: unknown;
} | null;

function eventIsGaOnly(eventData?: CheckoutLeaveEvent) {
  return Boolean(
    eventData?.isGeneralAdmissionOnly ||
      eventData?.generalAdmissionOnly ||
      eventData?.seatmap?.ga_only ||
      eventData?.venue?.isGeneralAdmissionOnly,
  );
}

function cartTicketsAreGaOnly(cart?: CheckoutLeaveCart) {
  const tickets = cart?.tickets;
  if (!Array.isArray(tickets) || tickets.length === 0) return false;
  return tickets.every((ticket) => Boolean(ticket.generalAdmission || ticket.GA));
}

/** Cart events often omit seatmap.ga_only — held GA tickets still mean the GA page. */
function leaveEventIsGaOnly(
  cart?: CheckoutLeaveCart,
  eventData?: CheckoutLeaveEvent,
) {
  return eventIsGaOnly(eventData) || cartTicketsAreGaOnly(cart);
}

function eventIdentityFromPath(path: string) {
  const parts = (path.split(/[?#]/)[0] || "")
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean);
  if (parts[0]?.toLowerCase() !== "e" || parts.length < 3) return null;
  return {
    slug: parts[1].toLowerCase(),
    code: parts[2].toLowerCase(),
  };
}

export function ticketsPathFromEvent(
  eventData?: CheckoutLeaveEvent,
  gaOnly = false,
) {
  const slug =
    (eventData?.slug as string | undefined) ||
    (eventData?.seoUrl as string | undefined);
  const code =
    (eventData?.shortCode as string | undefined) ||
    (eventData?.shortcode as string | undefined);
  if (!slug || !code) return BACK_FALLBACK_HREF;
  return eventPurchasePath({
    slug,
    seoUrl: eventData?.seoUrl,
    shortCode: code,
    shortcode: eventData?.shortcode,
    isGeneralAdmissionOnly: eventData?.isGeneralAdmissionOnly || gaOnly,
    generalAdmissionOnly: eventData?.generalAdmissionOnly,
    seatmap: eventData?.seatmap,
    venue: eventData?.venue,
  });
}

type LeaveOrganization = LeaveOrg | undefined;

/** Cart payloads often carry an org without a slug — keep looking for one. */
function firstOrgWithSlug(...candidates: LeaveOrganization[]) {
  for (const org of candidates) {
    if (String(org?.slug || "").trim()) return org ?? null;
  }
  return null;
}

/**
 * `orgSlug` is the team checkout is already branded as; it keeps a package or
 * flex pack on its team route when the cart omits the org slug.
 */
export function checkoutLeavePath(
  cart?: CheckoutLeaveCart,
  eventData?: CheckoutLeaveEvent,
  orgSlug?: string | null,
) {
  const pkg = cart?.package;
  const pack = cart?.flex_pack;
  const fallbackOrg = firstOrgWithSlug(
    cart?.organization,
    orgSlug ? { slug: orgSlug } : null,
  );
  return (
    packagePurchasePath(
      pkg
        ? {
            ...pkg,
            organization: firstOrgWithSlug(pkg.organization, fallbackOrg),
          }
        : null,
    ) ||
    flexPackPurchasePath(
      pack
        ? {
            ...pack,
            organization: firstOrgWithSlug(pack.organization, fallbackOrg),
          }
        : null,
    ) ||
    ticketsPathFromEvent(
      eventData ?? cart?.event,
      leaveEventIsGaOnly(cart, eventData ?? cart?.event),
    )
  );
}

function normalizePath(path: string) {
  return (path.split("#")[0] || "").replace(/\/+$/, "") || "/";
}

/**
 * Leaving checkout must never stack another entry on top of it, or Back lands
 * on a dead cart. Pop it when the shopper came straight from where we're
 * sending them; otherwise swap checkout out of the history.
 *
 * A /login bounce leaves the login page between checkout and that page, so
 * popping would land on login instead of the tickets / package / flex pack.
 */
export function shouldPopCheckoutHistory(
  dest: string,
  returnPath?: string | null,
  loginDetour = false,
) {
  if (!dest || !returnPath || loginDetour) return false;
  return normalizePath(returnPath) === normalizePath(dest);
}

/**
 * Ticket carts must return to this event's purchase page. A leftover /e/...
 * path from another event, or the seated /tickets/ URL of a GA event, would
 * send the shopper to the wrong listing.
 */
function usableStoredReturnPath(
  stored: string,
  cart?: CheckoutLeaveCart,
) {
  if (cart?.package || cart?.flex_pack) return stored;
  if (eventIdentityFromPath(stored)) return null;
  return stored;
}

/** Prefer the page the shopper came from; fall back to event/package purchase. */
export function resolveCheckoutReturnPath(
  cart?: CheckoutLeaveCart,
  eventData?: CheckoutLeaveEvent,
  orgSlug?: string | null,
) {
  const leave = checkoutLeavePath(cart, eventData, orgSlug);
  const stored = getCheckoutReturnPath();
  if (!stored) return leave;
  return usableStoredReturnPath(stored, cart) || leave;
}

export function dropUserCartPayload(
  cart?: CheckoutLeaveCart,
  eventData?: CheckoutLeaveEvent,
  stored?: StoredCart | null,
) {
  const cartId = cart?.id ?? stored?.cartId;
  const packageUUID = cart?.package?.uuid ?? cart?.package?.id;
  const flexPackUUID = cart?.flex_pack?.uuid ?? cart?.flex_pack?.id;
  const payload: {
    cartId?: string | number;
    eventUUID?: string;
    packageUUID?: string;
    flexPackUUID?: string;
  } = { cartId };
  if (packageUUID != null && String(packageUUID).trim() !== "") {
    payload.packageUUID = String(packageUUID);
    return payload;
  }
  if (flexPackUUID != null && String(flexPackUUID).trim() !== "") {
    payload.flexPackUUID = String(flexPackUUID);
    return payload;
  }
  const eventUUID = eventData?.uuid || cart?.event?.uuid;
  if (eventUUID) payload.eventUUID = eventUUID;
  return payload;
}
