/** Normalize card last4 from order payloads (string, number, or formatted digits). */
export function resolveCardLast4(
  order: {
    last4?: string | number | null;
    paymentMethodType?: string | number | null;
  } | null,
): string {
  if (!order) return "";

  const value = order.last4;
  if (value != null && value !== "") {
    const digits =
      typeof value === "number" && Number.isFinite(value)
        ? String(Math.trunc(Math.abs(value)))
        : String(value).replace(/\D/g, "");
    if (digits.length >= 4) return digits.slice(-4);
    if (digits.length > 0) return digits.padStart(4, "0");
  }

  const type = String(order.paymentMethodType ?? "").trim();
  if (/^\d{4}$/.test(type)) return type;
  return "";
}

function formatPaymentMethodTypeLabel(
  paymentMethodType?: string | number | null,
): string {
  const raw = String(paymentMethodType ?? "").trim();
  if (!raw || /^\d{4}$/.test(raw)) return "Card";

  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

type OrderPaymentFields = {
  last4?: string | number | null;
  paymentMethodType?: string | number | null;
  paymentProcessor?: string | null;
};

export function formatOrderPaymentMethodSummary(
  order: OrderPaymentFields | null,
): string {
  if (!order) return "";
  if (
    order.paymentProcessor === "free" ||
    order.paymentMethodType === "complimentary"
  ) {
    return "Complimentary";
  }

  const label = formatPaymentMethodTypeLabel(order.paymentMethodType);
  const last4 = resolveCardLast4(order);
  return last4 ? `${label} ···· ${last4}` : label;
}

const CARD_BRANDS = new Set([
  "visa",
  "mastercard",
  "amex",
  "american express",
  "discover",
  "diners",
  "jcb",
  "unionpay",
  "card",
  "credit_card",
]);

/** True once Stripe (or a non-card method) has written payment details onto the order. */
export function orderPaymentDetailsReady(order: OrderPaymentFields | null) {
  if (!order) return false;
  const type = String(order.paymentMethodType ?? "").trim().toLowerCase();
  if (
    order.paymentProcessor === "free" ||
    type === "complimentary" ||
    type === "comp"
  ) {
    return true;
  }
  if (resolveCardLast4(order)) return true;
  return Boolean(type) && !CARD_BRANDS.has(type);
}

/** After the stripe-sync delay, poll until last4/brand are on the order. */
export const ORDER_PAYMENT_DETAILS_POLL_ATTEMPTS = 20;
export const ORDER_PAYMENT_DETAILS_POLL_DELAY_MS = 2_000;

let pollOptionsForTests: { attempts?: number; delayMs?: number } | null = null;

export function __setOrderPaymentDetailsPollForTests(
  options: { attempts?: number; delayMs?: number } | null,
) {
  pollOptionsForTests = options;
}

export function orderPaymentDetailsPollOptions() {
  return {
    attempts: Math.max(
      1,
      pollOptionsForTests?.attempts ?? ORDER_PAYMENT_DETAILS_POLL_ATTEMPTS,
    ),
    delayMs: Math.max(
      0,
      pollOptionsForTests?.delayMs ?? ORDER_PAYMENT_DETAILS_POLL_DELAY_MS,
    ),
  };
}

/** Reloads the order until payment details are synced, then returns the latest payload. */
export async function waitUntilOrderPaymentDetailsReady<T extends OrderPaymentFields>(
  load: () => Promise<T>,
  options?: { attempts?: number; delayMs?: number; signal?: AbortSignal },
): Promise<T> {
  const attempts = Math.max(1, options?.attempts ?? 10);
  const delayMs = Math.max(0, options?.delayMs ?? 400);
  let latest: T | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (options?.signal?.aborted) return latest as T;
    latest = await load();
    if (orderPaymentDetailsReady(latest)) return latest;
    if (attempt < attempts - 1 && delayMs > 0) {
      await new Promise<void>((resolve) => {
        if (options?.signal?.aborted) {
          resolve();
          return;
        }
        const timer = setTimeout(() => {
          options?.signal?.removeEventListener("abort", onAbort);
          resolve();
        }, delayMs);
        const onAbort = () => {
          clearTimeout(timer);
          resolve();
        };
        options?.signal?.addEventListener("abort", onAbort);
      });
    }
  }
  return latest as T;
}
