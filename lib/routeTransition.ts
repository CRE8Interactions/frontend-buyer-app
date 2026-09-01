export const ROUTE_TRANSITION_EVENT = "blocktickets:route-transition";

/** Next.js has committed a new App Router pathname. */
export const ROUTE_COMMITTED_EVENT = "blocktickets:route-committed";

/** SeasonTickets has finished its initial wallet fetch (including empty). */
export const WALLET_SHELL_READY_EVENT = "blocktickets:wallet-shell-ready";

let walletShellReady = false;

export function markWalletShellPending() {
  walletShellReady = false;
}

export function isWalletShellReady() {
  return walletShellReady;
}

export function routePathKey(path: string) {
  const raw = String(path || "").split("?")[0].split("#")[0];
  return raw.replace(/\/+$/, "") || "/";
}

/** Show the global route loader for a programmatic navigation (`router.push`). */
export function beginRouteTransition(
  href: string,
  options?: { replace?: boolean },
) {
  if (typeof window === "undefined" || !href) return;
  window.dispatchEvent(
    new CustomEvent(ROUTE_TRANSITION_EVENT, {
      detail: { href, replace: options?.replace },
    }),
  );
}

/** Next.js `usePathname` changed — the destination route has committed. */
export function notifyRouteCommitted(path: string) {
  if (typeof window === "undefined" || !path) return;
  window.dispatchEvent(
    new CustomEvent(ROUTE_COMMITTED_EVENT, { detail: { path } }),
  );
}

export function notifyWalletShellReady() {
  walletShellReady = true;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WALLET_SHELL_READY_EVENT));
}
