import { afterEach, describe, expect, it } from "vitest";
import {
  STRIPE_PAYMENT_SYNC_DELAY_MS,
  clearStripePaymentSyncMark,
  markStripePaymentSyncStarted,
  msUntilStripePaymentSyncReady,
} from "@/lib/stripePaymentSync";

describe("stripePaymentSync", () => {
  afterEach(() => {
    clearStripePaymentSyncMark();
  });

  it("waits the stripe-sync delay after payment succeeds", () => {
    const now = 1_000_000;
    markStripePaymentSyncStarted(now);
    expect(msUntilStripePaymentSyncReady(now)).toBe(STRIPE_PAYMENT_SYNC_DELAY_MS);
    expect(msUntilStripePaymentSyncReady(now + 12_000)).toBe(
      STRIPE_PAYMENT_SYNC_DELAY_MS - 12_000,
    );
  });

  it("does not wait when the stripe-sync delay has elapsed or was never started", () => {
    expect(msUntilStripePaymentSyncReady(1_000_000)).toBe(0);
    markStripePaymentSyncStarted(1_000_000);
    expect(
      msUntilStripePaymentSyncReady(1_000_000 + STRIPE_PAYMENT_SYNC_DELAY_MS),
    ).toBe(0);
  });
});
