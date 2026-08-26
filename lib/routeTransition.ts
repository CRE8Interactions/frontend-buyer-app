import { isWalletSectionPath } from "@/lib/walletNav";

export const ROUTE_TRANSITION_EVENT = "blocktickets:route-transition";

function pathOnly(pathname = "") {
  return (pathname.split("?")[0] || "").replace(/\/+$/, "") || "/";
}

/** Wallet list and its event / flex-pack detail routes. */
export function isMyTicketsPath(pathname = "") {
  const path = pathOnly(pathname);
  return path === "/wallet/my-tickets" || path.startsWith("/wallet/my-tickets/");
}

/**
 * Every wallet section — tickets and their detail routes, transfers, giving,
 * profile — shares one shell, so moving between them never remounts the
 * ticket list. The route overlay still runs so in-wallet hops can show the
 * Blocktickets spinner.
 */
export function isWalletShellNavigation(fromPathname = "", toPathname = "") {
  return isWalletSectionPath(fromPathname) && isWalletSectionPath(toPathname);
}

/** Show the global route loader for a programmatic navigation (`router.push`). */
export function beginRouteTransition(href: string) {
  if (typeof window === "undefined" || !href) return;
  window.dispatchEvent(
    new CustomEvent(ROUTE_TRANSITION_EVENT, { detail: { href } }),
  );
}
