import { describe, expect, it } from "vitest";
import {
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
});
