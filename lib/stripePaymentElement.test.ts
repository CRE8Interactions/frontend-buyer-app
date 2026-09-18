import { describe, expect, it } from "vitest";
import {
  checkoutPaymentElementDefaultValues,
  checkoutPaymentElementOptions,
  checkoutPaymentElementOptionsForProtocol,
  paymentElementWalletsForProtocol,
} from "./stripePaymentElement";

describe("stripePaymentElement wallets", () => {
  it("enables wallets on HTTPS", () => {
    expect(paymentElementWalletsForProtocol("https:")).toEqual({
      applePay: "auto",
      googlePay: "auto",
      link: "auto",
    });
  });

  it("disables wallets on plain HTTP so local dev skips Link and wallet tabs", () => {
    expect(paymentElementWalletsForProtocol("http:")).toEqual({
      applePay: "never",
      googlePay: "never",
      link: "never",
    });
  });

  it("passes protocol-specific wallets into checkout Payment Element options", () => {
    expect(checkoutPaymentElementOptionsForProtocol("http:").wallets).toEqual({
      applePay: "never",
      googlePay: "never",
      link: "never",
    });
  });

  it("lets Stripe collect country and postal inside the Payment Element", () => {
    expect(checkoutPaymentElementOptions.fields.billingDetails.address).toEqual({
      country: "auto",
      postalCode: "auto",
      line1: "never",
      line2: "never",
      city: "never",
      state: "never",
    });
    expect(checkoutPaymentElementOptions.terms.card).toBe("auto");
  });

  it("prefills Stripe's country from the cart or shopper IP", () => {
    expect(checkoutPaymentElementDefaultValues("CA")).toEqual({
      billingDetails: {
        address: {
          country: "CA",
        },
      },
    });
  });
});
