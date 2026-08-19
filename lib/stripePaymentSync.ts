/** Matches tickets `DEFAULT_STRIPE_SYNC_DELAY_MS` on the stripe-sync job. */
export const STRIPE_PAYMENT_SYNC_DELAY_MS = 30_000;

const READY_AT_KEY = "bt-stripe-sync-ready-at";

export function markStripePaymentSyncStarted(now = Date.now()) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(
    READY_AT_KEY,
    String(now + STRIPE_PAYMENT_SYNC_DELAY_MS),
  );
}

export function clearStripePaymentSyncMark() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(READY_AT_KEY);
}

/** Remaining ms until stripe-sync is expected to have written payment details. */
export function msUntilStripePaymentSyncReady(now = Date.now()) {
  if (typeof sessionStorage === "undefined") return 0;
  const readyAt = Number(sessionStorage.getItem(READY_AT_KEY));
  if (!Number.isFinite(readyAt)) return 0;
  return Math.max(0, readyAt - now);
}
