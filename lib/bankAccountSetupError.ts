/** Message shown when Stripe bank-account setup cannot be opened. */
export const BANK_ACCOUNT_SETUP_FALLBACK =
  "Unable to open bank account setup. Try again.";

/** Prefer the API error message from POST /payment-information/generate. */
export function bankAccountSetupError(err: unknown): string {
  const message = (
    err as { response?: { data?: { error?: { message?: unknown } } } }
  )?.response?.data?.error?.message;
  if (typeof message === "string" && message.trim()) return message.trim();
  return BANK_ACCOUNT_SETUP_FALLBACK;
}
