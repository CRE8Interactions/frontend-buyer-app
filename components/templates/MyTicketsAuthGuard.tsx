"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import RouteLoader from "@/components/molecules/RouteLoader";
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

  // The Blocktickets splash covers resolving auth and the hop to login, so the
  // wallet chrome only ever appears once there is real data behind it.
  if (!ready || !isAuthenticated) {
    return <RouteLoader />;
  }

  return children;
}
