"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { routePathKey } from "@/lib/routeTransition";
import {
  clearWalletNavigation,
  getWalletNavigationPending,
  noteWalletNavigationMounted,
  noteWalletNavigationUnmounted,
  pendingWalletNavigationSurvivesRemount,
  syncWalletNavigationCommitted,
  WALLET_NAVIGATION_EVENT,
} from "@/lib/walletTransition";

export function useWalletNavigationPending() {
  const pathname = usePathname() || "";
  // A stored destination belongs to a click inside this visit. Opening the
  // wallet from checkout must follow the URL, which is My tickets.
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const previousPath = useRef<string | null>(null);

  useLayoutEffect(() => {
    noteWalletNavigationMounted();
    return () => noteWalletNavigationUnmounted();
  }, []);

  useLayoutEffect(() => {
    const pending = getWalletNavigationPending();
    const pathChanged =
      previousPath.current !== null &&
      routePathKey(previousPath.current) !== routePathKey(pathname);
    previousPath.current = pathname;

    if (pending && routePathKey(pathname) === routePathKey(pending)) {
      syncWalletNavigationCommitted(pathname);
    } else if (
      pending &&
      routePathKey(window.location.pathname) === routePathKey(pending)
    ) {
      // The address bar already shows the destination. usePathname can lag.
    } else if (pending && !pathChanged && pendingWalletNavigationSurvivesRemount()) {
      // Back from activity remounts the wallet before the profile URL commits.
    } else if (pending) {
      clearWalletNavigation();
    }
    setPendingPath(getWalletNavigationPending());
  }, [pathname]);

  useEffect(() => {
    const sync = () => setPendingPath(getWalletNavigationPending());
    window.addEventListener(WALLET_NAVIGATION_EVENT, sync);
    return () => window.removeEventListener(WALLET_NAVIGATION_EVENT, sync);
  }, []);

  return pendingPath;
}
