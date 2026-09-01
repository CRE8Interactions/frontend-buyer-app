"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import WalletTicketsLoader from "@/components/organisms/WalletTicketsLoader";
import { setLastKnown, useAuth } from "@/lib/auth";

/** Production wallet: send logged-out shoppers to login with a return path. */
export default function MyTicketsAuthGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { ready, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready || isAuthenticated) return;
    if (typeof window === "undefined") return;
    const returnTo = window.location.pathname + window.location.search;
    setLastKnown(returnTo);
    // Soft navigation: the browser keeps this document, so the tab does not
    // spin and the destination's loader paints instead of a reload.
    router.replace(`/login/?from=${encodeURIComponent(returnTo)}`);
  }, [ready, isAuthenticated, router]);

  // In-page wallet spinner covers resolving auth and the hop to login, so the
  // Blocktickets watermark never paints over tickets / transfers / listings.
  if (!ready || !isAuthenticated) {
    return <WalletTicketsLoader fullPage />;
  }

  return children;
}
