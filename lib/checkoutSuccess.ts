import { beginRouteTransition } from "@/lib/routeTransition";
import { markStripePaymentSyncStarted } from "@/lib/stripePaymentSync";

/** Confirmation path after a PaymentIntent succeeds. */
export function checkoutSuccessPath(intentId: string) {
  return `/checkout/success/?intentId=${encodeURIComponent(intentId)}`;
}

/** Absolute URL Stripe should return to after a redirect payment (3DS, Link). */
export function checkoutSuccessReturnUrl(intentId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${checkoutSuccessPath(intentId)}`;
}

/** Intent id when Stripe sends the shopper back to checkout after a successful redirect. */
export function succeededStripeRedirectIntentId(
  search: Pick<URLSearchParams, "get"> | string,
) {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  if (params.get("redirect_status") !== "succeeded") return "";
  return String(params.get("payment_intent") || "").trim();
}

/**
 * Leave checkout for confirmation and drop the checkout history entry so a
 * succeeded PaymentIntent cannot remount the card form. `replace` is the
 * router's, so the app keeps this document and the browser tab never spins.
 */
export function leaveCheckoutForSuccess(
  intentId: string,
  replace: (href: string) => void,
) {
  const id = String(intentId || "").trim();
  if (!id) return;
  markStripePaymentSyncStarted();
  const href = checkoutSuccessPath(id);
  beginRouteTransition(href);
  replace(href);
}

export function paymentIntentAlreadySucceeded(status?: string | null) {
  return String(status || "").trim().toLowerCase() === "succeeded";
}
