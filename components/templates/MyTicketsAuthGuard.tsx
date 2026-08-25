"use client";

import { useEffect, type ReactNode } from "react";
import PageLoader from "@/components/molecules/PageLoader";
import { setLastKnown, useAuth } from "@/lib/auth";

/** Production wallet: send logged-out shoppers to login with a return path. */
export default function MyTicketsAuthGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { ready, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!ready || isAuthenticated) return;
    if (typeof window === "undefined") return;
    const returnTo = window.location.pathname + window.location.search;
    setLastKnown(returnTo);
    window.location.href = `/login/?from=${encodeURIComponent(returnTo)}`;
  }, [ready, isAuthenticated]);

  if (!ready || !isAuthenticated) {
    return <PageLoader label={ready ? "Redirecting" : "Loading"} />;
  }

  return children;
}
