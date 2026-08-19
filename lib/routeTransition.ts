export const ROUTE_TRANSITION_EVENT = "blocktickets:route-transition";

/** Show the global route loader for a programmatic navigation (`router.push`). */
export function beginRouteTransition(href: string) {
  if (typeof window === "undefined" || !href) return;
  window.dispatchEvent(
    new CustomEvent(ROUTE_TRANSITION_EVENT, { detail: { href } }),
  );
}
