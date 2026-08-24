import { isZeroFeeCompFlexPackCart } from "@/lib/helpers";
import {
  emailLooksInvalid,
  nameFieldError,
  normalizeEmail,
} from "@/lib/fieldValidation";

export const GUEST_CHECKOUT_KEY = "guestCheckout";

export type GuestBuyer = {
  email: string;
  firstName: string;
  lastName: string;
};

export type GuestCheckoutCart = {
  tickets?: Array<{
    free?: boolean;
    offer?: { freeOffer?: boolean } | unknown;
    [key: string]: unknown;
  }>;
  package?: unknown | null;
  flex_pack?: { price?: unknown } | null;
  access_pass_template?: unknown | null;
};

export function isComplimentaryWebsiteCart(cart: GuestCheckoutCart | null) {
  if (!cart) return false;
  if (cart.flex_pack && isZeroFeeCompFlexPackCart(cart.flex_pack)) return true;
  if (cart.flex_pack || cart.package || cart.access_pass_template) return false;
  const tickets = cart.tickets || [];
  if (!tickets.length) return false;
  return tickets.every((ticket) => {
    if (ticket.free === true) return true;
    const offer = ticket.offer as { freeOffer?: boolean } | undefined;
    return Boolean(offer && typeof offer === "object" && offer.freeOffer === true);
  });
}

/** Backend guest checkout only supports regular paid ticket carts. */
export function isGuestEligibleCart(cart: GuestCheckoutCart | null) {
  if (!cart) return false;
  if (isComplimentaryWebsiteCart(cart)) return false;
  if (cart.package || cart.flex_pack || cart.access_pass_template) return false;
  return Array.isArray(cart.tickets) && cart.tickets.length > 0;
}

export function parseGuestBuyer(input: {
  email: string;
  firstName: string;
  lastName: string;
}): GuestBuyer | null {
  const email = normalizeEmail(input.email);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!email || emailLooksInvalid(email)) return null;
  if (nameFieldError(firstName) || nameFieldError(lastName)) return null;
  return { email, firstName, lastName };
}

export function setGuestCheckoutEmail(email: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      GUEST_CHECKOUT_KEY,
      JSON.stringify({ email: normalizeEmail(email) }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function getGuestCheckoutEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = sessionStorage.getItem(GUEST_CHECKOUT_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { email?: string };
    return typeof parsed?.email === "string" ? parsed.email : "";
  } catch {
    return "";
  }
}

export function clearGuestCheckout() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(GUEST_CHECKOUT_KEY);
  } catch {
    /* ignore */
  }
}
