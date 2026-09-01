export const ROUTE_TRANSITION_EVENT = "blocktickets:route-transition";

/** SeasonTickets has finished its initial wallet fetch (including empty). */
export const WALLET_SHELL_READY_EVENT = "blocktickets:wallet-shell-ready";

let walletShellReady = false;

export function markWalletShellPending() {
  walletShellReady = false;
}

export function isWalletShellReady() {
  return walletShellReady;
}

/** Show the global route loader for a programmatic navigation (`router.push`). */
export function beginRouteTransition(href: string) {
  if (typeof window === "undefined" || !href) return;
  window.dispatchEvent(
    new CustomEvent(ROUTE_TRANSITION_EVENT, { detail: { href } }),
  );
}

export function notifyWalletShellReady() {
  walletShellReady = true;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WALLET_SHELL_READY_EVENT));
}
