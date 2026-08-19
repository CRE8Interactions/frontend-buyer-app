import { describe, expect, it, vi } from "vitest";
import {
  formatOrderPaymentMethodSummary,
  orderPaymentDetailsReady,
  resolveCardLast4,
  waitUntilOrderPaymentDetailsReady,
} from "@/lib/orderPayment";

describe("orderPayment", () => {
  it("reads numeric last4 values from the order", () => {
    expect(resolveCardLast4({ last4: 4242 })).toBe("4242");
  });

  it("strips non-digit formatting from last4 strings", () => {
    expect(resolveCardLast4({ last4: "4,242" })).toBe("4242");
  });

  it("shows paymentMethodType beside card last4", () => {
    expect(
      formatOrderPaymentMethodSummary({
        paymentMethodType: "visa",
        last4: 4242,
      }),
    ).toBe("Visa ···· 4242");
  });

  it("uses paymentMethodType alone when last4 is unavailable", () => {
    expect(formatOrderPaymentMethodSummary({ paymentMethodType: "cash" })).toBe(
      "Cash",
    );
  });

  it("treats complimentary and card last4 as synced payment details", () => {
    expect(
      orderPaymentDetailsReady({ paymentMethodType: "complimentary" }),
    ).toBe(true);
    expect(orderPaymentDetailsReady({ last4: 4242 })).toBe(true);
    expect(
      orderPaymentDetailsReady({ paymentMethodType: "visa", last4: 4242 }),
    ).toBe(true);
    expect(orderPaymentDetailsReady({ paymentMethodType: "cash" })).toBe(true);
    expect(orderPaymentDetailsReady({ paymentMethodType: "visa" })).toBe(false);
    expect(orderPaymentDetailsReady({ paymentMethodType: "card" })).toBe(false);
    expect(orderPaymentDetailsReady({})).toBe(false);
  });

  it("reloads the order until Stripe payment details are present", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ paymentMethodType: "visa", last4: 4242 });

    await expect(
      waitUntilOrderPaymentDetailsReady(load, { delayMs: 0 }),
    ).resolves.toEqual({ paymentMethodType: "visa", last4: 4242 });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("returns the latest order when payment details never sync", async () => {
    const load = vi.fn().mockResolvedValue({ total: 7.5 });
    await expect(
      waitUntilOrderPaymentDetailsReady(load, { attempts: 3, delayMs: 0 }),
    ).resolves.toEqual({ total: 7.5 });
    expect(load).toHaveBeenCalledTimes(3);
  });
});
