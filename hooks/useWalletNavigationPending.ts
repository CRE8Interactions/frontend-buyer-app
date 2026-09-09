"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  getWalletNavigationPending,
  syncWalletNavigationCommitted,
  WALLET_NAVIGATION_EVENT,
} from "@/lib/walletTransition";

export function useWalletNavigationPending() {
  const pathname = usePathname() || "";
  const [pendingPath, setPendingPath] = useState<string | null>(() =>
    getWalletNavigationPending(),
  );

  useEffect(() => {
    const sync = () => setPendingPath(getWalletNavigationPending());
    window.addEventListener(WALLET_NAVIGATION_EVENT, sync);
    return () => window.removeEventListener(WALLET_NAVIGATION_EVENT, sync);
  }, []);

  useEffect(() => {
    syncWalletNavigationCommitted(pathname);
    setPendingPath(getWalletNavigationPending());
  }, [pathname]);

  return pendingPath;
}
