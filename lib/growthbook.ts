import { GrowthBook } from "@growthbook/growthbook-react";

/**
 * Singleton GrowthBook instance for the fan app.
 * Safe when env vars are missing — features stay off.
 *
 *   NEXT_PUBLIC_GROWTHBOOK_API_HOST=https://cdn.growthbook.io
 *   NEXT_PUBLIC_GROWTHBOOK_API_KEY=sdk-... (or gbk_...)
 */

export let growthbook: GrowthBook | null = null;

let started = false;

function createGrowthBook(attributes: Record<string, unknown> = {}) {
  const apiHost = process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST;
  const clientKey = process.env.NEXT_PUBLIC_GROWTHBOOK_API_KEY;

  const instance = new GrowthBook({
    enableDevMode: process.env.NODE_ENV !== "production",
    apiHost,
    clientKey,
  });

  instance.setAttributes({
    ...attributes,
    app: "frontend",
    environment: process.env.NODE_ENV || "development",
  });

  if (!apiHost || !clientKey) {
    instance.setFeatures({});
  }

  return instance;
}

/** Returns a stable GrowthBook instance for SSR + client (no network). */
export function getGrowthBook(attributes: Record<string, unknown> = {}) {
  if (!growthbook) {
    growthbook = createGrowthBook(attributes);
  }
  return growthbook;
}

/** Client-only network init. Safe to call repeatedly. */
export function initGrowthBook(attributes: Record<string, unknown> = {}) {
  const instance = getGrowthBook(attributes);
  if (typeof window === "undefined") return instance;
  if (started) return instance;

  const apiHost = process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST;
  const clientKey = process.env.NEXT_PUBLIC_GROWTHBOOK_API_KEY;

  if (!apiHost || !clientKey) {
    console.warn(
      "GrowthBook is not configured. Set NEXT_PUBLIC_GROWTHBOOK_API_HOST and NEXT_PUBLIC_GROWTHBOOK_API_KEY to enable feature flags.",
    );
    started = true;
    return instance;
  }

  instance.init({}).catch((error) => {
    console.warn("GrowthBook init failed", error);
  });
  started = true;
  return instance;
}

export function isOn(flagKey: string, fallback = false) {
  try {
    if (!growthbook) return !!fallback;
    return growthbook.isOn(flagKey);
  } catch {
    return !!fallback;
  }
}
