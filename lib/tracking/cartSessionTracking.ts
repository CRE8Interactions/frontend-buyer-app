import { completeCartSession, trackCartSessionEvent } from "@/lib/api";

const CART_SESSION_STORAGE_KEY = "cartSession";

function getCartSessionClientInfo() {
  if (typeof navigator === "undefined") {
    return {
      device_type: "desktop",
      browser: "Other",
      os: "Unknown",
      userAgent: "",
    };
  }

  const ua = navigator.userAgent || "";
  let device_type = "desktop";

  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) {
    device_type = "tablet";
  } else if (
    /Mobile|Android|iPhone|iPod|IEMobile|BlackBerry|Opera Mini/i.test(ua)
  ) {
    device_type = "mobile";
  }

  let browser = "Other";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";

  let os = "Unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return {
    device_type,
    browser,
    os,
    userAgent: ua,
  };
}

export function readStoredCartSession(): {
  cartId?: string | number | null;
  sessionId?: string | null;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CART_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeCartSession({
  cartId,
  sessionId,
}: {
  cartId?: string | number | null;
  sessionId?: string | null;
}) {
  if (typeof window === "undefined" || (!cartId && !sessionId)) return;
  sessionStorage.setItem(
    CART_SESSION_STORAGE_KEY,
    JSON.stringify({
      cartId,
      sessionId: sessionId || readStoredCartSession()?.sessionId || null,
    }),
  );
}

export function clearStoredCartSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CART_SESSION_STORAGE_KEY);
}

function buildTrackingPayload({
  cartId,
  sessionId,
  eventType,
  checkoutStage,
  metadata,
}: {
  cartId?: string | number | null;
  sessionId?: string | null;
  eventType?: string;
  checkoutStage?: string;
  metadata?: Record<string, unknown>;
}) {
  const stored = readStoredCartSession();
  return {
    cartId: cartId || stored?.cartId || null,
    sessionId: sessionId || stored?.sessionId || null,
    eventType,
    checkoutStage,
    metadata,
    clientMeta: getCartSessionClientInfo(),
  };
}

export async function trackCheckoutStarted(
  cartId?: string | number | null,
  sessionId?: string | null,
) {
  const payload = buildTrackingPayload({
    cartId,
    sessionId,
    eventType: "checkout_started",
    checkoutStage: "payment",
  });

  if (!payload.cartId && !payload.sessionId) return null;

  try {
    const res = await trackCartSessionEvent(payload);
    const sessionIdFromRes = (
      res?.data as { sessionId?: string } | undefined
    )?.sessionId;
    if (sessionIdFromRes) {
      storeCartSession({
        cartId: payload.cartId,
        sessionId: sessionIdFromRes,
      });
    }
    return res;
  } catch (err) {
    console.warn("[cart-session] checkout_started tracking failed", err);
    return null;
  }
}

export async function trackCheckoutStage(
  checkoutStage: string,
  metadata: Record<string, unknown> = {},
  cartId?: string | number | null,
) {
  const payload = buildTrackingPayload({
    cartId,
    checkoutStage,
    metadata,
  });

  if (!payload.cartId && !payload.sessionId) return null;

  try {
    return await trackCartSessionEvent(payload);
  } catch (err) {
    console.warn("[cart-session] stage tracking failed", err);
    return null;
  }
}

export async function trackCheckoutCompleted(
  cartId?: string | number | null,
  sessionId?: string | null,
) {
  const payload = buildTrackingPayload({ cartId, sessionId });

  if (!payload.cartId && !payload.sessionId) return null;

  try {
    await completeCartSession(payload);
    clearStoredCartSession();
  } catch (err) {
    console.warn("[cart-session] complete tracking failed", err);
    return null;
  }
}
