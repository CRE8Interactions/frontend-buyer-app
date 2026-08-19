import {
  BLOCKTICKETS_NAVY,
  brandingToTicketingTheme,
  getActiveBranding,
  resolveBrandLogo,
  type BrandingEvent,
  type BrandingOrganization,
  type TicketingTheme,
} from "@/lib/branding";
import {
  getCachedBrandingForPath,
  getCachedOrgBranding,
  type CachedBranding,
} from "@/lib/orgBrandingCache";

export type CheckoutCartBrandingSource = {
  event?: (BrandingEvent & {
    slug?: string;
    seoUrl?: string;
    shortCode?: string;
    shortcode?: string;
  }) | null;
  package?: { organization?: BrandingOrganization | null } | null;
  flex_pack?: { organization?: BrandingOrganization | null } | null;
  access_pass_template?: { organization?: BrandingOrganization | null } | null;
};

export type CheckoutBranding = {
  theme: TicketingTheme;
  orgLabel: string;
  organization: BrandingOrganization | null;
};

function cartOrganization(
  cart?: CheckoutCartBrandingSource | null,
): BrandingOrganization | null {
  return (
    cart?.event?.organization ||
    cart?.package?.organization ||
    cart?.flex_pack?.organization ||
    cart?.access_pass_template?.organization ||
    null
  );
}

function organizationFromCache(
  cached?: CachedBranding | null,
): BrandingOrganization | null {
  if (!cached?.primaryColor) return null;
  return {
    name: cached.name || undefined,
    slug: cached.slug || undefined,
    branding: {
      enabled: true,
      primaryColor: cached.primaryColor,
      logo: cached.logoSrc ? { url: cached.logoSrc } : undefined,
    },
  };
}

function cartHasUsableBranding(
  event: BrandingEvent | null | undefined,
  organization: BrandingOrganization | null,
) {
  const active = getActiveBranding(event, organization);
  return Boolean(
    (active &&
      active.enabled !== false &&
      (active.primaryColor ||
        active.buttonColor ||
        active.logo ||
        active.darkLogo)) ||
      resolveBrandLogo(event, organization),
  );
}

/** Session branding from tickets/org pages — cart payloads often omit it. */
export function cachedBrandingForCheckout(
  cart?: CheckoutCartBrandingSource | null,
): CachedBranding | null {
  if (typeof window === "undefined") return null;
  const event = cart?.event;
  const eventSlug = event?.seoUrl || event?.slug;
  const code = event?.shortCode || event?.shortcode;
  if (eventSlug && code) {
    const fromEvent = getCachedBrandingForPath(`/e/${eventSlug}/${code}`);
    if (fromEvent?.primaryColor) return fromEvent;
  }
  return getCachedOrgBranding(cartOrganization(cart)?.slug);
}

export function checkoutBrandingFromCart(
  cart?: CheckoutCartBrandingSource | null,
  cached: CachedBranding | null | undefined = undefined,
): CheckoutBranding {
  const cartOrg = cartOrganization(cart);
  const resolvedCache =
    cached === undefined ? cachedBrandingForCheckout(cart) : cached;
  const cachedOrg = organizationFromCache(resolvedCache);
  const event = cart?.event || null;
  const organization =
    cartHasUsableBranding(event, cartOrg) || !cachedOrg
      ? cartOrg
      : {
          ...cachedOrg,
          ...cartOrg,
          name: cartOrg?.name || cachedOrg.name,
          slug: cartOrg?.slug || cachedOrg.slug,
          branding: cachedOrg.branding,
        };

  const theme = brandingToTicketingTheme(event, organization);
  return {
    theme,
    orgLabel: organization?.name || "Blocktickets",
    organization,
  };
}

/** Seat holds are 10 minutes; some carts send remainingTime in milliseconds. */
export const CHECKOUT_HOLD_SECONDS = 10 * 60;

export function checkoutHoldSeconds(remainingTime?: number | null): number {
  if (remainingTime == null || !Number.isFinite(Number(remainingTime))) {
    return CHECKOUT_HOLD_SECONDS;
  }
  let seconds = Number(remainingTime);
  if (seconds > CHECKOUT_HOLD_SECONDS) {
    seconds = seconds / 1000;
  }
  return Math.min(
    CHECKOUT_HOLD_SECONDS,
    Math.max(0, Math.floor(seconds)),
  );
}

export function formatHoldClock(remainingSeconds?: number | null): string | null {
  if (
    remainingSeconds == null ||
    !Number.isFinite(Number(remainingSeconds)) ||
    Number(remainingSeconds) < 0
  ) {
    return null;
  }
  const total = Math.min(
    CHECKOUT_HOLD_SECONDS,
    Math.max(0, Math.floor(Number(remainingSeconds))),
  );
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function resolveCheckoutTax(cart?: {
  totalTax?: number;
  salesTax?: number;
} | null): number {
  return Number(cart?.totalTax ?? cart?.salesTax ?? 0);
}
