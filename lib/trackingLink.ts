const TRACKING_CODE = /^\d{4,12}$/;

function storageKey(eventUUID: string) {
  return `trackingLink:${eventUUID}`;
}

type CartTrackingSource = {
  eventUUID?: string | null;
  event?: unknown;
};

function uuidFromUnknown(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (!("uuid" in value)) return undefined;
  const uuid = (value as { uuid?: unknown }).uuid;
  return typeof uuid === "string" ? uuid : undefined;
}

/** Persist a numeric tracking-link code from `?code=` on the event URL. */
export function rememberTrackingCode(
  eventUUID: string | null | undefined,
  trackingCode: string | null | undefined,
) {
  if (!eventUUID || !trackingCode || trackingCode === "0") return;
  if (!TRACKING_CODE.test(trackingCode)) return;
  try {
    sessionStorage.setItem(storageKey(eventUUID), trackingCode);
  } catch {
    /* quota / private mode */
  }
}

export function readTrackingCode(eventUUID: string | null | undefined) {
  if (!eventUUID) return null;
  try {
    const stored = sessionStorage.getItem(storageKey(eventUUID));
    if (!stored || stored === "0" || !TRACKING_CODE.test(stored)) return null;
    return stored;
  } catch {
    return null;
  }
}

export function readTrackingCodeForCart(
  cart: CartTrackingSource | null | undefined,
) {
  return readTrackingCode(cart?.eventUUID || uuidFromUnknown(cart?.event));
}
