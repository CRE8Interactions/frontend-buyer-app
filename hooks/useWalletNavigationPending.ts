"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { routePathKey } from "@/lib/routeTransition";
import {
  clearWalletNavigation,
  getWalletNavigationPending,
  syncWalletNavigationCommitted,
  WALLET_NAVIGATION_EVENT,
} from "@/lib/walletTransition";

export function useWalletNavigationPending() {
  const pathname = usePathname() || "";
  // A stored destination belongs to a click inside this visit. Opening the
  // wallet from checkout must follow the URL, which is My tickets.
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useLayoutEffect(() => {
    const pending = getWalletNavigationPending();
    if (!pending) return;
    if (routePathKey(pathname) === routePathKey(pending)) {
      syncWalletNavigationCommitted(pathname);
    } else {
      clearWalletNavigation();
    }
  }, [pathname]);

  useEffect(() => {
    const sync = () => setPendingPath(getWalletNavigationPending());
    window.addEventListener(WALLET_NAVIGATION_EVENT, sync);
    return () => window.removeEventListener(WALLET_NAVIGATION_EVENT, sync);
  }, []);

  return pendingPath;
}
