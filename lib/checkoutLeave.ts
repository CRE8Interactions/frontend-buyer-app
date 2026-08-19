import {
  getCheckoutReturnPath,
  type StoredCart,
} from "@/lib/cart";
import { eventPurchasePath, packagePurchasePath } from "@/lib/helpers";

export type CheckoutLeaveCart = {
  id?: string | number;
  event?: CheckoutLeaveEvent | null;
  organization?: { slug?: string } | null;
  package?: {
    uuid?: string | number;
    id?: string | number;
    organization?: { slug?: string } | null;
    venue?: { slug?: string } | null;
  } | null;
} | null;

export type CheckoutLeaveEvent = {
  uuid?: string;
  slug?: string;
  seoUrl?: string;
  shortCode?: string;
  shortcode?: string;
  seatmap?: { ga_only?: boolean };
  venue?: { isGeneralAdmissionOnly?: boolean };
} | null;

export function ticketsPathFromEvent(eventData?: CheckoutLeaveEvent) {
  const slug =
    (eventData?.slug as string | undefined) ||
    (eventData?.seoUrl as string | undefined);
  const code =
    (eventData?.shortCode as string | undefined) ||
    (eventData?.shortcode as string | undefined);
  if (!slug || !code) return "/";
  return eventPurchasePath({
    slug,
    seoUrl: eventData?.seoUrl,
    shortCode: code,
    shortcode: eventData?.shortcode,
    seatmap: eventData?.seatmap,
    venue: eventData?.venue,
  });
}

export function checkoutLeavePath(
  cart?: CheckoutLeaveCart,
  eventData?: CheckoutLeaveEvent,
) {
  const pkg = cart?.package;
  return (
    packagePurchasePath(
      pkg
        ? {
            ...pkg,
            organization: pkg.organization || cart?.organization || null,
          }
        : null,
    ) || ticketsPathFromEvent(eventData ?? cart?.event)
  );
}

/** Prefer the page the shopper came from; fall back to event/package purchase. */
export function resolveCheckoutReturnPath(
  cart?: CheckoutLeaveCart,
  eventData?: CheckoutLeaveEvent,
) {
  return getCheckoutReturnPath() || checkoutLeavePath(cart, eventData);
}

export function dropUserCartPayload(
  cart?: CheckoutLeaveCart,
  eventData?: CheckoutLeaveEvent,
  stored?: StoredCart | null,
) {
  const cartId = cart?.id ?? stored?.cartId;
  const packageUUID = cart?.package?.uuid ?? cart?.package?.id;
  const payload: {
    cartId?: string | number;
    eventUUID?: string;
    packageUUID?: string;
  } = { cartId };
  if (packageUUID != null && String(packageUUID).trim() !== "") {
    payload.packageUUID = String(packageUUID);
    return payload;
  }
  const eventUUID = eventData?.uuid || cart?.event?.uuid;
  if (eventUUID) payload.eventUUID = eventUUID;
  return payload;
}
