import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkoutSuccessPath,
  checkoutSuccessReturnUrl,
  leaveCheckoutForSuccess,
  paymentIntentAlreadySucceeded,
  succeededStripeRedirectIntentId,
} from "@/lib/checkoutSuccess";
import { msUntilStripePaymentSyncReady } from "@/lib/stripePaymentSync";

describe("checkoutSuccessPath", () => {
  it("sends confirmation to the payment intent", () => {
    expect(checkoutSuccessPath("pi_flex")).toBe(
      "/checkout/success/?intentId=pi_flex",
    );
  });
});

describe("checkoutSuccessReturnUrl", () => {
  it("points Stripe redirects at confirmation, not checkout", () => {
    expect(checkoutSuccessReturnUrl("pi_flex")).toBe(
      `${window.location.origin}/checkout/success/?intentId=pi_flex`,
    );
  });
});

describe("succeededStripeRedirectIntentId", () => {
  it("reads the intent when Stripe reports a succeeded redirect", () => {
    expect(
      succeededStripeRedirectIntentId(
        "cartId=cart-flex-1&payment_intent=pi_flex&redirect_status=succeeded",
      ),
    ).toBe("pi_flex");
  });

  it("does not treat a failed Stripe redirect as confirmation", () => {
    expect(
      succeededStripeRedirectIntentId(
        "payment_intent=pi_flex&redirect_status=failed",
      ),
    ).toBe("");
  });
});

describe("leaveCheckoutForSuccess", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("replaces checkout with confirmation so the card form cannot remount", () => {
    const replace = vi.fn();

    leaveCheckoutForSuccess("pi_flex", replace);

    // A router path, not an absolute URL: a document load would spin the tab.
    expect(replace).toHaveBeenCalledWith("/checkout/success/?intentId=pi_flex");
    expect(msUntilStripePaymentSyncReady()).toBeGreaterThan(0);
  });

  it("stays on checkout when there is no payment intent to confirm", () => {
    const replace = vi.fn();

    leaveCheckoutForSuccess("  ", replace);

    expect(replace).not.toHaveBeenCalled();
  });
});

describe("paymentIntentAlreadySucceeded", () => {
  it("treats only a succeeded PaymentIntent as finished", () => {
    expect(paymentIntentAlreadySucceeded("succeeded")).toBe(true);
    expect(paymentIntentAlreadySucceeded("requires_payment_method")).toBe(
      false,
    );
  });
});
