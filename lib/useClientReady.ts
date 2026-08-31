import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * False during SSR/hydration, true on the client. Use this to read
 * session-only caches (org branding) without a setState-in-effect.
 */
export function useClientReady() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
