import { describe, expect, it } from "vitest";
import {
  CHECKOUT_LOADER_MESSAGE,
  CHECKOUT_SUCCESS_LOADER_MESSAGE,
  LOADER_MESSAGE,
  loaderMessageForPath,
} from "@/lib/loaderMessages";

describe("loaderMessageForPath", () => {
  it("uses payment copy on checkout and confirmation", () => {
    expect(loaderMessageForPath("/checkout/")).toBe(CHECKOUT_LOADER_MESSAGE);
    expect(loaderMessageForPath("/checkout/?cartId=1")).toBe(
      CHECKOUT_LOADER_MESSAGE,
    );
    expect(loaderMessageForPath("/checkout/checkout-success/")).toBe(
      CHECKOUT_SUCCESS_LOADER_MESSAGE,
    );
    expect(
      loaderMessageForPath("/checkout/checkout-success/?intentId=pi_test"),
    ).toBe(CHECKOUT_SUCCESS_LOADER_MESSAGE);
  });

  it("keeps loading tickets on other shopper routes", () => {
    expect(loaderMessageForPath("/e/ogden-raptors/rapt006/tickets/")).toBe(
      LOADER_MESSAGE,
    );
    expect(loaderMessageForPath("/")).toBe(LOADER_MESSAGE);
  });
});
