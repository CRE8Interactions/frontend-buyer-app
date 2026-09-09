import { isWalletAccountPath } from "@/lib/orgBrandingCache";
import { routePathKey } from "@/lib/routeTransition";

export const WALLET_NAVIGATION_EVENT = "blocktickets:wallet-navigation";

let pendingPath: string | null = null;

export function getWalletNavigationPending() {
  return pendingPath;
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

  pendingPath = next;
  window.dispatchEvent(
    new CustomEvent(WALLET_NAVIGATION_EVENT, { detail: { path: next } }),
  );
}

export function clearWalletNavigation() {
  if (!pendingPath) return;
  pendingPath = null;
  window.dispatchEvent(new Event(WALLET_NAVIGATION_EVENT));
}

export function syncWalletNavigationCommitted(pathname = "") {
  if (!pendingPath || !pathname) return;
  if (routePathKey(pathname) !== pendingPath) return;
  pendingPath = null;
  window.dispatchEvent(new Event(WALLET_NAVIGATION_EVENT));
}

export function isWalletNavigationPending(
  pathname = "",
  pending = pendingPath,
) {
  if (!pending) return false;
  return routePathKey(pathname) !== pending;
}
