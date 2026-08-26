export const ROUTE_TRANSITION_EVENT = "blocktickets:route-transition";

function pathOnly(pathname = "") {
  return (pathname.split("?")[0] || "").replace(/\/+$/, "") || "/";
}

/** Wallet list and its event / flex-pack detail routes. */
export function isMyTicketsPath(pathname = "") {
  const path = pathOnly(pathname);
  return path === "/my-tickets" || path.startsWith("/my-tickets/");
}

/**
 * Moving between /my-tickets, /my-tickets/event/:id, and
 * /my-tickets/flex-pack/:id stays in the same wallet shell — no remount of
 * the ticket list. The route overlay still runs so in-wallet hops can show
 * the Blocktickets spinner.
 */
export function isWalletShellNavigation(fromPathname = "", toPathname = "") {
  return isMyTicketsPath(fromPathname) && isMyTicketsPath(toPathname);
}

/** Show the global route loader for a programmatic navigation (`router.push`). */
export function beginRouteTransition(href: string) {
  if (typeof window === "undefined" || !href) return;
  window.dispatchEvent(
    new CustomEvent(ROUTE_TRANSITION_EVENT, { detail: { href } }),
  );
}
