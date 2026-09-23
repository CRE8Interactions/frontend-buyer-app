import { describe, expect, it } from "vitest";
import {
  checkoutPaymentElementOptions,
  paymentElementWallets,
} from "./stripePaymentElement";

describe("stripePaymentElement options", () => {
  it("leaves wallets on like legacy Payment.js wallets={true}", () => {
    expect(paymentElementWallets).toEqual({
      applePay: "auto",
      googlePay: "auto",
      link: "auto",
    });
    expect(checkoutPaymentElementOptions.wallets).toEqual(paymentElementWallets);
  });

  it("lets Stripe own billing collection and payment method order", () => {
    expect(checkoutPaymentElementOptions).not.toHaveProperty("fields");
    expect(checkoutPaymentElementOptions).not.toHaveProperty("defaultValues");
    expect(checkoutPaymentElementOptions).not.toHaveProperty(
      "paymentMethodOrder",
    );
    expect(checkoutPaymentElementOptions.terms.card).toBe("auto");
  });
});
