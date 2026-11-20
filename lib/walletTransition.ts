import { isWalletAccountPath } from "@/lib/orgBrandingCache";
import { routePathKey } from "@/lib/routeTransition";

export const WALLET_NAVIGATION_EVENT = "blocktickets:wallet-navigation";

let pendingPath: string | null = null;
let walletNavigationMounts = 0;
/** True when this destination was chosen while the wallet screen was already open. */
let pendingStartedWhileMounted = false;

export function getWalletNavigationPending() {
  return pendingPath;
}

export function noteWalletNavigationMounted() {
  walletNavigationMounts += 1;
}

export function noteWalletNavigationUnmounted() {
  walletNavigationMounts = Math.max(0, walletNavigationMounts - 1);
}

/** A click from inside the wallet must survive the navigation's remount. */
export function pendingWalletNavigationSurvivesRemount() {
  return pendingStartedWhileMounted;
}

/** Immediate feedback for in-wallet link clicks before Next.js commits the URL. */
export function beginWalletNavigation(href: string) {
  if (typeof window === "undefined" || !href) return;

  const destination = new URL(href, window.location.href);
  if (destination.origin !== window.location.origin) return;
  if (!isWalletAccountPath(destination.pathname)) return;

  const next = routePathKey(destination.pathname);
  const current = routePathKey(window.location.pathname);
  if (next === current) return;

  pendingStartedWhileMounted = walletNavigationMounts > 0;
  pendingPath = next;
  window.dispatchEvent(
    new CustomEvent(WALLET_NAVIGATION_EVENT, { detail: { path: next } }),
  );
}

export function clearWalletNavigation() {
  if (!pendingPath && !pendingStartedWhileMounted) return;
  pendingPath = null;
  pendingStartedWhileMounted = false;
  window.dispatchEvent(new Event(WALLET_NAVIGATION_EVENT));
}

export function syncWalletNavigationCommitted(pathname = "") {
  if (!pendingPath || !pathname) return;
  if (routePathKey(pathname) !== pendingPath) return;
  pendingPath = null;
  pendingStartedWhileMounted = false;
  window.dispatchEvent(new Event(WALLET_NAVIGATION_EVENT));
}

/** Test isolation. Does not run during a real visit. */
export function __resetWalletNavigationForTests() {
  pendingPath = null;
  pendingStartedWhileMounted = false;
  walletNavigationMounts = 0;
}

export function isWalletNavigationPending(
  pathname = "",
  pending = pendingPath,
) {
  if (!pending) return false;
  return routePathKey(pathname) !== pending;
}
