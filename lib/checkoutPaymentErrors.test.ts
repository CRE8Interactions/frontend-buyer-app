import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_PAYMENT_COPY,
  paymentIntentLoadOutcome,
  processOrderDisplayMessage,
  stripeConfirmDisplayMessage,
  stripeSubmitDisplayMessage,
  waitForPaymentIntentSucceeded,
} from "@/lib/checkoutPaymentErrors";

function axiosError(status: number, data?: unknown) {
  return { response: { status, data } };
}

describe("checkout payment copy", () => {
  it("keeps Stripe submit and confirm messages when present", () => {
    expect(stripeSubmitDisplayMessage("Your card number is incomplete.")).toBe(
      "Your card number is incomplete.",
    );
    expect(stripeConfirmDisplayMessage("Your card was declined.")).toBe(
      "Your card was declined.",
    );
  });

  it("falls back when Stripe omits a message", () => {
    expect(stripeSubmitDisplayMessage()).toBe(
      CHECKOUT_PAYMENT_COPY.completeFailed,
    );
    expect(stripeConfirmDisplayMessage("")).toBe(
      CHECKOUT_PAYMENT_COPY.cardDeclined,
    );
  });

  it("leaves checkout when intent sees a gone cart and otherwise shows load copy", () => {
    expect(paymentIntentLoadOutcome(axiosError(404))).toBe("gone");
    expect(paymentIntentLoadOutcome(axiosError(410))).toBe("gone");
    expect(paymentIntentLoadOutcome(axiosError(500))).toBe("failed");
    expect(paymentIntentLoadOutcome(new Error("offline"))).toBe("failed");
  });

  it("maps process-order throws to the API message or complete-failed", () => {
    expect(
      processOrderDisplayMessage(
        axiosError(500, { error: { message: "Order could not be processed" } }),
      ),
    ).toBe("Order could not be processed");
    expect(processOrderDisplayMessage(axiosError(500))).toBe(
      CHECKOUT_PAYMENT_COPY.completeFailed,
    );
    expect(processOrderDisplayMessage(new Error("failed"))).toBe(
      CHECKOUT_PAYMENT_COPY.completeFailed,
    );
  });
});

describe("waitForPaymentIntentSucceeded", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats requires_payment_method and canceled as declined", async () => {
    const stripe = { retrievePaymentIntent: vi.fn() };
    await expect(
      waitForPaymentIntentSucceeded(stripe, "cs_test", {
        paymentIntent: { status: "requires_payment_method" },
      }),
    ).resolves.toEqual({ message: CHECKOUT_PAYMENT_COPY.cardDeclined });
    await expect(
      waitForPaymentIntentSucceeded(stripe, "cs_test", {
        paymentIntent: { status: "canceled" },
      }),
    ).resolves.toEqual({ message: CHECKOUT_PAYMENT_COPY.cardDeclined });
    expect(stripe.retrievePaymentIntent).not.toHaveBeenCalled();
  });

  it("returns still-processing copy when the intent never succeeds", async () => {
    vi.useFakeTimers();
    const stripe = {
      retrievePaymentIntent: vi.fn(async () => ({
        paymentIntent: { status: "processing" },
      })),
    };
    const pending = waitForPaymentIntentSucceeded(stripe, "cs_test", {
      paymentIntent: { status: "processing" },
    });
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual({
      message: CHECKOUT_PAYMENT_COPY.stillProcessing,
    });
  });
});
