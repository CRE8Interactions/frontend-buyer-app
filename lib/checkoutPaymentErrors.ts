import { isCartGoneResponse } from "@/lib/helpers";

/**
 * Checkout POST /payment/intent and POST /orders/process.
 * See docs/payment-validations.mmd.
 */
export const CHECKOUT_PAYMENT_COPY = {
  noCart: "No cart found. Please select tickets again.",
  loadFailed: "Unable to load checkout. Please try again.",
  completeFailed: "Unable to complete purchase. Please try again.",
  cardDeclined: "Card declined",
  stillProcessing: "Payment is still processing. Please wait a moment.",
} as const;

export const PAYMENT_INTENT_POLL_MS = 15_000;
const PAYMENT_INTENT_POLL_STEP_MS = 400;

export function stripeSubmitDisplayMessage(message?: string | null) {
  return message?.trim() || CHECKOUT_PAYMENT_COPY.completeFailed;
}

export function stripeConfirmDisplayMessage(message?: string | null) {
  return message?.trim() || CHECKOUT_PAYMENT_COPY.cardDeclined;
}

export function paymentIntentLoadOutcome(
  error: unknown,
): "gone" | "failed" {
  return isCartGoneResponse(error) ? "gone" : "failed";
}

function processOrderApiMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    const record = data as {
      error?: { message?: unknown } | string;
      message?: unknown;
    };
    const nested =
      typeof record.error === "string"
        ? record.error
        : record.error?.message ?? record.message;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }
  return undefined;
}

export function processOrderDisplayMessage(error: unknown) {
  return processOrderApiMessage(error) || CHECKOUT_PAYMENT_COPY.completeFailed;
}

export async function waitForPaymentIntentSucceeded(
  stripe: {
    retrievePaymentIntent: (clientSecret: string) => Promise<{
      error?: { message?: string } | null;
      paymentIntent?: { status?: string } | null;
    }>;
  },
  clientSecret: string,
  confirmed: {
    error?: { message?: string } | null;
    paymentIntent?: { status?: string } | null;
  },
) {
  if (confirmed.error) return confirmed.error;
  let status = confirmed.paymentIntent?.status;
  if (!status || status === "succeeded") return null;
  if (status === "requires_payment_method" || status === "canceled") {
    return { message: CHECKOUT_PAYMENT_COPY.cardDeclined };
  }

  const deadline = Date.now() + PAYMENT_INTENT_POLL_MS;
  while (Date.now() < deadline) {
    const retrieved = await stripe.retrievePaymentIntent(clientSecret);
    if (retrieved.error) return retrieved.error;
    status = retrieved.paymentIntent?.status;
    if (status === "succeeded") return null;
    if (status === "requires_payment_method" || status === "canceled") {
      return { message: CHECKOUT_PAYMENT_COPY.cardDeclined };
    }
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, PAYMENT_INTENT_POLL_STEP_MS);
    });
  }
  return { message: CHECKOUT_PAYMENT_COPY.stillProcessing };
}
