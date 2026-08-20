import { describe, expect, it } from "vitest";
import { BLOCKTICKETS_NAVY } from "@/lib/branding";
import {
  CHECKOUT_HOLD_SECONDS,
  checkoutBrandingFromCart,
  checkoutHoldSeconds,
  formatHoldClock,
} from "@/lib/checkoutBranding";
import { DEMO_ORGS, demoCheckoutCart } from "@/lib/demo/fixtures";
import { cacheOrgBranding } from "@/lib/orgBrandingCache";

const raptors = DEMO_ORGS.find((org) => org.slug === "ogden-raptors")!;

describe("checkoutHoldSeconds", () => {
  it("defaults a missing hold to 10 minutes", () => {
    expect(checkoutHoldSeconds()).toBe(CHECKOUT_HOLD_SECONDS);
    expect(checkoutHoldSeconds(undefined)).toBe(CHECKOUT_HOLD_SECONDS);
  });

  it("keeps an already-expired hold at zero", () => {
    expect(checkoutHoldSeconds(0)).toBe(0);
  });

  it("converts millisecond remainingTime and caps at 10 minutes", () => {
    expect(checkoutHoldSeconds(CHECKOUT_HOLD_SECONDS * 1000)).toBe(
      CHECKOUT_HOLD_SECONDS,
    );
    expect(checkoutHoldSeconds(CHECKOUT_HOLD_SECONDS * 1000 + 50_000)).toBe(
      CHECKOUT_HOLD_SECONDS,
    );
    expect(checkoutHoldSeconds(CHECKOUT_HOLD_SECONDS + 90)).toBe(
      CHECKOUT_HOLD_SECONDS,
    );
  });
});

describe("formatHoldClock", () => {
  it("renders a 10-minute hold as m:ss", () => {
    expect(formatHoldClock(CHECKOUT_HOLD_SECONDS)).toBe("10:00");
  });

  it("does not render a four-digit minute count from a huge remainingTime", () => {
    expect(formatHoldClock(9929 * 60 + 12)).toBe("10:00");
  });
});

describe("checkoutBrandingFromCart", () => {
  it("uses the event organization branding from the checkout cart", () => {
    const branding = checkoutBrandingFromCart(demoCheckoutCart());

    expect(branding.orgLabel).toBe(raptors.name);
    expect(branding.theme.accent).toBe(raptors.branding.primaryColor);
  });

  it("uses cached org branding when the cart organization has none", () => {
    cacheOrgBranding(raptors);
    const cart = demoCheckoutCart({ organization: null });
    const branding = checkoutBrandingFromCart({
      ...cart,
      event: {
        ...cart.event,
        organization: { uuid: raptors.uuid },
      },
    });

    expect(branding.orgLabel).toBe(raptors.name);
    expect(branding.theme.accent).toBe(raptors.branding.primaryColor);
  });

  it("falls back to Blocktickets when the cart has no organization", () => {
    const branding = checkoutBrandingFromCart(
      demoCheckoutCart({ organization: null }),
      null,
    );

    expect(branding.orgLabel).toBe("Blocktickets");
    expect(branding.theme.accent).toBe(BLOCKTICKETS_NAVY);
    expect(branding.organization).toBeNull();
  });

  it("does not read the session cache when there is no cart yet", () => {
    cacheOrgBranding(raptors);
    const branding = checkoutBrandingFromCart(null, null);
    expect(branding.organization).toBeNull();
    expect(branding.orgLabel).toBe("Blocktickets");
  });

  it("uses last-used org branding when the cart has not loaded yet", () => {
    cacheOrgBranding(raptors);
    const branding = checkoutBrandingFromCart(null);
    expect(branding.orgLabel).toBe(raptors.name);
    expect(branding.theme.accent).toBe(raptors.branding.primaryColor);
  });
});
